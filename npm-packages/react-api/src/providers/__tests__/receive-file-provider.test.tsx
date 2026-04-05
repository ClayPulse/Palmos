import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import ReceiveFileProvider, {
  ReceiveFileContext,
} from "../receive-file-provider";
import {
  mockUseIMC,
  getCapturedHandlerMap,
  resetMocks,
} from "../../__mocks__/use-imc-mock";

vi.mock("../../hooks/imc/use-imc", () => ({
  default: (...args: any[]) => mockUseIMC(...args),
}));

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {
    EditorAppReceiveFileUri: "editor-app-receive-file-uri",
  },
}));

describe("ReceiveFileProvider", () => {
  beforeEach(() => resetMocks());

  it("should provide context to children", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReceiveFileProvider>{children}</ReceiveFileProvider>
    );

    const { result } = renderHook(
      () => React.useContext(ReceiveFileContext),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(result.current!.selectedFileUri).toBeUndefined();
  });

  it("should update selectedFileUri on receive file handler", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReceiveFileProvider>{children}</ReceiveFileProvider>
    );

    const { result } = renderHook(
      () => React.useContext(ReceiveFileContext),
      { wrapper }
    );

    const handlerMap = getCapturedHandlerMap();
    const handler = handlerMap?.get("editor-app-receive-file-uri");

    await act(async () => {
      await handler!({} as Window, {
        payload: { uri: "/path/to/file.txt" },
      } as any);
    });

    expect(result.current!.selectedFileUri).toBe("/path/to/file.txt");
  });
});
