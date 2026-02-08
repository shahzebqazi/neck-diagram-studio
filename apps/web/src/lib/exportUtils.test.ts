// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestExportName, slugify } from "./exportUtils";

const setPromptValue = (value: string | null) => {
  const prompt = vi.fn().mockReturnValue(value);
  Object.defineProperty(window, "prompt", {
    value: prompt,
    writable: true
  });
  return prompt;
};

describe("export name helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("slugifies export names", () => {
    expect(slugify("My Export 1")).toBe("my-export-1");
  });

  it("returns null when prompt is cancelled", () => {
    setPromptValue(null);
    const result = requestExportName("Name this export", "default-name");
    expect(result).toBeNull();
  });

  it("returns null when prompt is blank", () => {
    setPromptValue("   ");
    const result = requestExportName("Name this export", "default-name");
    expect(result).toBeNull();
  });

  it("returns slugified input from prompt", () => {
    setPromptValue("My Export");
    const result = requestExportName("Name this export", "default-name");
    expect(result).toBe("my-export");
  });

  it("falls back to the suggested name if slug is empty", () => {
    setPromptValue("!!!");
    const result = requestExportName("Name this export", "default-name");
    expect(result).toBe("default-name");
  });
});
