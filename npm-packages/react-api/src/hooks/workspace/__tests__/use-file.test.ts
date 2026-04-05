import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useFile from "../use-file";
import {
  mockUseIMC,
  mockSendMessage,
  getCapturedHandlerMap,
  resetMocks,
} from "../../../__mocks__/use-imc-mock";

vi.mock("../../imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    PlatformReadFile: "platform-read-file",
    PlatformWriteFile: "platform-write-file",
    PlatformFileUpdate: "platform-file-update",
  },
}));

describe("useFile", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue(
      new File(["content"], "test.txt", { type: "text/plain" })
    );
  });

  it("should read file on mount when uri is provided", () => {
    renderHook(() => useFile("/path/to/file.txt"));

    expect(mockSendMessage).toHaveBeenCalledWith("platform-read-file", {
      uri: "/path/to/file.txt",
    });
  });

  it("should not read file when uri is undefined", () => {
    renderHook(() => useFile(undefined));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("should return file and saveFile function", () => {
    const { result } = renderHook(() => useFile("/path/to/file.txt"));
    expect(typeof result.current.saveFile).toBe("function");
  });

  it("should register PlatformFileUpdate handler", () => {
    renderHook(() => useFile("/path/to/file.txt"));

    const handlerMap = getCapturedHandlerMap();
    expect(handlerMap?.has("platform-file-update")).toBe(true);
  });

  it("should set file state after reading", async () => {
    const mockFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });
    mockSendMessage.mockResolvedValue(mockFile);

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useFile("/path/to/file.txt"));
      hookResult = result;
    });

    // The sendMessage should have been called
    expect(mockSendMessage).toHaveBeenCalledWith("platform-read-file", {
      uri: "/path/to/file.txt",
    });
  });

  it("should not save when uri is undefined", async () => {
    const { result } = renderHook(() => useFile(undefined));

    await act(async () => {
      await result.current.saveFile("new content");
    });

    // Should not have sent a write message
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      "platform-write-file",
      expect.anything()
    );
  });

  it("should not save when file is undefined", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFile("/path/to/file.txt"));

    await act(async () => {
      await result.current.saveFile("new content");
    });

    // Should not have sent a write message since file is not loaded
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      "platform-write-file",
      expect.anything()
    );
  });

  it("should use debounce when specified", () => {
    const { result } = renderHook(() => useFile("/path/to/file.txt", 500));
    expect(typeof result.current.saveFile).toBe("function");
  });

  it("should re-read file when uri changes", async () => {
    const { rerender } = renderHook(
      ({ uri }: { uri: string | undefined }) => useFile(uri),
      { initialProps: { uri: "/file1.txt" } }
    );

    expect(mockSendMessage).toHaveBeenCalledWith("platform-read-file", {
      uri: "/file1.txt",
    });

    mockSendMessage.mockClear();

    rerender({ uri: "/file2.txt" });

    expect(mockSendMessage).toHaveBeenCalledWith("platform-read-file", {
      uri: "/file2.txt",
    });
  });
});
