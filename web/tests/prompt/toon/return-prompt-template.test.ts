import { describe, expect, test } from "@jest/globals";
import { TypedVariable } from "@pulse-editor/shared-utils";
import { encode } from "@toon-format/toon";
import { createMockToonReturnTemplate } from "../../../lib/agent/prompt";

describe("Test TOON prompt generation for return types", () => {
  test("Test simple return type", () => {
    const typedVar: TypedVariable = {
      type: "string",
      description: "A simple string output",
      optional: true,
    };

    const toonPrompt = createMockToonReturnTemplate({
      test: typedVar,
    });

    const expectedJson = {
      test: "(Enter your response here, make sure to escape double quotes. Return type: A string value. Description: A simple string output.)",
    };

    expect(toonPrompt).toEqual(
      `\
\`\`\`toon
${encode(expectedJson)}
\`\`\`
`,
    );
  });

  test("Test array return type", () => {
    const typedVar: TypedVariable = {
      type: ["string"],
      description: "A simple array output",
      optional: true,
    };

    const toonPrompt = createMockToonReturnTemplate({
      test: typedVar,
    });

    const expectedJson = {
      test: [
        "(Enter your response here, make sure to escape double quotes. Return type: A string value. Description: A simple array output.)",
        "...",
      ],
    };

    expect(toonPrompt).toEqual(
      `\
\`\`\`toon
${encode(expectedJson)}
\`\`\`
`,
    );
  });

  test("Test array of object return type", () => {
    const typedVar: TypedVariable = {
      type: [
        {
          name: {
            type: "string",
            description: "Inner name",
          },
          value: {
            type: "string",
            description: "Inner value",
          },
        },
      ],
      description: "A simple array output",
      optional: true,
    };

    const toonPrompt = createMockToonReturnTemplate({
      test: typedVar,
    });

    const expectedJson = {
      test: [
        {
          name: "(Enter your response here, make sure to escape double quotes. Return type: A string value. Description: Inner name.)",
          value:
            "(Enter your response here, make sure to escape double quotes. Return type: A string value. Description: Inner value.)",
        },
        {
          name: "...",
          value: "...",
        },
      ],
    };

    const expectedToon = `\
\`\`\`toon
${encode(expectedJson).replaceAll("{", "{{").replaceAll("}", "}}")}
\`\`\`
`;

    console.log("toonPrompt", expectedToon);

    expect(toonPrompt).toEqual(expectedToon);
  });
});
