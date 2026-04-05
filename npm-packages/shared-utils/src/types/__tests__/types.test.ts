import { describe, it, expect } from "vitest";
import { isArrayType, isObjectType } from "../types";

describe("isArrayType", () => {
  it("should return true for array with one element", () => {
    expect(isArrayType(["string"])).toBe(true);
  });

  it("should return false for plain string", () => {
    expect(isArrayType("string")).toBe(false);
  });

  it("should return false for object type", () => {
    expect(isArrayType({ key: { type: "string", description: "" } })).toBe(
      false
    );
  });

  it("should return false for empty array", () => {
    expect(isArrayType([] as any)).toBe(false);
  });

  it("should return true for nested array type", () => {
    expect(isArrayType([["number"]])).toBe(true);
  });
});

describe("isObjectType", () => {
  it("should return true for object with typed variables", () => {
    expect(
      isObjectType({ key: { type: "string", description: "test" } })
    ).toBe(true);
  });

  it("should return false for plain string", () => {
    expect(isObjectType("string")).toBe(false);
  });

  it("should return false for array", () => {
    expect(isObjectType(["string"])).toBe(false);
  });

  it("should return true for empty object", () => {
    expect(isObjectType({})).toBe(true);
  });
});
