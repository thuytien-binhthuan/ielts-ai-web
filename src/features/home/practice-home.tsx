"use client";

import axios from "axios";
import React from "react";
import { APIPaths } from "~apis/paths";
import { Speaking_SeeAllPartsScreenPractice } from "~apis/requests/app-content/practice/speaking/see-all-parts";
import { Speaking_Get_Tags_Screen_Practice } from "~apis/requests/app-content/practice/speaking/get-tags";
import { Speaking_GetMain_Screen_Practice } from "~apis/requests/app-content/practice/speaking/main-content";
import { GoogleLogin } from "~apis/requests/auth/google-login";
import { GetAdvice } from "~apis/requests/speaking/full-test/get-advice";
import type { ContentResponseBody } from "~apis/requests/speaking/full-test/get-advice/type";
import { GetAnswerIdeas } from "~apis/requests/speaking/full-test/get-answer-ideas";
import { NextQuestion } from "~apis/requests/speaking/full-test/next-question";
import type { Action, NextQuestionResponse, QuestionPart1, QuestionPart2, QuestionPart3 } from "~apis/requests/speaking/full-test/types";
import { GetQuestionList } from "~apis/requests/speaking/get-question-list";
import { Speaking_GetSetById } from "~apis/requests/speaking/get-set-by-id";
import { WEB_CLIENT_ID } from "~configs/constants";
import type { GroupItem, SectionGroup } from "~types/apis/app-content";
import { reducePart2Phase, type Part2Event, type Part2Phase } from "./part2-flow";

const ACCESS_TOKEN_KEY = "ACCESS_TOKEN";
const REFRESH_TOKEN_KEY = "REFRESH_TOKEN";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "web";
const FEEDBACK_MAX_RETRY = 5;
const FEEDBACK_RETRY_DELAY_MS = 3000;
const DEFAULT_RECORD_LIMIT_SECONDS = 45;
const AUTO_SKIP_INTRODUCTION_VIDEO = true;
const PART2_PREPARATION_SECONDS = Math.max(1, Number(process.env.NEXT_PUBLIC_PART2_PREP_SECONDS ?? "60"));

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonOptions = {
  theme?: string;
  size?: string;
  text?: string;
  shape?: string;
  width?: string;
  logo_alignment?: string;
};

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
      disableAutoSelect: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

type PracticeStage =
  | "idle"
  | "initializing"
  | "loading-next"
  | "show-introduction"
  | "playing-video"
  | "preparation"
  | "waiting-answer"
  | "recording"
  | "submitting-answer"
  | "answer-ready"
  | "ended"
  | "error";

type ConversationRow = {
  speaker: "Teacher" | "You";
  text: string;
};

type SetQuestionOutline = {
  part: number;
  questions: string[];
};

type AnswerIdeasPayload = {
  idea: string;
  sample_answer: string;
  vocabulary: string[];
};

type InitSessionResponse = {
  session_id?: string;
  statusCode?: number;
  detail?: string;
  img_url?: string;
};

type AnswerSessionResponse = {
  transcript?: string;
  stop?: boolean;
  better_answer?: string;
};

type ActionExecutionState = "continue" | "replaced" | "ended";
type ActionExecutionResult = {
  state: ActionExecutionState;
  unlockedPart2Recording: boolean;
};
type ActionProcessingOptions = {
  allowGetNextTestData?: boolean;
  actionHostResponse?: NextQuestionResponse;
};

function isQuestionResponse(response: NextQuestionResponse | null): response is QuestionPart1 | QuestionPart2 | QuestionPart3 {
  if (!response) {
    return false;
  }
  return response.type === "QuestionPart1" || response.type === "QuestionPart2" || response.type === "QuestionPart3";
}

function getRecordingLimitSeconds(part: number | undefined): number {
  if (part === 1) {
    return 30;
  }
  if (part === 2) {
    return 120;
  }
  if (part === 3) {
    return 60;
  }
  return DEFAULT_RECORD_LIMIT_SECONDS;
}

function getVideoUrl(response: NextQuestionResponse | null): string {
  if (!response) {
    return "";
  }
  if ("data" in response && response.data && typeof response.data.video_url === "string") {
    return response.data.video_url;
  }
  return "";
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object") {
      const detailValue = (detail as { detail?: unknown }).detail;
      if (typeof detailValue === "string") {
        return detailValue;
      }
      const messageValue = (detail as { message?: unknown }).message;
      if (typeof messageValue === "string") {
        return messageValue;
      }
    }
    return error.message || "Unexpected network error.";
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
    if ("data" in error) {
      const data = (error as { data?: unknown }).data;
      if (data && typeof data === "object") {
        const detail = (data as { detail?: unknown }).detail;
        if (typeof detail === "string") {
          return detail;
        }
      }
    }
  }

  return "Unexpected error. Please retry.";
}

function shouldRetryRequest(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("socket hang up") ||
    message.includes("econnreset") ||
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("proxy request failed")
  );
}

function normalizeFeedbackText(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }
  if (input && typeof input === "object" && "text" in input) {
    const text = (input as { text?: unknown }).text;
    if (typeof text === "string") {
      return text;
    }
  }
  return "";
}

function isTestingRoomSection(section: { type: string; sectionTitle: string }): boolean {
  const text = `${section.type} ${section.sectionTitle}`.toLowerCase();
  return text.includes("testing room");
}

function trimGroupItems(group: SectionGroup): SectionGroup {
  const filteredItems = group.items.filter((item) => item.type !== "Speaking_Full_Test");
  return {
    ...group,
    items: filteredItems,
  };
}

function getAccessTokenFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function buildDeviceData() {
  if (typeof navigator === "undefined") {
    return {
      device_model: null,
      manufacturer: null,
      os_version: null,
      ram: null,
      available_storage: null,
      network_type: null,
      app_version: APP_VERSION,
    };
  }

  return {
    device_model: navigator.platform || null,
    manufacturer: null,
    os_version: navigator.userAgent || null,
    ram: null,
    available_storage: null,
    network_type: navigator.onLine ? "online" : "offline",
    app_version: APP_VERSION,
  };
}

export function PracticeHome() {
  const [isGoogleReady, setIsGoogleReady] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const googleLogin = GoogleLogin();
  const tagsQuery = Speaking_Get_Tags_Screen_Practice(isAuthenticated);
  const mainContent = Speaking_GetMain_Screen_Practice();
  const seeAllParts = Speaking_SeeAllPartsScreenPractice();
  const questionListApi = GetQuestionList();
  const setByIdApi = Speaking_GetSetById();
  const nextQuestionApi = NextQuestion();
  const answerIdeasApi = GetAnswerIdeas();
  const adviceApi = GetAdvice();

  const googleButtonRef = React.useRef<HTMLDivElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const currentResponseRef = React.useRef<NextQuestionResponse | null>(null);
  const latestQuestionResponseRef = React.useRef<QuestionPart1 | QuestionPart2 | QuestionPart3 | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordingIntervalRef = React.useRef<number | null>(null);
  const preparationIntervalRef = React.useRef<number | null>(null);
  const feedbackRetryTimerRef = React.useRef<number | null>(null);
  const videoDiagnosticIntervalRef = React.useRef<number | null>(null);
  const videoStepResolvedRef = React.useRef(false);
  const currentQuestionKeyRef = React.useRef("");
  const introSkipCountRef = React.useRef(0);
  const part2PhaseRef = React.useRef<Part2Phase>("idle");
  const practiceStageRef = React.useRef<PracticeStage>("idle");

  const [selectedTag, setSelectedTag] = React.useState("");

  const [seeAllModal, setSeeAllModal] = React.useState({
    isOpen: false,
    title: "",
    part: 1,
    page: 1,
    totalPages: 1,
    items: [] as GroupItem[],
    loading: false,
    error: null as string | null,
  });

  const [activeSet, setActiveSet] = React.useState<GroupItem | null>(null);
  const [isPracticeModalOpen, setPracticeModalOpen] = React.useState(false);
  const [setOutline, setSetOutline] = React.useState<SetQuestionOutline[]>([]);
  const [setOutlineError, setSetOutlineError] = React.useState<string | null>(null);

  const [practiceStage, setPracticeStage] = React.useState<PracticeStage>("idle");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = React.useState<NextQuestionResponse | null>(null);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const [conversationRows, setConversationRows] = React.useState<ConversationRow[]>([]);
  const [showCueCard, setShowCueCard] = React.useState(false);
  const [sessionPosterUrl, setSessionPosterUrl] = React.useState<string | null>(null);
  const [isAudioOnlyPlayback, setIsAudioOnlyPlayback] = React.useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = React.useState<string | null>(null);
  const [transcript, setTranscript] = React.useState("");
  const [remainingRetryAnswers, setRemainingRetryAnswers] = React.useState(2);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [recordingLimitSeconds, setRecordingLimitSeconds] = React.useState(DEFAULT_RECORD_LIMIT_SECONDS);
  const [preparationSecondsLeft, setPreparationSecondsLeft] = React.useState<number | null>(null);
  const [isPart2RecordingUnlocked, setIsPart2RecordingUnlocked] = React.useState(false);

  const [answerIdeasData, setAnswerIdeasData] = React.useState<AnswerIdeasPayload | null>(null);
  const [feedbackData, setFeedbackData] = React.useState<ContentResponseBody | null>(null);
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = React.useState(false);
  const isPart2RecordingUnlockedRef = React.useRef(false);

  function applyPart2Event(event: Part2Event): Part2Phase {
    const nextPhase = reducePart2Phase(part2PhaseRef.current, event);
    part2PhaseRef.current = nextPhase;
    return nextPhase;
  }

  const isBusy = practiceStage === "initializing" || practiceStage === "loading-next" || practiceStage === "submitting-answer";

  React.useEffect(() => {
    practiceStageRef.current = practiceStage;
  }, [practiceStage]);

  React.useEffect(() => {
    isPart2RecordingUnlockedRef.current = isPart2RecordingUnlocked;
  }, [isPart2RecordingUnlocked]);

  const filteredSections = React.useMemo(() => {
    const sections = mainContent.data ?? [];
    return sections
      .filter((section) => !isTestingRoomSection(section))
      .map((section) => {
        return {
          ...section,
          groups: (section.groups ?? [])
            .map((group) => trimGroupItems(group))
            .filter((group) => group.items.length > 0),
        };
      })
      .filter((section) => (section.groups?.length ?? 0) > 0);
  }, [mainContent.data]);

  const hasEmptyHome = filteredSections.length === 0;

  React.useEffect(() => {
    if (selectedTag || !tagsQuery.data?.length) {
      return;
    }
    setSelectedTag(tagsQuery.data[0]);
  }, [tagsQuery.data, selectedTag]);

  React.useEffect(() => {
    if (!isAuthenticated || !selectedTag) {
      return;
    }
    mainContent.mutate({
      tags: selectedTag,
      app_version: APP_VERSION,
    });
    // Mutation function identity can change between renders; this effect should only react to auth/tag changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, selectedTag]);

  const handleGoogleCredential = React.useCallback(
    async (response: GoogleCredentialResponse) => {
      const idToken = response.credential;
      if (!idToken) {
        setAuthError("Google token was not returned. Please retry.");
        return;
      }

      try {
        setAuthError(null);
        const authResponse = await googleLogin.mutateAsync({
          user_device_data: buildDeviceData(),
          body: {
            id_token: idToken,
          },
        });

        if (typeof window !== "undefined") {
          window.localStorage.setItem(ACCESS_TOKEN_KEY, authResponse.access_token);
          window.localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refresh_token);
        }

        setIsAuthenticated(true);
      } catch (error) {
        setAuthError(getErrorMessage(error));
      }
    },
    [googleLogin],
  );

  React.useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const initializeGoogleIdentity = () => {
      const googleIdentity = window.google;
      if (!googleIdentity?.accounts?.id) {
        setAuthError("Google Identity script failed to initialize.");
        return;
      }

      if (!WEB_CLIENT_ID) {
        setAuthError("Missing Google web client id.");
        return;
      }

      googleIdentity.accounts.id.initialize({
        client_id: WEB_CLIENT_ID,
        callback: handleGoogleCredential,
        cancel_on_tap_outside: true,
      });

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
        googleIdentity.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          width: "320",
        });
      }

      setIsGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogleIdentity();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleIdentity;
    script.onerror = () => {
      setAuthError("Unable to load Google login script.");
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [handleGoogleCredential, isAuthenticated]);

  React.useEffect(() => {
    if (!isPracticeModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPracticeModalOpen]);

  React.useEffect(() => {
    if (practiceStage !== "playing-video") {
      clearVideoDiagnostics();
      return;
    }

    const player = videoRef.current;
    if (!player) {
      return;
    }

    const promise = player.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        // Browser autoplay policy can block playback until user interacts.
      });
    }
    startVideoDiagnostics();
  }, [practiceStage, currentResponse]);

  React.useEffect(() => {
    if (practiceStage !== "playing-video") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const player = videoRef.current;
      if (!player) {
        return;
      }

      if (player.error) {
        void handleVideoEnded(true);
        return;
      }

      const hasFiniteDuration = Number.isFinite(player.duration) && player.duration > 0;
      if (player.ended || (hasFiniteDuration && player.currentTime >= player.duration - 0.05)) {
        void handleVideoEnded();
      }
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [practiceStage, currentResponse]);

  React.useEffect(() => {
    return () => {
      cleanupRecorderResources();
      clearPreparationInterval();
      clearFeedbackRetryTimer();
      clearVideoDiagnostics();
      setRecordedAudioUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearRecordingInterval() {
    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }

  function clearPreparationInterval() {
    if (preparationIntervalRef.current !== null) {
      window.clearInterval(preparationIntervalRef.current);
      preparationIntervalRef.current = null;
    }
  }

  function clearFeedbackRetryTimer() {
    if (feedbackRetryTimerRef.current !== null) {
      window.clearTimeout(feedbackRetryTimerRef.current);
      feedbackRetryTimerRef.current = null;
    }
  }

  function clearVideoDiagnostics() {
    if (videoDiagnosticIntervalRef.current !== null) {
      window.clearInterval(videoDiagnosticIntervalRef.current);
      videoDiagnosticIntervalRef.current = null;
    }
  }

  function getDecodedVideoFrameCount(videoElement: HTMLVideoElement): number {
    if (typeof videoElement.getVideoPlaybackQuality === "function") {
      const quality = videoElement.getVideoPlaybackQuality();
      if (quality && typeof quality.totalVideoFrames === "number") {
        return quality.totalVideoFrames;
      }
    }
    const webkitFrames = (videoElement as HTMLVideoElement & { webkitDecodedFrameCount?: number }).webkitDecodedFrameCount;
    return typeof webkitFrames === "number" ? webkitFrames : 0;
  }

  function startVideoDiagnostics() {
    clearVideoDiagnostics();
    setIsAudioOnlyPlayback(false);

    let checks = 0;
    videoDiagnosticIntervalRef.current = window.setInterval(() => {
      checks += 1;
      const player = videoRef.current;
      if (!player) {
        clearVideoDiagnostics();
        return;
      }

      const hasDimensions = player.videoWidth > 0 && player.videoHeight > 0;
      const decodedFrames = getDecodedVideoFrameCount(player);

      if (decodedFrames > 0 && hasDimensions) {
        setIsAudioOnlyPlayback(false);
        clearVideoDiagnostics();
        return;
      }

      if (checks >= 4 && !player.paused && player.currentTime > 0.8 && (decodedFrames === 0 || !hasDimensions)) {
        setIsAudioOnlyPlayback(true);
        clearVideoDiagnostics();
        return;
      }

      if (checks > 24 || player.ended) {
        clearVideoDiagnostics();
      }
    }, 350);
  }

  function cleanupRecorderResources() {
    clearRecordingInterval();
    audioChunksRef.current = [];

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.ondataavailable = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Stop can throw when recorder is already inactive.
        }
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }

  function resetPracticeState(keepSetSelection = true) {
    cleanupRecorderResources();
    clearPreparationInterval();
    clearFeedbackRetryTimer();
    clearVideoDiagnostics();
    videoStepResolvedRef.current = false;
    currentQuestionKeyRef.current = "";
    introSkipCountRef.current = 0;
    currentResponseRef.current = null;
    latestQuestionResponseRef.current = null;
    part2PhaseRef.current = "idle";

    setPracticeStage("idle");
    setSessionId(null);
    setCurrentResponse(null);
    setSessionError(null);
    setConversationRows([]);
    setShowCueCard(false);
    setIsAudioOnlyPlayback(false);
    setTranscript("");
    setRemainingRetryAnswers(2);
    setRecordingSeconds(0);
    setRecordingLimitSeconds(DEFAULT_RECORD_LIMIT_SECONDS);
    setPreparationSecondsLeft(null);
    setIsPart2RecordingUnlocked(false);
    isPart2RecordingUnlockedRef.current = false;
    setAnswerIdeasData(null);
    setFeedbackData(null);
    setFeedbackError(null);
    setFeedbackLoading(false);
    setRecordedAudioUrl((oldUrl) => {
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
      return null;
    });

    if (!keepSetSelection) {
      setActiveSet(null);
      setSetOutline([]);
      setSetOutlineError(null);
      setSessionPosterUrl(null);
    }
  }

  function closePracticeModal() {
    setPracticeModalOpen(false);
    resetPracticeState(false);
  }

  async function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.google?.accounts?.id?.disableAutoSelect();
    }

    setIsAuthenticated(false);
    setAuthError(null);
    setSelectedTag("");
    setSeeAllModal((prev) => ({ ...prev, isOpen: false }));
    closePracticeModal();
  }

  async function refreshHome() {
    if (!selectedTag) {
      return;
    }
    mainContent.mutate({
      tags: selectedTag,
      app_version: APP_VERSION,
    });
  }

  async function loadSeeAll(part: number, page: number, append: boolean) {
    if (!selectedTag) {
      return;
    }

    setSeeAllModal((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await seeAllParts.mutateAsync({
        tags: selectedTag,
        part,
        page,
        pageSize: 12,
      });

      const safeItems = (response?.data ?? []).filter((item) => item.type !== "Speaking_Full_Test");

      setSeeAllModal((prev) => ({
        ...prev,
        loading: false,
        part,
        page: response.meta.page,
        totalPages: response.meta.totalPages,
        items: append ? [...prev.items, ...safeItems] : safeItems,
      }));
    } catch (error) {
      setSeeAllModal((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }

  async function handleOpenSeeAll(group: SectionGroup) {
    if (!group.part) {
      return;
    }

    setSeeAllModal({
      isOpen: true,
      title: group.groupTitle ?? `IELTS Speaking Part ${group.part}`,
      part: group.part,
      page: 1,
      totalPages: 1,
      items: [],
      loading: true,
      error: null,
    });

    await loadSeeAll(group.part, 1, false);
  }

  async function handleLoadMoreSeeAll() {
    if (seeAllModal.loading || seeAllModal.page >= seeAllModal.totalPages) {
      return;
    }
    await loadSeeAll(seeAllModal.part, seeAllModal.page + 1, true);
  }

  async function loadSetOutlineData(setId: string) {
    setSetOutline([]);
    setSetOutlineError(null);

    try {
      const response = await questionListApi.mutateAsync({ item_code: setId });
      setSetOutline(response);
      return;
    } catch {
      // Fallback request below.
    }

    try {
      const fallbackSet = await setByIdApi.mutateAsync({ setId });
      const mapped: SetQuestionOutline[] = [
        {
          part: fallbackSet.part,
          questions: (fallbackSet.questions ?? []).map((question) => question.text),
        },
      ];
      setSetOutline(mapped);
    } catch (error) {
      setSetOutlineError(getErrorMessage(error));
    }
  }

  async function handleOpenSet(item: GroupItem) {
    setActiveSet(item);
    setPracticeModalOpen(true);
    resetPracticeState(true);
    setSessionPosterUrl(item.imageUrl || null);
    await loadSetOutlineData(item.id);
  }

  async function requestNextQuestion(sessionToUse: string) {
    setPracticeStage("loading-next");
    setSessionError(null);
    setIsAudioOnlyPlayback(false);
    setFeedbackLoading(false);
    setFeedbackError(null);
    setFeedbackData(null);
    clearFeedbackRetryTimer();

    try {
      const response = await nextQuestionApi.mutateAsync({
        session_id: sessionToUse,
      });

      await processNextQuestionResponse(response, sessionToUse);
    } catch (error) {
      setSessionError(getErrorMessage(error));
      setPracticeStage("error");
    }
  }

  function startPart2PreparationTimer(sessionToUse: string) {
    clearPreparationInterval();
    applyPart2Event({ type: "START_PREPARATION" });
    setPreparationSecondsLeft(PART2_PREPARATION_SECONDS);
    setPracticeStage("preparation");
    let preparationDone = false;

    preparationIntervalRef.current = window.setInterval(() => {
      setPreparationSecondsLeft((previousSeconds) => {
        if (preparationDone) {
          return previousSeconds;
        }

        if (previousSeconds === null || previousSeconds <= 1) {
          preparationDone = true;
          clearPreparationInterval();
          setPreparationSecondsLeft(null);
          applyPart2Event({ type: "PREPARATION_FINISHED" });
          void requestNextQuestion(sessionToUse);
          return null;
        }
        return previousSeconds - 1;
      });
    }, 1000);
  }

  async function processActionList(actions: Action[], sessionToUse: string, options: ActionProcessingOptions = {}): Promise<ActionExecutionResult> {
    const allowGetNextTestData = options.allowGetNextTestData ?? true;
    const actionHostResponse = options.actionHostResponse;
    let unlockedPart2Recording = false;

    for (const action of actions) {
      switch (action.type) {
        case "GetNextTestData": {
          if (!allowGetNextTestData) {
            break;
          }
          await requestNextQuestion(sessionToUse);
          return {
            state: "replaced",
            unlockedPart2Recording,
          };
        }
        case "ShowUI-CueCard": {
          setShowCueCard(true);
          break;
        }
        case "HideUI-CueCard": {
          setShowCueCard(false);
          break;
        }
        case "StartTimerForPreparation": {
          startPart2PreparationTimer(sessionToUse);
          break;
        }
        case "StartTimerForSpeakingPart2": {
          applyPart2Event({ type: "UNLOCK_ANSWER_RECORDING" });
          unlockedPart2Recording = true;
          isPart2RecordingUnlockedRef.current = true;
          setIsPart2RecordingUnlocked(true);
          setPracticeStage("waiting-answer");
          await startRecording(actionHostResponse);
          break;
        }
        case "EndTest": {
          setPracticeStage("ended");
          return {
            state: "ended",
            unlockedPart2Recording,
          };
        }
        default: {
          break;
        }
      }
    }
    return {
      state: "continue",
      unlockedPart2Recording,
    };
  }

  async function loadAnswerIdeas(sessionToUse: string, questionResponse: QuestionPart1 | QuestionPart2 | QuestionPart3) {
    const questionKey = `${questionResponse.data.set_code}-${questionResponse.data.index_in_set}`;
    currentQuestionKeyRef.current = questionKey;
    setAnswerIdeasData(null);

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await answerIdeasApi.mutateAsync({
          session_id: sessionToUse,
          part: questionResponse.data.part,
          question: questionResponse.data.text,
        });

        if (currentQuestionKeyRef.current === questionKey) {
          setAnswerIdeasData(response);
        }
        return;
      } catch (error) {
        if (!shouldRetryRequest(error) || attempt === maxAttempts - 1) {
          break;
        }
        await new Promise((resolve) => {
          window.setTimeout(resolve, 700 * (attempt + 1));
        });
      }
    }

    if (currentQuestionKeyRef.current === questionKey) {
      setAnswerIdeasData(null);
    }
  }

  async function processNextQuestionResponse(response: NextQuestionResponse, sessionToUse: string) {
    videoStepResolvedRef.current = false;
    if (isQuestionResponse(response)) {
      latestQuestionResponseRef.current = response;
    }
    isPart2RecordingUnlockedRef.current = false;
    setIsPart2RecordingUnlocked(false);
    const beforeActions = await processActionList(response.actionsBefore ?? [], sessionToUse, {
      allowGetNextTestData: true,
      actionHostResponse: response,
    });
    if (beforeActions.state !== "continue") {
      return;
    }

    setCurrentResponse(response);
    currentResponseRef.current = response;
    setShowCueCard(false);
    setIsAudioOnlyPlayback(false);
    setTranscript("");
    setRemainingRetryAnswers(2);
    setRecordingSeconds(0);
    setRecordingLimitSeconds(DEFAULT_RECORD_LIMIT_SECONDS);
    setFeedbackLoading(false);
    setFeedbackError(null);
    setFeedbackData(null);
    clearFeedbackRetryTimer();

    if (response.type === "Introduction") {
      if (AUTO_SKIP_INTRODUCTION_VIDEO && introSkipCountRef.current === 0) {
        introSkipCountRef.current += 1;
        await requestNextQuestion(sessionToUse);
        return;
      }
      setPracticeStage("show-introduction");
      return;
    }

    if ("data" in response && typeof response.data.text === "string" && response.data.text.trim()) {
      setConversationRows((previousRows) => [
        ...previousRows,
        {
          speaker: "Teacher",
          text: response.data.text,
        },
      ]);
    }

    if (isQuestionResponse(response)) {
      if (response.type === "QuestionPart2") {
        applyPart2Event({ type: "QUESTION_PART2_RECEIVED" });
      } else {
        applyPart2Event({ type: "LEAVE_PART2" });
      }
      setRecordingLimitSeconds(getRecordingLimitSeconds(response.data.part));
      void loadAnswerIdeas(sessionToUse, response);
    } else {
      applyPart2Event({ type: "LEAVE_PART2" });
    }

    const videoUrl = getVideoUrl(response);
    if (!videoUrl) {
      if (response.type === "SwitchingContext" || isQuestionResponse(response)) {
        await resolveAfterPlayback(response, sessionToUse);
        return;
      }
    }

    setPracticeStage("playing-video");
  }

  async function resolveAfterPlayback(response: NextQuestionResponse, sessionToUse: string) {
    if (isQuestionResponse(response) && currentResponseRef.current !== response) {
      return;
    }

    const actionResult = await processActionList(response.actionsAfter ?? [], sessionToUse, {
      allowGetNextTestData: true,
      actionHostResponse: response,
    });
    if (actionResult.state !== "continue") {
      return;
    }

    if (isQuestionResponse(response)) {
      if (response.type === "QuestionPart2") {
        if (actionResult.unlockedPart2Recording || isPart2RecordingUnlockedRef.current) {
          // Keep mobile-like behavior: once backend unlocks Part 2 answer,
          // return to answer state after examiner media ends.
          setPracticeStage("waiting-answer");
          return;
        }
        // Part 2 is controlled by backend actions (same as mobile flow).
        return;
      }
      setPracticeStage("waiting-answer");
    }
  }

  async function startSession() {
    if (!activeSet?.id) {
      return;
    }

    resetPracticeState(true);
    setPracticeStage("initializing");
    setSessionError(null);

    try {
      const accessToken = getAccessTokenFromStorage();
      const response = await axios.post<InitSessionResponse>(
        `${APIPaths.Speaking_Conversation}/test_session_start`,
        { item_code: activeSet.id },
        {
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = response.data;
      const statusCode = data.statusCode ?? response.status;
      setSessionPosterUrl(data.img_url || activeSet.imageUrl || null);

      if (statusCode === 209) {
        setSessionError(data.detail ?? "Time limit reached for the current plan.");
        setPracticeStage("error");
        return;
      }

      if (!data.session_id) {
        setSessionError("Session id was not returned by backend.");
        setPracticeStage("error");
        return;
      }

      setSessionId(data.session_id);
      await requestNextQuestion(data.session_id);
    } catch (error) {
      setSessionError(getErrorMessage(error));
      setPracticeStage("error");
    }
  }

  async function handleVideoEnded(force = false) {
    void force;
    if (!sessionId || !currentResponseRef.current) {
      return;
    }

    if (videoStepResolvedRef.current) {
      return;
    }
    videoStepResolvedRef.current = true;

    await resolveAfterPlayback(currentResponseRef.current, sessionId);
  }

  async function startRecording(targetResponse?: NextQuestionResponse) {
    const candidates: Array<NextQuestionResponse | QuestionPart1 | QuestionPart2 | QuestionPart3 | null | undefined> = [
      targetResponse,
      currentResponseRef.current,
      currentResponse,
      latestQuestionResponseRef.current,
    ];
    const response = candidates.find((candidate): candidate is QuestionPart1 | QuestionPart2 | QuestionPart3 => isQuestionResponse(candidate ?? null));
    if (!response) {
      setSessionError("Recording is not ready yet. Please wait for the next speaking question.");
      return;
    }

    if (response.type === "QuestionPart2" && !isPart2RecordingUnlockedRef.current) {
      setSessionError("Recording is locked. Waiting for examiner speaking prompt.");
      return;
    }

    if (practiceStageRef.current === "recording" || practiceStageRef.current === "submitting-answer") {
      return;
    }

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      setSessionError("Recording is not available in this environment.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setSessionError("Microphone recording is unavailable. Use https:// or http://localhost and allow microphone permission.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMime = window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;

      const recorder = preferredMime ? new window.MediaRecorder(stream, { mimeType: preferredMime }) : new window.MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        void handleRecordingStopped(response);
      };

      recorder.start();
      setPracticeStage("recording");
      setRecordingSeconds(0);
      setRecordingLimitSeconds(getRecordingLimitSeconds(response.data.part));
      setSessionError(null);

      clearRecordingInterval();
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((previousSeconds) => {
          const nextValue = previousSeconds + 1;
          const maxSeconds = getRecordingLimitSeconds(response.data.part);
          if (nextValue >= maxSeconds) {
            stopRecording();
            return maxSeconds;
          }
          return nextValue;
        });
      }, 1000);
    } catch (error) {
      const errorName = error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name ?? "") : "";
      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setSessionError("Microphone permission was blocked. Allow microphone access and run on https:// or http://localhost.");
      } else if (errorName === "NotFoundError") {
        setSessionError("No microphone detected. Connect a microphone and retry.");
      } else {
        setSessionError(getErrorMessage(error));
      }
      setPracticeStage("waiting-answer");
    }
  }

  function stopRecording() {
    clearRecordingInterval();
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    if (recorder.state !== "inactive") {
      setPracticeStage("submitting-answer");
      recorder.stop();
    }
  }

  async function handleRecordingStopped(questionResponse: QuestionPart1 | QuestionPart2 | QuestionPart3) {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const blob = new Blob(audioChunksRef.current, {
      type: audioChunksRef.current[0]?.type || "audio/webm",
    });
    audioChunksRef.current = [];

    if (blob.size === 0) {
      setSessionError("Recording is empty. Please try again.");
      setPracticeStage("waiting-answer");
      return;
    }

    setRecordedAudioUrl((oldUrl) => {
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
      return URL.createObjectURL(blob);
    });

    await submitAnswer(blob, questionResponse);
  }

  async function submitAnswer(blob: Blob, response: QuestionPart1 | QuestionPart2 | QuestionPart3) {
    if (!sessionId) {
      setPracticeStage("waiting-answer");
      return;
    }

    setPracticeStage("submitting-answer");
    setFeedbackLoading(true);
    setFeedbackError(null);
    setFeedbackData(null);
    clearFeedbackRetryTimer();

    try {
      const accessToken = getAccessTokenFromStorage();
      const fileName = `answer-${Date.now()}.${blob.type.includes("webm") ? "webm" : "m4a"}`;
      const file = new File([blob], fileName, {
        type: blob.type || "audio/webm",
      });

      const payload = new FormData();
      payload.append("session_id", sessionId);
      payload.append("set_code", response.data.set_code);
      payload.append("index_in_set", String(response.data.index_in_set));
      payload.append("file", file);

      const answerResponse = await axios.post<AnswerSessionResponse>(`${APIPaths.Speaking_Conversation}/test_session_answer`, payload, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          Accept: "application/json",
        },
      });

      const answerTranscript = answerResponse.data.transcript?.trim() ?? "";
      setTranscript(answerTranscript);
      setConversationRows((previousRows) => [
        ...previousRows,
        {
          speaker: "You",
          text: answerTranscript || "[Audio submitted]",
        },
      ]);
      setPracticeStage("answer-ready");

      void loadFeedbackWithRetry(sessionId, response.data.set_code, response.data.index_in_set, 0);
    } catch (error) {
      setFeedbackLoading(false);
      setFeedbackError(getErrorMessage(error));
      setPracticeStage("answer-ready");
    }
  }

  async function loadFeedbackWithRetry(sessionToUse: string, setCode: string, indexInSet: number, attempt: number) {
    try {
      const response = await adviceApi.mutateAsync({
        session_id: sessionToUse,
        set_code: setCode,
        index_in_set: indexInSet,
      });

      if (response && response.original_answer !== undefined) {
        setFeedbackData(response);
        setFeedbackLoading(false);
        setFeedbackError(null);
        return;
      }
    } catch (error) {
      if (attempt >= FEEDBACK_MAX_RETRY) {
        setFeedbackError(getErrorMessage(error));
        setFeedbackLoading(false);
        return;
      }
    }

    if (attempt >= FEEDBACK_MAX_RETRY) {
      setFeedbackError("Feedback is still processing. Please try next question.");
      setFeedbackLoading(false);
      return;
    }

    feedbackRetryTimerRef.current = window.setTimeout(() => {
      void loadFeedbackWithRetry(sessionToUse, setCode, indexInSet, attempt + 1);
    }, FEEDBACK_RETRY_DELAY_MS);
  }

  async function onClickRecordAgain() {
    if (remainingRetryAnswers <= 0) {
      return;
    }

    clearFeedbackRetryTimer();
    setRemainingRetryAnswers((previousCount) => Math.max(0, previousCount - 1));
    setFeedbackData(null);
    setFeedbackError(null);
    setFeedbackLoading(false);
    setTranscript("");
    setRecordedAudioUrl((oldUrl) => {
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
      return null;
    });
    setConversationRows((previousRows) => {
      const nextRows = [...previousRows];
      for (let index = nextRows.length - 1; index >= 0; index -= 1) {
        if (nextRows[index].speaker === "You") {
          nextRows.splice(index, 1);
          break;
        }
      }
      return nextRows;
    });

    setPracticeStage("waiting-answer");
    await startRecording();
  }

  async function onClickNextQuestion() {
    if (!sessionId) {
      return;
    }
    await requestNextQuestion(sessionId);
  }

  const renderPracticeAction = () => {
    switch (practiceStage) {
      case "idle": {
        return (
          <button
            className="rounded-full bg-[#ef6c3a] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            type="button"
            onClick={() => {
              void startSession();
            }}
          >
            Start practice
          </button>
        );
      }
      case "initializing":
      case "loading-next":
      case "submitting-answer": {
        return <p className="text-sm font-medium text-[#1b2e3e]/70">Processing...</p>;
      }
      case "show-introduction": {
        return (
          <button
            className="rounded-full bg-[#ef6c3a] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            type="button"
            onClick={() => {
              if (sessionId) {
                void requestNextQuestion(sessionId);
              }
            }}
          >
            Start test
          </button>
        );
      }
      case "playing-video": {
        return (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-[#1b2e3e]/70">Teacher is speaking...</p>
            <button
              className="rounded-full border border-[#1b2e3e]/20 bg-white px-4 py-2 text-sm font-semibold text-[#1b2e3e] hover:border-[#1b2e3e]/45"
              type="button"
              onClick={() => {
                void handleVideoEnded(true);
              }}
            >
              Continue if stuck
            </button>
          </div>
        );
      }
      case "preparation": {
        return <p className="text-sm font-semibold text-[#1b2e3e]">Preparation time: {preparationSecondsLeft ?? 0}s</p>;
      }
      case "waiting-answer": {
        if (!isQuestionResponse(currentResponse)) {
          return <p className="text-sm text-[#1b2e3e]/70">Waiting for the examiner speaking prompt...</p>;
        }

        const isPart2Answer = currentResponse.type === "QuestionPart2";
        if (isPart2Answer && !isPart2RecordingUnlocked) {
          return <p className="text-sm text-[#1b2e3e]/70">Waiting for examiner prompt...</p>;
        }

        return (
          <button
            className="rounded-full bg-[#ef6c3a] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            type="button"
            onClick={() => {
              void startRecording();
            }}
          >
            {isPart2Answer ? "Answer (recording)" : "Start recording"}
          </button>
        );
      }
      case "recording": {
        return (
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-[#d23737] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              type="button"
              onClick={stopRecording}
            >
              Stop recording
            </button>
            <p className="text-sm font-semibold text-[#1b2e3e]">
              {recordingSeconds}s / {recordingLimitSeconds}s
            </p>
          </div>
        );
      }
      case "answer-ready": {
        return (
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full border border-[#1b2e3e]/25 bg-white px-4 py-2 text-sm font-semibold text-[#1b2e3e] disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={remainingRetryAnswers <= 0 || isBusy}
              onClick={() => {
                void onClickRecordAgain();
              }}
            >
              Record again ({remainingRetryAnswers})
            </button>
            <button
              className="rounded-full bg-[#1b2e3e] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              type="button"
              disabled={isBusy}
              onClick={() => {
                void onClickNextQuestion();
              }}
            >
              Next question
            </button>
          </div>
        );
      }
      case "ended": {
        return <p className="text-sm font-semibold text-[#1b2e3e]">Practice session completed.</p>;
      }
      case "error": {
        return (
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full border border-[#1b2e3e]/25 bg-white px-4 py-2 text-sm font-semibold text-[#1b2e3e]"
              type="button"
              onClick={() => {
                void startSession();
              }}
            >
              Restart session
            </button>
          </div>
        );
      }
      default: {
        return null;
      }
    }
  };

  const renderSetOutline = () => {
    if (setOutlineError) {
      return <p className="mt-2 text-xs text-red-600">{setOutlineError}</p>;
    }

    if (!setOutline.length) {
      return <p className="mt-2 text-xs text-[#1b2e3e]/60">Question list will appear after session starts.</p>;
    }

    return (
      <div className="mt-3 space-y-3">
        {setOutline.map((partItem) => (
          <div key={`outline-part-${partItem.part}`} className="rounded-xl border border-[#1b2e3e]/10 bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ef6c3a]">Part {partItem.part}</p>
            <ul className="mt-2 space-y-1 text-xs text-[#1b2e3e]/80">
              {partItem.questions.slice(0, 4).map((question, index) => (
                <li key={`outline-question-${partItem.part}-${index}`}>{question}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const currentQuestionTitle = isQuestionResponse(currentResponse) ? currentResponse.data.text : "";
  const currentPart = isQuestionResponse(currentResponse) ? currentResponse.data.part : undefined;
  const currentVideoUrl = getVideoUrl(currentResponse);

  const shouldShowLogin = !isAuthenticated;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[#1b2e3e]/10 bg-white/80 p-6 shadow-[0_16px_40px_-28px_rgba(27,46,62,0.35)] backdrop-blur-sm sm:p-8">
        <p className="text-sm font-bold tracking-[0.3em] text-[#ef6c3a]">IELTS WEB LANE</p>
        <h1 className="mt-4 text-4xl text-[#1b2e3e] sm:text-6xl">Practice speaking sets on web</h1>
        <p className="mt-4 max-w-3xl text-base text-[#1b2e3e]/75 sm:text-lg">
          Home now mirrors the mobile practice flow: no testing room, part sets only, and each set can run teacher video plus question-by-question recording with
          suggestion and AI feedback.
        </p>
      </section>

      {shouldShowLogin ? (
        <section className="mt-6 rounded-3xl border border-[#1b2e3e]/10 bg-white/85 p-6 shadow-[0_12px_36px_-28px_rgba(27,46,62,0.35)] sm:p-8">
          <h2 className="text-3xl text-[#1b2e3e]">Login required</h2>
          <p className="mt-2 text-sm text-[#1b2e3e]/70">Google login is the only sign-in method on web.</p>
          <div className="mt-5 min-h-11">
            <div ref={googleButtonRef} />
            {!isGoogleReady ? <p className="text-sm text-[#1b2e3e]/60">Loading Google sign-in...</p> : null}
          </div>
          {authError ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p> : null}
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-[#1b2e3e]/10 bg-white/85 p-6 shadow-[0_12px_36px_-28px_rgba(27,46,62,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-3xl text-[#1b2e3e]">Practice IELTS speaking sets</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-[#1b2e3e]/25 bg-white px-4 py-2 text-sm font-semibold text-[#1b2e3e] hover:border-[#1b2e3e]/45"
                  type="button"
                  onClick={() => {
                    void refreshHome();
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(tagsQuery.data ?? []).map((tag) => (
                <button
                  key={tag}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    selectedTag === tag ? "bg-[#ef6c3a] text-white" : "border border-[#1b2e3e]/20 bg-white text-[#1b2e3e]/75 hover:border-[#1b2e3e]/45"
                  }`}
                  type="button"
                  onClick={() => {
                    setSelectedTag(tag);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {mainContent.isPending ? <p className="mt-5 text-sm text-[#1b2e3e]/70">Loading practice sets...</p> : null}
          {mainContent.error ? <p className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(mainContent.error)}</p> : null}
          {hasEmptyHome && !mainContent.isPending && !mainContent.error ? (
            <p className="mt-5 rounded-xl border border-[#1b2e3e]/10 bg-white/70 px-4 py-3 text-sm text-[#1b2e3e]/70">No available practice sets for this tag.</p>
          ) : null}

          {filteredSections.map((section, sectionIndex) => (
            <section
              key={`section-${sectionIndex}`}
              className="mt-6 rounded-3xl border border-[#1b2e3e]/10 bg-white/85 p-6 shadow-[0_12px_36px_-28px_rgba(27,46,62,0.35)] sm:p-8"
            >
              <h3 className="text-2xl text-[#1b2e3e]">{section.sectionTitle}</h3>
              <div className="mt-5 space-y-6">
                {(section.groups ?? []).map((group, groupIndex) => (
                  <div key={`group-${sectionIndex}-${groupIndex}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-base font-semibold text-[#1b2e3e]">{group.groupTitle ?? `Part ${group.part ?? "-"}`}</p>
                      {group.seeAll && group.part ? (
                        <button
                          className="rounded-full border border-[#1b2e3e]/20 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#1b2e3e] hover:border-[#1b2e3e]/45"
                          type="button"
                          onClick={() => {
                            void handleOpenSeeAll(group);
                          }}
                        >
                          See all
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1">
                      {group.items.map((item) => (
                        <button
                          key={`item-${item.id}`}
                          className="group w-56 shrink-0 snap-start overflow-hidden rounded-2xl border border-[#1b2e3e]/10 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-18px_rgba(27,46,62,0.55)]"
                          type="button"
                          onClick={() => {
                            void handleOpenSet(item);
                          }}
                        >
                          <div className="relative h-32 w-full bg-[#1b2e3e]/5">
                            {item.imageUrl ? <img className="h-full w-full object-cover" src={item.imageUrl} alt={item.subTitle ?? item.mainTitle} /> : null}
                            {item.tested ? (
                              <span className="absolute right-2 top-2 rounded-full bg-[#ef6c3a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Done</span>
                            ) : null}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-[#1b2e3e]">{item.subTitle || "Practice Set"}</p>
                            <p className="mt-1 text-xs text-[#1b2e3e]/70">{item.mainTitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {seeAllModal.isOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#1b2e3e]/50 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-[#1b2e3e]/10 bg-[#f8fafc] shadow-[0_30px_80px_-35px_rgba(27,46,62,0.7)]">
            <div className="flex items-center justify-between border-b border-[#1b2e3e]/10 px-5 py-4">
              <h4 className="text-xl text-[#1b2e3e]">{seeAllModal.title}</h4>
              <button
                className="rounded-full border border-[#1b2e3e]/20 px-3 py-1 text-sm font-semibold text-[#1b2e3e]"
                type="button"
                onClick={() => {
                  setSeeAllModal((prev) => ({ ...prev, isOpen: false }));
                }}
              >
                Close
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              {seeAllModal.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{seeAllModal.error}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {seeAllModal.items.map((item) => (
                  <button
                    key={`seeall-item-${item.id}`}
                    className="overflow-hidden rounded-2xl border border-[#1b2e3e]/10 bg-white text-left hover:shadow-[0_10px_26px_-18px_rgba(27,46,62,0.55)]"
                    type="button"
                    onClick={() => {
                      setSeeAllModal((prev) => ({ ...prev, isOpen: false }));
                      void handleOpenSet(item);
                    }}
                  >
                    <div className="h-32 w-full bg-[#1b2e3e]/5">{item.imageUrl ? <img className="h-full w-full object-cover" src={item.imageUrl} alt={item.subTitle ?? item.mainTitle} /> : null}</div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-[#1b2e3e]">{item.subTitle || "Practice Set"}</p>
                      <p className="mt-1 text-xs text-[#1b2e3e]/70">{item.mainTitle}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-center">
                {seeAllModal.page < seeAllModal.totalPages ? (
                  <button
                    className="rounded-full border border-[#1b2e3e]/20 bg-white px-4 py-2 text-sm font-semibold text-[#1b2e3e] disabled:opacity-40"
                    type="button"
                    disabled={seeAllModal.loading}
                    onClick={() => {
                      void handleLoadMoreSeeAll();
                    }}
                  >
                    {seeAllModal.loading ? "Loading..." : "Load more"}
                  </button>
                ) : (
                  <p className="text-xs text-[#1b2e3e]/60">No more sets.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isPracticeModalOpen && activeSet ? (
        <div className="fixed inset-0 z-50 bg-[#1b2e3e]/70 p-3 sm:p-5">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#1b2e3e]/10 bg-[#f5f7fa] shadow-[0_30px_80px_-35px_rgba(27,46,62,0.75)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2e3e]/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ef6c3a]">Practice Session</p>
                <h4 className="mt-1 text-2xl text-[#1b2e3e]">{activeSet.subTitle || "Speaking Set"}</h4>
                <p className="text-xs text-[#1b2e3e]/65">{activeSet.mainTitle}</p>
              </div>
              <button
                className="rounded-full border border-[#1b2e3e]/20 bg-white px-4 py-2 text-sm font-semibold text-[#1b2e3e]"
                type="button"
                onClick={closePracticeModal}
              >
                Close
              </button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[1.5fr_1fr]">
              <div className="flex min-h-0 flex-col border-b border-[#1b2e3e]/10 lg:border-b-0 lg:border-r">
                <div className="relative aspect-video w-full bg-[#0d1824]">
                  {sessionPosterUrl ? <img className="absolute inset-0 h-full w-full object-cover" src={sessionPosterUrl} alt={activeSet.subTitle ?? activeSet.mainTitle} /> : null}
                  {currentVideoUrl ? (
                    <video
                      ref={videoRef}
                      key={currentVideoUrl}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity ${isAudioOnlyPlayback ? "opacity-0" : "opacity-100"}`}
                      src={currentVideoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={() => {
                        startVideoDiagnostics();
                      }}
                      onPlay={() => {
                        startVideoDiagnostics();
                      }}
                      onEnded={() => {
                        void handleVideoEnded();
                      }}
                      onError={() => {
                        void handleVideoEnded(true);
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/75">Teacher video appears here.</div>
                  )}
                  {isAudioOnlyPlayback ? (
                    <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/55 via-transparent to-transparent p-3">
                      <p className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1b2e3e]">Audio-only clip: video codec is not browser-compatible</p>
                    </div>
                  ) : null}

                  {showCueCard && currentQuestionTitle ? (
                    <div className="absolute inset-2 overflow-y-auto rounded-xl bg-white/96 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#ef6c3a]">Cue card</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-[#1b2e3e]">{currentQuestionTitle}</p>
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  {currentPart ? <p data-testid="current-part" className="text-xs font-semibold uppercase tracking-wide text-[#ef6c3a]">Part {currentPart}</p> : null}
                  {currentQuestionTitle ? (
                    <p data-testid="current-question-title" className="mt-2 whitespace-pre-line text-base text-[#1b2e3e]">
                      {currentQuestionTitle}
                    </p>
                  ) : null}

                  {sessionError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{sessionError}</p> : null}
                  {transcript ? (
                    <div className="mt-3 rounded-xl border border-[#1b2e3e]/10 bg-white px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#ef6c3a]">Transcript</p>
                      <p className="mt-1 text-sm text-[#1b2e3e]/85">{transcript}</p>
                    </div>
                  ) : null}

                  {recordedAudioUrl ? (
                    <div className="mt-3 rounded-xl border border-[#1b2e3e]/10 bg-white px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#ef6c3a]">Your recording</p>
                      <audio className="mt-2 w-full" controls src={recordedAudioUrl} />
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {conversationRows.map((row, index) => (
                      <div key={`conversation-${index}`} className="rounded-xl border border-[#1b2e3e]/10 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef6c3a]">{row.speaker}</p>
                        <p className="mt-1 text-sm text-[#1b2e3e]/85">{row.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1b2e3e]/10 px-5 py-4" data-testid="practice-action-panel" data-stage={practiceStage}>
                  {renderPracticeAction()}
                </div>
              </div>

              <aside className="min-h-0 overflow-y-auto px-5 py-4">
                <section className="rounded-2xl border border-[#1b2e3e]/10 bg-white/90 px-4 py-3">
                  <p className="text-sm font-semibold text-[#1b2e3e]">Set overview</p>
                  {renderSetOutline()}
                </section>

                <section className="mt-4 rounded-2xl border border-[#1b2e3e]/10 bg-white/90 px-4 py-3">
                  <p className="text-sm font-semibold text-[#1b2e3e]">Suggestions</p>
                  {!answerIdeasData && answerIdeasApi.isPending ? <p className="mt-2 text-xs text-[#1b2e3e]/60">Generating suggestion...</p> : null}
                  {answerIdeasData ? (
                    <div className="mt-2 space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef6c3a]">Idea</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-[#1b2e3e]/85">{answerIdeasData.idea}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef6c3a]">Sample answer</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-[#1b2e3e]/85">{answerIdeasData.sample_answer}</p>
                      </div>
                      {answerIdeasData.vocabulary?.length ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef6c3a]">Vocabulary</p>
                          <p className="mt-1 text-sm text-[#1b2e3e]/85">{answerIdeasData.vocabulary.join(", ")}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className="mt-4 rounded-2xl border border-[#1b2e3e]/10 bg-white/90 px-4 py-3">
                  <p className="text-sm font-semibold text-[#1b2e3e]">AI feedback</p>
                  {feedbackLoading ? <p className="mt-2 text-xs text-[#1b2e3e]/60">Analyzing your answer...</p> : null}
                  {feedbackError ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{feedbackError}</p> : null}
                  {feedbackData ? (
                    <div className="mt-2 space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef6c3a]">Original answer</p>
                        <p className="mt-1 text-sm text-[#1b2e3e]/85">{feedbackData.original_answer || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef6c3a]">Refined answer</p>
                        <p className="mt-1 text-sm text-[#1b2e3e]/85">{normalizeFeedbackText(feedbackData.revised_answer) || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ef6c3a]">Band estimate</p>
                        <p className="mt-1 text-sm text-[#1b2e3e]/85">{feedbackData.revised_answer_band || "N/A"}</p>
                      </div>
                    </div>
                  ) : null}
                </section>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
