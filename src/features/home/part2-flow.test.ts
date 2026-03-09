import { isPart2PreparationPromptText, isPart2SpeakingPromptText, reducePart2Phase, type Part2Phase } from "./part2-flow";

describe("part2 flow reducer", () => {
  test("follows cue card -> timer prompt -> 1 minute prep -> answer prompt -> waiting answer", () => {
    let phase: Part2Phase = "idle";

    phase = reducePart2Phase(phase, { type: "QUESTION_PART2_RECEIVED" });
    expect(phase).toBe("cue-card");

    phase = reducePart2Phase(phase, { type: "CUE_CARD_FINISHED" });
    expect(phase).toBe("awaiting-preparation-prompt");

    phase = reducePart2Phase(phase, { type: "START_PREPARATION" });
    expect(phase).toBe("preparation");

    phase = reducePart2Phase(phase, { type: "PREPARATION_FINISHED" });
    expect(phase).toBe("awaiting-answer-prompt");

    phase = reducePart2Phase(phase, { type: "UNLOCK_ANSWER_RECORDING" });
    expect(phase).toBe("waiting-answer");
  });

  test("ignores early recording unlock before speaking prompt", () => {
    let phase: Part2Phase = "idle";

    phase = reducePart2Phase(phase, { type: "QUESTION_PART2_RECEIVED" });
    expect(phase).toBe("cue-card");

    phase = reducePart2Phase(phase, { type: "UNLOCK_ANSWER_RECORDING" });
    expect(phase).toBe("cue-card");
  });
});

describe("part2 speaking prompt detector", () => {
  test("detects speaking prompt sentence", () => {
    expect(isPart2SpeakingPromptText("Can you start speaking now please?")).toBe(true);
    expect(isPart2SpeakingPromptText("Ok. So remember... Can you start speaking now please?")).toBe(true);
  });

  test("does not match cue card text", () => {
    expect(
      isPart2SpeakingPromptText(
        "Describe a famous person you would like to meet. You should say who he or she is and explain why.",
      ),
    ).toBe(false);
  });
});

describe("part2 preparation prompt detector", () => {
  test("detects one-minute note prompt", () => {
    expect(isPart2PreparationPromptText("One minute, starting now.")).toBe(true);
    expect(isPart2PreparationPromptText("You have one minute to prepare your notes.")).toBe(true);
  });

  test("does not match answer prompt", () => {
    expect(isPart2PreparationPromptText("Can you start speaking now please?")).toBe(false);
  });
});
