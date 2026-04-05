import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLocalNetworkIP,
  discoverServerFunctions,
  normalizeJSDocPropertyName,
  getActionType,
  isPromiseLikeType,
  unwrapPromiseLikeType,
  parseTypeDefs,
  generateTempTsConfig,
  readConfigFile,
  discoverAppSkillActions,
  compileAppActionSkills,
} from "../utils.js";

vi.mock("os", () => ({
  networkInterfaces: vi.fn(),
}));

vi.mock("glob", () => ({
  globSync: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn(),
    copyFile: vi.fn(),
    rm: vi.fn(),
  },
}));

// Mock ts-morph for discoverAppSkillActions and compileAppActionSkills
const mockGetName = vi.fn().mockReturnValue("testAction");
const mockGetText = vi.fn().mockReturnValue("initializer");
const mockGetInitializer = vi.fn().mockReturnValue({ getText: mockGetText });
const mockBindingElement = {
  getName: mockGetName,
  getInitializer: mockGetInitializer,
  getKind: vi.fn().mockReturnValue(208), // BindingElement
};
const mockNameNode = {
  getElements: vi.fn().mockReturnValue([]),
};
const mockFuncParam = {
  getNameNode: vi.fn().mockReturnValue(mockNameNode),
  getType: vi.fn().mockReturnValue({
    getProperties: vi.fn().mockReturnValue([]),
  }),
};
const mockFuncDecl = {
  getName: vi.fn().mockReturnValue("testAction"),
  getJsDocs: vi.fn().mockReturnValue([
    {
      getDescription: vi.fn().mockReturnValue("A test action"),
      getFullText: vi.fn().mockReturnValue("/** A test action */"),
    },
  ]),
  getParameters: vi.fn().mockReturnValue([]),
  getReturnType: vi.fn().mockReturnValue({
    isObject: vi.fn().mockReturnValue(true),
    getProperties: vi.fn().mockReturnValue([]),
    getSymbol: vi.fn().mockReturnValue(null),
    getTypeArguments: vi.fn().mockReturnValue([]),
  }),
  getKind: vi.fn().mockReturnValue(272), // FunctionDeclaration
  asKind: vi.fn().mockReturnThis(),
  asKindOrThrow: vi.fn().mockReturnThis(),
};

const mockSourceFile = {
  getDefaultExportSymbol: vi.fn().mockReturnValue({
    getDeclarations: vi.fn().mockReturnValue([mockFuncDecl]),
  }),
  getDescendantsOfKind: vi.fn().mockReturnValue([]),
};

vi.mock("ts-morph", () => {
  class MockProject {
    addSourceFileAtPath = vi.fn().mockReturnValue(mockSourceFile);
    constructor(_opts?: any) {}
  }
  return {
    Project: MockProject,
    Node: {
      isObjectBindingPattern: vi.fn().mockReturnValue(false),
      isBindingElement: vi.fn().mockReturnValue(false),
    },
    SyntaxKind: {
      FunctionDeclaration: 272,
      JSDoc: 348,
    },
  };
});

import { networkInterfaces } from "os";
import { globSync } from "glob";
import { existsSync, writeFileSync } from "fs";

describe("getLocalNetworkIP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return first non-internal IPv4 address", () => {
    vi.mocked(networkInterfaces).mockReturnValue({
      eth0: [
        {
          address: "192.168.1.100",
          family: "IPv4",
          internal: false,
          netmask: "255.255.255.0",
          mac: "00:00:00:00:00:00",
          cidr: "192.168.1.100/24",
        },
      ],
    });
    expect(getLocalNetworkIP()).toBe("192.168.1.100");
  });

  it("should skip internal addresses", () => {
    vi.mocked(networkInterfaces).mockReturnValue({
      lo: [
        {
          address: "127.0.0.1",
          family: "IPv4",
          internal: true,
          netmask: "255.0.0.0",
          mac: "00:00:00:00:00:00",
          cidr: "127.0.0.1/8",
        },
      ],
    });
    expect(getLocalNetworkIP()).toBe("localhost");
  });

  it("should skip IPv6 addresses", () => {
    vi.mocked(networkInterfaces).mockReturnValue({
      eth0: [
        {
          address: "::1",
          family: "IPv6",
          internal: false,
          netmask: "ffff:ffff:ffff:ffff::",
          mac: "00:00:00:00:00:00",
          cidr: "::1/128",
          scopeid: 0,
        },
      ],
    });
    expect(getLocalNetworkIP()).toBe("localhost");
  });

  it("should return localhost when no interfaces", () => {
    vi.mocked(networkInterfaces).mockReturnValue({});
    expect(getLocalNetworkIP()).toBe("localhost");
  });
});

describe("discoverServerFunctions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map server function files to entry points", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/server-function/hello.ts",
      "src/server-function/utils/helper.ts",
    ] as any);

    const result = discoverServerFunctions();
    expect(result).toEqual({
      "./hello": "./src/server-function/hello.ts",
      "./utils/helper": "./src/server-function/utils/helper.ts",
    });
  });

  it("should handle backslash paths (Windows)", () => {
    vi.mocked(globSync).mockReturnValue([
      "src\\server-function\\hello.ts",
    ] as any);

    const result = discoverServerFunctions();
    expect(result).toEqual({
      "./hello": "./src/server-function/hello.ts",
    });
  });

  it("should return empty object when no files", () => {
    vi.mocked(globSync).mockReturnValue([] as any);
    const result = discoverServerFunctions();
    expect(result).toEqual({});
  });
});

describe("normalizeJSDocPropertyName", () => {
  it("should remove brackets and defaults", () => {
    expect(normalizeJSDocPropertyName("[name=default]")).toBe("name");
  });

  it("should handle plain name", () => {
    expect(normalizeJSDocPropertyName("name")).toBe("name");
  });

  it("should return empty for undefined", () => {
    expect(normalizeJSDocPropertyName(undefined)).toBe("");
  });

  it("should handle brackets without default", () => {
    expect(normalizeJSDocPropertyName("[optional]")).toBe("optional");
  });

  it("should trim whitespace", () => {
    expect(normalizeJSDocPropertyName("  name  ")).toBe("name");
  });
});

describe("getActionType", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("should return string for 'string'", () => {
    expect(getActionType("string")).toBe("string");
  });

  it("should return number for 'number'", () => {
    expect(getActionType("number")).toBe("number");
  });

  it("should return boolean for 'boolean'", () => {
    expect(getActionType("boolean")).toBe("boolean");
  });

  it("should return object for 'any'", () => {
    expect(getActionType("any")).toBe("object");
  });

  it("should handle arrays", () => {
    expect(getActionType("string[]")).toEqual(["string"]);
  });

  it("should handle nested arrays", () => {
    expect(getActionType("number[][]")).toEqual([["number"]]);
  });

  it("should return undefined for empty string", () => {
    expect(getActionType("")).toBe("undefined");
  });

  it("should return the text and warn for unknown types", () => {
    expect(getActionType("CustomType")).toBe("CustomType");
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("isPromiseLikeType", () => {
  it("should return true for Promise type", () => {
    const mockType = {
      getSymbol: () => ({ getName: () => "Promise" }),
    } as any;
    expect(isPromiseLikeType(mockType)).toBe(true);
  });

  it("should return true for PromiseLike type", () => {
    const mockType = {
      getSymbol: () => ({ getName: () => "PromiseLike" }),
    } as any;
    expect(isPromiseLikeType(mockType)).toBe(true);
  });

  it("should return false for other types", () => {
    const mockType = {
      getSymbol: () => ({ getName: () => "Observable" }),
    } as any;
    expect(isPromiseLikeType(mockType)).toBe(false);
  });

  it("should return false when no symbol", () => {
    const mockType = { getSymbol: () => undefined } as any;
    expect(isPromiseLikeType(mockType)).toBe(false);
  });
});

describe("unwrapPromiseLikeType", () => {
  it("should unwrap Promise type argument", () => {
    const innerType = { text: "string" };
    const mockType = {
      getSymbol: () => ({ getName: () => "Promise" }),
      getTypeArguments: () => [innerType],
    } as any;
    expect(unwrapPromiseLikeType(mockType)).toBe(innerType);
  });

  it("should return original type if not Promise", () => {
    const mockType = {
      getSymbol: () => ({ getName: () => "Observable" }),
      getTypeArguments: () => [],
    } as any;
    expect(unwrapPromiseLikeType(mockType)).toBe(mockType);
  });

  it("should return original type if Promise has no type args", () => {
    const mockType = {
      getSymbol: () => ({ getName: () => "Promise" }),
      getTypeArguments: () => [],
    } as any;
    expect(unwrapPromiseLikeType(mockType)).toBe(mockType);
  });
});

describe("parseTypeDefs", () => {
  it("should parse typedef and property from JSDoc", () => {
    const mockDoc = {
      getFullText: () =>
        `/**
 * @typedef {Object} input
 * @property {string} name - The name of the user
 * @property {number} age - The age
 */`,
    };

    const result = parseTypeDefs([mockDoc] as any);
    expect(result["input"]).toBeDefined();
    expect(result["input"]["name"]).toEqual({
      type: "string",
      description: "The name of the user",
    });
    expect(result["input"]["age"]).toEqual({
      type: "number",
      description: "The age",
    });
  });

  it("should handle optional properties with brackets", () => {
    const mockDoc = {
      getFullText: () =>
        `/**
 * @typedef {Object} input
 * @property {string} [name=default] - Optional name
 */`,
    };

    const result = parseTypeDefs([mockDoc] as any);
    expect(result["input"]["name"]).toEqual({
      type: "string",
      description: "Optional name",
    });
  });

  it("should return empty for no typedefs", () => {
    const mockDoc = {
      getFullText: () => `/** Just a comment */`,
    };
    const result = parseTypeDefs([mockDoc] as any);
    expect(result).toEqual({});
  });

  it("should handle multiple typedefs in multiple docs", () => {
    const mockDoc1 = {
      getFullText: () =>
        `/**
 * @typedef {Object} input
 * @property {string} name - The name
 */`,
    };
    const mockDoc2 = {
      getFullText: () =>
        `/**
 * @typedef {Object} output
 * @property {number} count - The count
 */`,
    };

    const result = parseTypeDefs([mockDoc1, mockDoc2] as any);
    expect(result["input"]).toBeDefined();
    expect(result["output"]).toBeDefined();
  });
});

describe("generateTempTsConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip if config already exists", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    generateTempTsConfig();
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("should write tsconfig if it does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    generateTempTsConfig();
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("tsconfig.server.json"),
      expect.stringContaining("ES2020")
    );
  });
});

describe("readConfigFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should read and parse config file", async () => {
    const fsPromises = (await import("fs/promises")).default;
    vi.mocked(fsPromises.access).mockResolvedValue(undefined);
    vi.mocked(fsPromises.readFile).mockResolvedValue(
      '{"id": "test-app", "version": "1.0.0"}' as any
    );

    const result = await readConfigFile();
    expect(result).toEqual({ id: "test-app", version: "1.0.0" });
  });

  it("should retry when file does not exist yet", async () => {
    const fsPromises = (await import("fs/promises")).default;
    let callCount = 0;
    vi.mocked(fsPromises.access).mockImplementation(async () => {
      callCount++;
      if (callCount < 3) throw new Error("ENOENT");
    });
    vi.mocked(fsPromises.readFile).mockResolvedValue('{"id": "test"}' as any);

    const result = await readConfigFile();
    expect(result).toEqual({ id: "test" });
    expect(callCount).toBe(3);
  });
});

describe("discoverAppSkillActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("should map skill action files to entry points", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/skill/myAction/action.ts",
    ] as any);

    const result = discoverAppSkillActions();
    expect(result).toEqual({
      "./skill/myAction": "./src/skill/myAction/action.ts",
    });
  });

  it("should return empty object when no skill files", () => {
    vi.mocked(globSync).mockReturnValue([] as any);
    const result = discoverAppSkillActions();
    expect(result).toEqual({});
  });

  it("should skip files without default export", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/skill/myAction/action.ts",
    ] as any);
    mockSourceFile.getDefaultExportSymbol.mockReturnValueOnce(null);

    const result = discoverAppSkillActions();
    expect(result).toEqual({});
  });
});

describe("compileAppActionSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("should compile simple action with no params and no returns", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/skill/testAction/action.ts",
    ] as any);

    // Reset mockFuncDecl for this test
    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("A test action"),
        getFullText: vi.fn().mockReturnValue("/** A test action */"),
      },
    ]);
    mockFuncDecl.getParameters.mockReturnValue([]);
    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(true),
      getProperties: vi.fn().mockReturnValue([]),
      getSymbol: vi.fn().mockReturnValue(null),
      getTypeArguments: vi.fn().mockReturnValue([]),
    });
    mockFuncDecl.getKind.mockReturnValue(272);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([]);

    const config: any = {};
    const result = compileAppActionSkills(config);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].name).toBe("testAction");
    expect(result.actions[0].description).toContain("test action");
  });

  it("should throw when action has no JSDoc description", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/skill/noDoc/action.ts",
    ] as any);

    mockFuncDecl.getJsDocs.mockReturnValue([]);

    expect(() => compileAppActionSkills({})).toThrow(
      "missing a JSDoc description"
    );
  });

  it("should skip files without default export", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/skill/noExport/action.ts",
    ] as any);
    mockSourceFile.getDefaultExportSymbol.mockReturnValueOnce(null);

    const config: any = {};
    const result = compileAppActionSkills(config);
    expect(result.actions).toHaveLength(0);
  });

  it("should skip when return type is not object", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/skill/testAction/action.ts",
    ] as any);

    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("desc"),
        getFullText: vi.fn().mockReturnValue("/** desc */"),
      },
    ]);
    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(false),
      getProperties: vi.fn().mockReturnValue([]),
      getSymbol: vi.fn().mockReturnValue(null),
      getTypeArguments: vi.fn().mockReturnValue([]),
    });

    const config: any = {};
    const result = compileAppActionSkills(config);
    expect(result.actions).toHaveLength(0);
  });

  it("should throw when params exist but no input typedef", () => {
    vi.mocked(globSync).mockReturnValue(["src/skill/testAction/action.ts"] as any);

    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("desc"),
        getFullText: vi.fn().mockReturnValue("/** desc */"),
      },
    ]);
    const mockProp = {
      getName: vi.fn().mockReturnValue("name"),
      isOptional: vi.fn().mockReturnValue(false),
      getTypeAtLocation: vi.fn().mockReturnValue({ getText: () => "string" }),
    };
    const mockParam = {
      getNameNode: vi.fn().mockReturnValue({ getElements: vi.fn().mockReturnValue([]) }),
      getType: vi.fn().mockReturnValue({
        getProperties: vi.fn().mockReturnValue([mockProp]),
      }),
    };
    mockFuncDecl.getParameters.mockReturnValue([mockParam]);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([]); // no typedefs

    expect(() => compileAppActionSkills({})).toThrow(
      'missing an'
    );
  });

  it("should compile action with params and input typedef", () => {
    vi.mocked(globSync).mockReturnValue(["src/skill/testAction/action.ts"] as any);

    const jsdocText = `/**
 * A test action
 * @typedef {Object} input
 * @property {string} name - User name
 */`;
    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("A test action"),
        getFullText: vi.fn().mockReturnValue(jsdocText),
      },
    ]);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([
      { getFullText: () => jsdocText },
    ]);

    const mockProp = {
      getName: vi.fn().mockReturnValue("name"),
      isOptional: vi.fn().mockReturnValue(false),
      getTypeAtLocation: vi.fn().mockReturnValue({ getText: () => "string" }),
    };
    const mockParam = {
      getNameNode: vi.fn().mockReturnValue({ getElements: vi.fn().mockReturnValue([]) }),
      getType: vi.fn().mockReturnValue({
        getProperties: vi.fn().mockReturnValue([mockProp]),
      }),
    };
    mockFuncDecl.getParameters.mockReturnValue([mockParam]);

    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(true),
      getProperties: vi.fn().mockReturnValue([]),
      getSymbol: vi.fn().mockReturnValue(null),
      getTypeArguments: vi.fn().mockReturnValue([]),
    });

    const config: any = {};
    const result = compileAppActionSkills(config);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].parameters).toHaveProperty("name");
    expect(result.actions[0].parameters.name.type).toBe("string");
  });

  it("should throw on missing property in input typedef", () => {
    vi.mocked(globSync).mockReturnValue(["src/skill/testAction/action.ts"] as any);

    const jsdocText = `/**
 * A test action
 * @typedef {Object} input
 * @property {string} other - Other field
 */`;
    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("A test action"),
        getFullText: vi.fn().mockReturnValue(jsdocText),
      },
    ]);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([
      { getFullText: () => jsdocText },
    ]);

    const mockProp = {
      getName: vi.fn().mockReturnValue("name"),
      isOptional: vi.fn().mockReturnValue(false),
    };
    const mockParam = {
      getNameNode: vi.fn().mockReturnValue({ getElements: vi.fn().mockReturnValue([]) }),
      getType: vi.fn().mockReturnValue({
        getProperties: vi.fn().mockReturnValue([mockProp]),
      }),
    };
    mockFuncDecl.getParameters.mockReturnValue([mockParam]);

    expect(() => compileAppActionSkills({})).toThrow(
      'missing'
    );
  });

  it("should compile action with return properties and output typedef", () => {
    vi.mocked(globSync).mockReturnValue(["src/skill/testAction/action.ts"] as any);

    const jsdocText = `/**
 * A test action
 * @typedef {Object} output
 * @property {string} result - The result
 */`;
    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("A test action"),
        getFullText: vi.fn().mockReturnValue(jsdocText),
      },
    ]);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([
      { getFullText: () => jsdocText },
    ]);
    mockFuncDecl.getParameters.mockReturnValue([]);

    const retProp = {
      getName: vi.fn().mockReturnValue("result"),
      isOptional: vi.fn().mockReturnValue(false),
      getTypeAtLocation: vi.fn().mockReturnValue({ getText: () => "string" }),
    };
    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(true),
      getProperties: vi.fn().mockReturnValue([retProp]),
      getSymbol: vi.fn().mockReturnValue(null),
      getTypeArguments: vi.fn().mockReturnValue([]),
    });

    const config: any = {};
    const result = compileAppActionSkills(config);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].returns).toHaveProperty("result");
  });

  it("should throw on return props without output typedef (non-promise)", () => {
    vi.mocked(globSync).mockReturnValue(["src/skill/testAction/action.ts"] as any);

    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("desc"),
        getFullText: vi.fn().mockReturnValue("/** desc */"),
      },
    ]);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([]);
    mockFuncDecl.getParameters.mockReturnValue([]);

    const retProp = {
      getName: vi.fn().mockReturnValue("result"),
      isOptional: vi.fn().mockReturnValue(false),
      getTypeAtLocation: vi.fn().mockReturnValue({ getText: () => "string" }),
    };
    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(true),
      getProperties: vi.fn().mockReturnValue([retProp]),
      getSymbol: vi.fn().mockReturnValue(null),
      getTypeArguments: vi.fn().mockReturnValue([]),
    });

    expect(() => compileAppActionSkills({})).toThrow(
      'missing'
    );
  });

  it("should warn and fallback for Promise return without output typedef", () => {
    vi.mocked(globSync).mockReturnValue(["src/skill/testAction/action.ts"] as any);

    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("desc"),
        getFullText: vi.fn().mockReturnValue("/** desc */"),
      },
    ]);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([]);
    mockFuncDecl.getParameters.mockReturnValue([]);

    const retProp = {
      getName: vi.fn().mockReturnValue("data"),
      isOptional: vi.fn().mockReturnValue(true),
      getTypeAtLocation: vi.fn().mockReturnValue({ getText: () => "string" }),
    };
    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(true),
      getProperties: vi.fn().mockReturnValue([retProp]),
      getSymbol: vi.fn().mockReturnValue({ getName: () => "Promise" }),
      getTypeArguments: vi.fn().mockReturnValue([
        {
          isObject: vi.fn().mockReturnValue(true),
          getProperties: vi.fn().mockReturnValue([retProp]),
          getSymbol: vi.fn().mockReturnValue(null),
          getTypeArguments: vi.fn().mockReturnValue([]),
        },
      ]),
    });

    const config: any = {};
    const result = compileAppActionSkills(config);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].returns).toHaveProperty("data");
    expect(result.actions[0].returns.data.optional).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Falling back to TypeScript-inferred")
    );
  });

  it("should throw on missing output property in output typedef", () => {
    vi.mocked(globSync).mockReturnValue(["src/skill/testAction/action.ts"] as any);

    const jsdocText = `/**
 * A test action
 * @typedef {Object} output
 * @property {string} other - Other field
 */`;
    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("desc"),
        getFullText: vi.fn().mockReturnValue(jsdocText),
      },
    ]);
    mockSourceFile.getDescendantsOfKind.mockReturnValue([
      { getFullText: () => jsdocText },
    ]);
    mockFuncDecl.getParameters.mockReturnValue([]);

    const retProp = {
      getName: vi.fn().mockReturnValue("missing"),
      isOptional: vi.fn().mockReturnValue(false),
      getTypeAtLocation: vi.fn().mockReturnValue({ getText: () => "string" }),
    };
    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(true),
      getProperties: vi.fn().mockReturnValue([retProp]),
      getSymbol: vi.fn().mockReturnValue(null),
      getTypeArguments: vi.fn().mockReturnValue([]),
    });

    expect(() => compileAppActionSkills({})).toThrow(
      'return property "missing" is missing'
    );
  });

  it("should throw on duplicate action names", () => {
    vi.mocked(globSync).mockReturnValue([
      "src/skill/testAction/action.ts",
      "src/skill/testAction/action.ts",
    ] as any);

    mockFuncDecl.getJsDocs.mockReturnValue([
      {
        getDescription: vi.fn().mockReturnValue("desc"),
        getFullText: vi.fn().mockReturnValue("/** desc */"),
      },
    ]);
    mockFuncDecl.getParameters.mockReturnValue([]);
    mockFuncDecl.getReturnType.mockReturnValue({
      isObject: vi.fn().mockReturnValue(true),
      getProperties: vi.fn().mockReturnValue([]),
      getSymbol: vi.fn().mockReturnValue(null),
      getTypeArguments: vi.fn().mockReturnValue([]),
    });
    mockSourceFile.getDescendantsOfKind.mockReturnValue([]);

    expect(() => compileAppActionSkills({})).toThrow(
      'Duplicate action name'
    );
  });
});
