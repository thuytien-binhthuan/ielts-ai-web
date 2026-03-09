import { expect, test } from "@playwright/test";

const SET_CODE = "S2CELE6101";
const CUE_CARD_TEXT =
  "Describe a famous person you would like to meet. You should say: - Who he or she is. - How you knew him or her How or where you would like to meet him or her. - And explain why you would like to meet him or her.";
const PREPARATION_PROMPT_TEXT = "One minute, starting now.";
const SPEAKING_PROMPT_TEXT =
  "Ok. So remember you have two minutes for this. So don't worry if I stop you. I will tell you when the time is up. Can you start speaking now please?";
const USER_TRANSCRIPT = "My name is Abbas, and I'm free to ask Thomas.";

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

test("full part 2 flow works for set S2CELE6101 with mocked API/media", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("ACCESS_TOKEN", "e2e-access-token");
    window.localStorage.setItem("REFRESH_TOKEN", "e2e-refresh-token");

    const originalCreateObjectUrl = URL.createObjectURL?.bind(URL);
    (URL as URL & { createObjectURL: (obj: unknown) => string }).createObjectURL = (obj: unknown) => {
      if (originalCreateObjectUrl) {
        try {
          return originalCreateObjectUrl(obj as Blob | MediaSource);
        } catch {
          return "blob:e2e-audio";
        }
      }
      return "blob:e2e-audio";
    };
    URL.revokeObjectURL = () => undefined;

    const nav = navigator as Navigator & {
      mediaDevices?: {
        getUserMedia?: () => Promise<{
          getTracks: () => Array<{ stop: () => void }>;
        }>;
      };
    };
    nav.mediaDevices = nav.mediaDevices ?? {};
    nav.mediaDevices.getUserMedia = async () => {
      return {
        getTracks: () => [{ stop: () => undefined }],
      };
    };

    class MockMediaRecorder {
      static isTypeSupported() {
        return true;
      }
      state: "inactive" | "recording" = "inactive";
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(stream: unknown, options?: unknown) {
        void stream;
        void options;
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        const blob = new Blob(["mock audio bytes"], { type: "audio/webm" });
        this.ondataavailable?.({ data: blob } as BlobEvent);
        this.onstop?.();
      }
    }

    (window as Window & { MediaRecorder: typeof MediaRecorder }).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    HTMLMediaElement.prototype.play = function play() {
      window.setTimeout(() => {
        this.dispatchEvent(new Event("ended"));
      }, 50);
      window.setTimeout(() => {
        this.dispatchEvent(new Event("ended"));
      }, 70);
      return Promise.resolve();
    };
  });

  let nextDataCall = 0;
  const nextDataCallTimestamps: number[] = [];

  await page.route("**/api/proxy/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname.replace(/^\/api\/proxy/, "");

    if (method === "GET" && path === "/v1/home/tags") {
      await route.fulfill(json(["Forecast"]));
      return;
    }

    if (method === "GET" && path === "/v1/home/practice/speaking") {
      await route.fulfill(
        json([
          {
            type: "Speaking_Practice",
            sectionTitle: "Practice IELTS speaking sets",
            groups: [
              {
                groupTitle: "IELTS Speaking part 2",
                display: "Horizontal",
                size: "Big",
                part: 2,
                seeAll: false,
                items: [
                  {
                    id: SET_CODE,
                    mainTitle: "Practice set",
                    subTitle: "Celebrity culture",
                    imageUrl: "https://example.com/part2-cover.jpg",
                    tested: false,
                    type: "Speaking_Part_2",
                  },
                ],
              },
            ],
          },
        ]),
      );
      return;
    }

    if (method === "POST" && path === "/v1/feedback/get_question_list") {
      await route.fulfill(
        json([
          {
            part: 2,
            questions: [CUE_CARD_TEXT, PREPARATION_PROMPT_TEXT, SPEAKING_PROMPT_TEXT],
          },
        ]),
      );
      return;
    }

    if (method === "POST" && path === "/v1/feedback/test_session_start") {
      await route.fulfill(
        json({
          session_id: "session-part2-e2e",
          img_url: "https://example.com/poster.jpg",
        }),
      );
      return;
    }

    if (method === "POST" && path === "/v1/feedback/test_session_next_data") {
      nextDataCall += 1;
      nextDataCallTimestamps.push(Date.now());

      if (nextDataCall === 1) {
        await route.fulfill(
          json({
            type: "QuestionPart2",
            data: {
              text: CUE_CARD_TEXT,
              video_url: "",
              sample_answer: "",
              topic: "Celebrity",
              part: 2,
              set_code: SET_CODE,
              index_in_set: 1,
            },
            actionsBefore: [],
            actionsAfter: [{ type: "GetNextTestData" }],
          }),
        );
        return;
      }

      if (nextDataCall === 2) {
        await route.fulfill(
          json({
            type: "QuestionPart2",
            data: {
              text: PREPARATION_PROMPT_TEXT,
              video_url: "",
              sample_answer: "",
              topic: "Celebrity",
              part: 2,
              set_code: SET_CODE,
              index_in_set: 2,
            },
            actionsBefore: [],
            actionsAfter: [{ type: "StartTimerForPreparation" }],
          }),
        );
        return;
      }

      if (nextDataCall === 3) {
        await route.fulfill(
          json({
            type: "QuestionPart2",
            data: {
              text: SPEAKING_PROMPT_TEXT,
              video_url: "",
              sample_answer: "",
              topic: "Celebrity",
              part: 2,
              set_code: SET_CODE,
              index_in_set: 3,
            },
            actionsBefore: [],
            actionsAfter: [{ type: "StartTimerForSpeakingPart2" }],
          }),
        );
        return;
      }

      await route.fulfill(
        json({
          type: "SwitchingContext",
          data: {
            text: "Okay. Thank you very much. So that is the end of the test.",
            video_url: "",
            part: 2,
          },
          actionsBefore: [],
          actionsAfter: [{ type: "EndTest" }],
        }),
      );
      return;
    }

    if (method === "POST" && path === "/v1/feedback/get_answer_idea") {
      await route.fulfill(
        json({
          idea: "Talk about a public figure whose values align with yours.",
          sample_answer: "I'd like to meet this person because of their social impact.",
          vocabulary: ["role model", "inspiring", "charitable", "public image"],
        }),
      );
      return;
    }

    if (method === "POST" && path === "/v1/feedback/test_session_answer") {
      await route.fulfill(
        json({
          transcript: USER_TRANSCRIPT,
          stop: false,
          better_answer: null,
        }),
      );
      return;
    }

    if (method === "POST" && path === "/v1/feedback/test_session_get_answer_feedback") {
      await route.fulfill(
        json({
          question: SPEAKING_PROMPT_TEXT,
          original_answer: USER_TRANSCRIPT,
          audio_url: null,
          revised_answer: "A stronger answer with clearer ideas and better structure.",
          pronunciation: {},
          grammar: [],
          vocabulary: ["coherent", "engaging"],
          fluency: {},
          revised_answer_band: "6.5",
        }),
      );
      return;
    }

    await route.fulfill(json({ detail: `Unhandled route ${method} ${path}` }, 404));
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Practice IELTS speaking sets" }).first()).toBeVisible();

  await page.getByRole("button", { name: /Celebrity culture/i }).first().click();
  await expect(page.getByRole("button", { name: "Start practice" })).toBeVisible();
  await page.getByRole("button", { name: "Start practice" }).click();

  const actionPanel = page.getByTestId("practice-action-panel");
  const currentQuestionTitle = page.getByTestId("current-question-title");

  await expect.poll(() => nextDataCall).toBeGreaterThanOrEqual(3);
  expect(nextDataCallTimestamps[2] - nextDataCallTimestamps[1]).toBeGreaterThanOrEqual(4500);

  await expect(page.getByText(/Describe a famous person you would like to meet/i).first()).toBeVisible();
  await expect(page.getByText(/One minute, starting now/i).first()).toBeVisible();
  await expect(currentQuestionTitle).toContainText("Can you start speaking now please");
  await expect(actionPanel).toHaveAttribute("data-stage", /^(waiting-answer|recording)$/);
  expect(nextDataCall).toBe(3);

  if (await page.getByRole("button", { name: "Answer (recording)" }).isVisible()) {
    await page.getByRole("button", { name: "Answer (recording)" }).click();
  }
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await page.getByRole("button", { name: "Stop recording" }).click();

  await expect(page.getByText(USER_TRANSCRIPT).first()).toBeVisible();
  await expect(page.getByText("Band estimate")).toBeVisible();
  await expect(page.getByText("6.5")).toBeVisible();

  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByText("Practice session completed.")).toBeVisible();
});
