export type Part2Phase =
  | "idle"
  | "cue-card"
  | "awaiting-preparation-prompt"
  | "preparation"
  | "awaiting-answer-prompt"
  | "waiting-answer";

export type Part2Event =
  | { type: "RESET" }
  | { type: "LEAVE_PART2" }
  | { type: "QUESTION_PART2_RECEIVED" }
  | { type: "CUE_CARD_FINISHED" }
  | { type: "START_PREPARATION" }
  | { type: "PREPARATION_FINISHED" }
  | { type: "UNLOCK_ANSWER_RECORDING" };

export function reducePart2Phase(current: Part2Phase, event: Part2Event): Part2Phase {
  switch (event.type) {
    case "RESET":
    case "LEAVE_PART2": {
      return "idle";
    }
    case "QUESTION_PART2_RECEIVED": {
      if (current === "idle") {
        return "cue-card";
      }
      return current;
    }
    case "CUE_CARD_FINISHED": {
      if (current === "cue-card") {
        return "awaiting-preparation-prompt";
      }
      return current;
    }
    case "START_PREPARATION": {
      if (current === "cue-card" || current === "awaiting-preparation-prompt" || current === "awaiting-answer-prompt") {
        return "preparation";
      }
      return current;
    }
    case "PREPARATION_FINISHED": {
      if (current === "preparation") {
        return "awaiting-answer-prompt";
      }
      return current;
    }
    case "UNLOCK_ANSWER_RECORDING": {
      if (current === "awaiting-answer-prompt" || current === "waiting-answer") {
        return "waiting-answer";
      }
      return current;
    }
    default: {
      return current;
    }
  }
}

export function isPart2SpeakingPromptText(input: string | undefined | null): boolean {
  if (!input) {
    return false;
  }
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  return normalized.includes("can you start speaking now please") || normalized.includes("start speaking now");
}

export function isPart2PreparationPromptText(input: string | undefined | null): boolean {
  if (!input) {
    return false;
  }
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  if (!normalized.includes("one minute")) {
    return false;
  }

  return normalized.includes("starting now") || normalized.includes("make some notes") || normalized.includes("prepare your notes");
}
