import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useLLM from "../use-llm";
import useTTS from "../use-tts";
import useSTT from "../use-stt";
import useOCR from "../use-ocr";
import useImageGen from "../use-image-gen";
import useVideoGen from "../use-video-gen";
import {
  mockUseIMC,
  mockSendMessage,
  resetMocks,
} from "../../../__mocks__/use-imc-mock";

vi.mock("../../imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    ModalityLLM: "modality-llm",
    ModalityTTS: "modality-tts",
    ModalitySTT: "modality-stt",
    ModalityOCR: "modality-ocr",
    ModalityImageGen: "modality-image-gen",
    ModalityVideoGen: "modality-video-gen",
  },
}));

describe("useLLM", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue("AI response");
  });

  it("should throw when IMC not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useLLM());

    await expect(
      act(async () => {
        await result.current.runLLM("test");
      })
    ).rejects.toThrow("IMC not initialized");
  });

  it("should send prompt and return result", async () => {
    const { result } = renderHook(() => useLLM());

    let response: string | undefined;
    await act(async () => {
      response = await result.current.runLLM("Hello AI");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("modality-llm", {
      prompt: "Hello AI",
      llmConfig: undefined,
    });
    expect(response).toBe("AI response");
  });

  it("should pass LLM config", async () => {
    const { result } = renderHook(() => useLLM());

    await act(async () => {
      await result.current.runLLM("test", { model: "gpt-4" } as any);
    });

    expect(mockSendMessage).toHaveBeenCalledWith("modality-llm", {
      prompt: "test",
      llmConfig: { model: "gpt-4" },
    });
  });
});

describe("useTTS", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it("should throw when IMC not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useTTS());

    await expect(
      act(async () => {
        await result.current.runTTS("test");
      })
    ).rejects.toThrow("IMC not initialized");
  });

  it("should send text and return audio data", async () => {
    const { result } = renderHook(() => useTTS());

    await act(async () => {
      await result.current.runTTS("Hello");
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "modality-tts",
      expect.objectContaining({ text: "Hello" })
    );
  });
});

describe("useSTT", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue("transcribed text");
  });

  it("should throw when IMC not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useSTT());

    await expect(
      act(async () => {
        await result.current.runSTT(new Uint8Array());
      })
    ).rejects.toThrow("IMC not initialized");
  });

  it("should send audio and return text", async () => {
    const { result } = renderHook(() => useSTT());
    const audio = new Uint8Array([1, 2, 3]);

    await act(async () => {
      await result.current.runSTT(audio);
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "modality-stt",
      expect.objectContaining({ audio })
    );
  });
});

describe("useOCR", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue({ payload: { text: "recognized text" } });
  });

  it("should throw when IMC not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useOCR());

    await expect(
      act(async () => {
        await result.current.recognizeText("img");
      })
    ).rejects.toThrow("IMC is not initialized");
  });

  it("should send image and return text", async () => {
    const { result } = renderHook(() => useOCR());

    let text: string | undefined;
    await act(async () => {
      text = await result.current.recognizeText("base64image");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("modality-ocr", {
      image: "base64image",
    });
    expect(text).toBe("recognized text");
  });
});

describe("useImageGen", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue({ url: "https://img.url" });
  });

  it("should throw when IMC not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useImageGen());

    await expect(
      act(async () => {
        await result.current.runImageGen("test");
      })
    ).rejects.toThrow("IMC not initialized");
  });

  it("should send prompt and return image result", async () => {
    const { result } = renderHook(() => useImageGen());

    await act(async () => {
      await result.current.runImageGen("a cat");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("modality-image-gen", {
      textPrompt: "a cat",
      imagePrompt: undefined,
      imageModelConfig: undefined,
    });
  });

  it("should throw when no prompts provided", async () => {
    const { result } = renderHook(() => useImageGen());

    await expect(
      act(async () => {
        await result.current.runImageGen();
      })
    ).rejects.toThrow("At least one of textPrompt or imagePrompt is required");
  });
});

describe("useVideoGen", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue({ url: "https://vid.url" });
  });

  it("should throw when IMC not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useVideoGen());

    await expect(
      act(async () => {
        await result.current.runVideoGen(5, "test");
      })
    ).rejects.toThrow("IMC not initialized");
  });

  it("should send prompt and return video result", async () => {
    const { result } = renderHook(() => useVideoGen());

    await act(async () => {
      await result.current.runVideoGen(5, "sunset");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("modality-video-gen", {
      duration: 5,
      textPrompt: "sunset",
      imagePrompt: undefined,
      videoModelConfig: undefined,
    });
  });

  it("should throw when no prompts provided", async () => {
    const { result } = renderHook(() => useVideoGen());

    await expect(
      act(async () => {
        await result.current.runVideoGen(5);
      })
    ).rejects.toThrow("At least one of textPrompt or imagePrompt is required");
  });
});
