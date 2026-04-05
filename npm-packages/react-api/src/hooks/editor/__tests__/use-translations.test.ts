import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTranslations } from "../use-translations";
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
    EditorLocaleUpdate: "editor-locale-update",
    EditorAppRequestLocale: "editor-app-request-locale",
  },
}));

const messages = {
  en: {
    greeting: "Hello",
    nested: { deep: "Deep value" },
    withVar: "Hello {name}, you are {age}",
  },
  es: {
    greeting: "Hola",
    nested: { deep: "Valor profundo" },
    withVar: "Hola {name}, tienes {age}",
  },
};

describe("useTranslations", () => {
  beforeEach(() => {
    resetMocks();
    mockSendMessage.mockResolvedValue("en");
  });

  it("should return default locale 'en'", () => {
    const { result } = renderHook(() => useTranslations(messages));
    expect(result.current.locale).toBe("en");
  });

  it("should translate simple keys", () => {
    const { result } = renderHook(() => useTranslations(messages));
    expect(result.current.getTranslations("greeting")).toBe("Hello");
  });

  it("should translate nested keys with dot notation", () => {
    const { result } = renderHook(() => useTranslations(messages));
    expect(result.current.getTranslations("nested.deep")).toBe("Deep value");
  });

  it("should substitute variables", () => {
    const { result } = renderHook(() => useTranslations(messages));
    expect(
      result.current.getTranslations("withVar", { name: "World", age: "25" })
    ).toBe("Hello World, you are 25");
  });

  it("should return key when translation is not a string", () => {
    const { result } = renderHook(() => useTranslations(messages));
    expect(result.current.getTranslations("nested")).toBe("nested");
  });

  it("should fall back to en when locale not found", () => {
    const { result } = renderHook(() => useTranslations(messages));
    // Default locale is "en", so all translations should work
    expect(result.current.getTranslations("greeting")).toBe("Hello");
  });

  it("should register EditorLocaleUpdate handler", () => {
    renderHook(() => useTranslations(messages));

    const handlerMap = getCapturedHandlerMap();
    expect(handlerMap).toBeDefined();
    expect(handlerMap?.has("editor-locale-update")).toBe(true);
  });

  it("should request locale on ready", () => {
    renderHook(() => useTranslations(messages));
    expect(mockSendMessage).toHaveBeenCalledWith("editor-app-request-locale");
  });

  it("should not request locale when not ready", () => {
    mockUseIMC.mockReturnValueOnce({ imc: null, isReady: false });
    renderHook(() => useTranslations(messages));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
