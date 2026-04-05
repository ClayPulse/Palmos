import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useSpeech2Speech from "../use-speech2speech";
import {
  mockUseIMC,
  resetMocks,
  mockImc,
} from "../../../__mocks__/use-imc-mock";

vi.mock("../../imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {},
}));

describe("useSpeech2Speech", () => {
  beforeEach(() => resetMocks());

  it("should return isReady, userInput, isUserStopped, and respondAndRead", () => {
    const { result } = renderHook(() => useSpeech2Speech());
    expect(result.current.isReady).toBe(true);
    expect(result.current.userInput).toBe("");
    expect(result.current.isUserStopped).toBe(false);
    expect(typeof result.current.respondAndRead).toBe("function");
  });

  it("should not throw when calling respondAndRead with imc", async () => {
    const { result } = renderHook(() => useSpeech2Speech());

    await act(async () => {
      // Should not throw since imc is mocked
      await result.current.respondAndRead("Hello");
    });
  });

  it("should throw when imc is not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useSpeech2Speech());

    await expect(
      act(async () => {
        await result.current.respondAndRead("Hello");
      })
    ).rejects.toThrow("IMC is not initialized");
  });
});
