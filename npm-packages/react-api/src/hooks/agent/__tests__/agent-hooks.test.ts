import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useAgents from "../use-agents";
import useAgentTools from "../use-agent-tools";
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
    EditorRunAgentMethod: "editor-run-agent-method",
  },
}));

describe("useAgents", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue("agent result");
  });

  it("should return isReady and runAgentMethod", () => {
    const { result } = renderHook(() => useAgents());
    expect(result.current.isReady).toBe(true);
    expect(typeof result.current.runAgentMethod).toBe("function");
  });

  it("should throw when IMC not initialized", async () => {
    mockUseIMC.mockReturnValueOnce({ imc: undefined, isReady: false });
    const { result } = renderHook(() => useAgents());

    await expect(
      act(async () => {
        await result.current.runAgentMethod("agent", "method", {});
      })
    ).rejects.toThrow("IMC not initialized");
  });

  it("should send agent method via IMC", async () => {
    const { result } = renderHook(() => useAgents());

    await act(async () => {
      await result.current.runAgentMethod("agentName", "myMethod", { key: "val" });
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-run-agent-method",
      {
        agentName: "agentName",
        methodName: "myMethod",
        args: { key: "val" },
        llmConfig: undefined,
      },
      undefined
    );
  });

  it("should pass abort signal to sendMessage", async () => {
    const { result } = renderHook(() => useAgents());
    const controller = new AbortController();

    await act(async () => {
      await result.current.runAgentMethod(
        "agent",
        "method",
        {},
        controller.signal
      );
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-run-agent-method",
      expect.any(Object),
      controller.signal
    );
  });
});

describe("useAgentTools", () => {
  it("should return empty object", () => {
    const { result } = renderHook(() => useAgentTools());
    expect(result.current).toEqual({});
  });
});
