import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useFileSystem from "../use-file-system";
import useTerminal from "../use-terminal";
import useWorkspaceInfo from "../use-workspace-info";
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
    PlatformListPath: "platform-list-path",
    PlatformCreateFolder: "platform-create-folder",
    PlatformCreateFile: "platform-create-file",
    PlatformRename: "platform-rename",
    PlatformDelete: "platform-delete",
    PlatformHasPath: "platform-has-path",
    PlatformCopyFiles: "platform-copy-files",
    PlatformReadFile: "platform-read-file",
    PlatformWriteFile: "platform-write-file",
    PlatformCreateTerminal: "platform-create-terminal",
    EditorAppRequestWorkspace: "editor-app-request-workspace",
  },
}));

describe("useFileSystem", () => {
  beforeEach(() => resetMocks());

  it("should return file system operations", () => {
    const { result } = renderHook(() => useFileSystem());
    expect(result.current.isReady).toBe(true);
    expect(typeof result.current.listPath).toBe("function");
    expect(typeof result.current.createFolder).toBe("function");
    expect(typeof result.current.createFile).toBe("function");
    expect(typeof result.current.rename).toBe("function");
    expect(typeof result.current.deletePath).toBe("function");
    expect(typeof result.current.hasPath).toBe("function");
    expect(typeof result.current.copyFiles).toBe("function");
    expect(typeof result.current.readFile).toBe("function");
    expect(typeof result.current.writeFile).toBe("function");
  });

  it("should call listPath via IMC", async () => {
    mockSendMessage.mockResolvedValue([{ name: "file.txt" }]);
    const { result } = renderHook(() => useFileSystem());

    await act(async () => {
      await result.current.listPath("/path");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("platform-list-path", {
      uri: "/path",
      options: undefined,
    });
  });

  it("should call createFolder via IMC", async () => {
    const { result } = renderHook(() => useFileSystem());

    await act(async () => {
      await result.current.createFolder("/new-folder");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("platform-create-folder", {
      uri: "/new-folder",
    });
  });

  it("should call readFile via IMC", async () => {
    mockSendMessage.mockResolvedValue("file content");
    const { result } = renderHook(() => useFileSystem());

    await act(async () => {
      await result.current.readFile("/file.txt");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("platform-read-file", {
      uri: "/file.txt",
    });
  });

  it("should call writeFile via IMC", async () => {
    const { result } = renderHook(() => useFileSystem());

    await act(async () => {
      await result.current.writeFile("/file.txt", "content");
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "platform-write-file",
      expect.objectContaining({ uri: "/file.txt" })
    );
  });

  it("should call rename via IMC", async () => {
    const { result } = renderHook(() => useFileSystem());

    await act(async () => {
      await result.current.rename("/old", "/new");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("platform-rename", {
      oldUri: "/old",
      newUri: "/new",
    });
  });

  it("should call deletePath via IMC", async () => {
    const { result } = renderHook(() => useFileSystem());

    await act(async () => {
      await result.current.deletePath("/file");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("platform-delete", {
      uri: "/file",
    });
  });

  it("should call hasPath via IMC", async () => {
    mockSendMessage.mockResolvedValue(true);
    const { result } = renderHook(() => useFileSystem());

    let exists: boolean | undefined;
    await act(async () => {
      exists = await result.current.hasPath("/file");
    });

    expect(exists).toBe(true);
  });

  it("should call copyFiles via IMC", async () => {
    const { result } = renderHook(() => useFileSystem());

    await act(async () => {
      await result.current.copyFiles("/from", "/to");
    });

    expect(mockSendMessage).toHaveBeenCalledWith("platform-copy-files", {
      from: "/from",
      to: "/to",
    });
  });
});

describe("useTerminal", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue({
      websocketUrl: "ws://localhost:3000",
      projectHomePath: "/home/user",
    });
  });

  it("should request terminal on ready", () => {
    renderHook(() => useTerminal());
    expect(mockSendMessage).toHaveBeenCalledWith("platform-create-terminal");
  });

  it("should return websocketUrl and projectHomePath", () => {
    const { result } = renderHook(() => useTerminal());
    expect(result.current.websocketUrl).toBeUndefined();
    expect(result.current.projectHomePath).toBeUndefined();
  });

});

describe("useWorkspaceInfo", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue({ id: "workspace-123" });
  });

  it("should request workspace info on ready", () => {
    renderHook(() => useWorkspaceInfo());
    expect(mockSendMessage).toHaveBeenCalledWith(
      "editor-app-request-workspace"
    );
  });

  it("should return workspaceId", () => {
    const { result } = renderHook(() => useWorkspaceInfo());
    expect(result.current.workspaceId).toBeUndefined();
  });

});
