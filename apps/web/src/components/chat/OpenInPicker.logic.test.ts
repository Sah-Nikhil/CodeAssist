import { describe, expect, it } from "vitest";
import {
  CUSTOM_EDITOR_OPTION_VALUE,
  CUSTOM_EDITOR_FALLBACK_TYPE,
  isCustomEditorOption,
  resolveCustomEditorPreferenceForPathEdit,
  resolveCustomEditorPreferenceForSelection,
  resolveOpenInPickerOptions,
  resolveUseCustomEditor,
} from "./OpenInPicker.logic";

describe("isCustomEditorOption", () => {
  it("returns true only for the custom editor option value", () => {
    expect(isCustomEditorOption(CUSTOM_EDITOR_OPTION_VALUE)).toBe(true);
    expect(isCustomEditorOption("cursor")).toBe(false);
  });
});

describe("resolveUseCustomEditor", () => {
  it("returns false when no custom executable path exists", () => {
    expect(
      resolveUseCustomEditor({
        hasCustomExecutablePath: false,
        preference: { useCustomEditorPath: true, useCustomEditorPathTouched: true },
      }),
    ).toBe(false);
  });

  it("respects the saved preference when a custom executable path exists", () => {
    expect(
      resolveUseCustomEditor({
        hasCustomExecutablePath: true,
        preference: { useCustomEditorPath: true, useCustomEditorPathTouched: true },
      }),
    ).toBe(true);
    expect(
      resolveUseCustomEditor({
        hasCustomExecutablePath: true,
        preference: { useCustomEditorPath: false, useCustomEditorPathTouched: true },
      }),
    ).toBe(false);
  });
});

describe("custom editor preference resolvers", () => {
  it("marks custom selection as touched + enabled", () => {
    expect(resolveCustomEditorPreferenceForSelection(CUSTOM_EDITOR_OPTION_VALUE)).toEqual({
      useCustomEditorPath: true,
      useCustomEditorPathTouched: true,
    });
  });

  it("marks built-in selection as touched + disabled", () => {
    expect(resolveCustomEditorPreferenceForSelection("vscode")).toEqual({
      useCustomEditorPath: false,
      useCustomEditorPathTouched: true,
    });
  });

  it("enables and touches preference on path edit", () => {
    expect(resolveCustomEditorPreferenceForPathEdit()).toEqual({
      useCustomEditorPath: true,
      useCustomEditorPathTouched: true,
    });
  });
});

describe("resolveOpenInPickerOptions", () => {
  it("uses Finder label for file manager on macOS", () => {
    expect(
      resolveOpenInPickerOptions({
        platform: "MacIntel",
        availableEditors: ["file-manager"],
        hasCustomExecutablePath: false,
      }),
    ).toEqual([{ label: "Finder", value: "file-manager" }]);
  });

  it("uses Explorer label for file manager on Windows", () => {
    expect(
      resolveOpenInPickerOptions({
        platform: "Win32",
        availableEditors: ["file-manager"],
        hasCustomExecutablePath: false,
      }),
    ).toEqual([{ label: "Explorer", value: "file-manager" }]);
  });

  it("uses Files label for file manager on non-mac/non-windows platforms", () => {
    expect(
      resolveOpenInPickerOptions({
        platform: "Linux x86_64",
        availableEditors: ["file-manager"],
        hasCustomExecutablePath: false,
      }),
    ).toEqual([{ label: "Files", value: "file-manager" }]);
  });

  it("filters to available built-in editors and appends custom option when configured", () => {
    expect(
      resolveOpenInPickerOptions({
        platform: "Win32",
        availableEditors: ["cursor", "vscode", "file-manager"],
        hasCustomExecutablePath: true,
      }),
    ).toEqual([
      { label: "Cursor", value: "cursor" },
      { label: "VS Code", value: "vscode" },
      { label: "Explorer", value: "file-manager" },
      { label: "Custom Editor", value: CUSTOM_EDITOR_OPTION_VALUE },
    ]);
  });
});

describe("custom editor fallback", () => {
  it("uses vscode fallback editor for custom executable launches over web transport", () => {
    expect(CUSTOM_EDITOR_FALLBACK_TYPE).toBe("vscode");
  });
});
