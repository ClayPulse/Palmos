import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import useReceiveFile from "../use-receive-file";
import { ReceiveFileContext } from "../../../providers/receive-file-provider";

vi.mock("@pulse-editor/shared-utils", () => ({
  IMCMessageTypeEnum: {},
}));

describe("useReceiveFile", () => {
  it("should return receivedFileUri from context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReceiveFileContext.Provider
        value={{ selectedFileUri: "/test/file.txt" }}
      >
        {children}
      </ReceiveFileContext.Provider>
    );

    const { result } = renderHook(() => useReceiveFile(), { wrapper });
    expect(result.current.receivedFileUri).toBe("/test/file.txt");
  });

  it("should return undefined when no file selected", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReceiveFileContext.Provider value={{ selectedFileUri: undefined }}>
        {children}
      </ReceiveFileContext.Provider>
    );

    const { result } = renderHook(() => useReceiveFile(), { wrapper });
    expect(result.current.receivedFileUri).toBeUndefined();
  });

  it("should throw without ReceiveFileProvider", () => {
    expect(() => {
      renderHook(() => useReceiveFile());
    }).toThrow("useReceiveFile must be used within a ReceiveFileProvider");
  });
});
