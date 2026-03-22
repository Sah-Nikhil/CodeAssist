import type { EditorId } from "@t3tools/contracts";

import { isMacPlatform, isWindowsPlatform } from "../../lib/utils";

export const CUSTOM_EDITOR_OPTION_VALUE = "custom-editor" as const;
export type OpenInPickerOptionValue = EditorId | typeof CUSTOM_EDITOR_OPTION_VALUE;

export interface OpenInPickerOption {
  readonly label: string;
  readonly value: OpenInPickerOptionValue;
}

export interface CustomEditorPreference {
  readonly useCustomEditorPath: boolean;
  readonly useCustomEditorPathTouched: boolean;
}

export function isCustomEditorOption(
  value: OpenInPickerOptionValue,
): value is typeof CUSTOM_EDITOR_OPTION_VALUE {
  return value === CUSTOM_EDITOR_OPTION_VALUE;
}

export function resolveUseCustomEditor(input: {
  readonly hasCustomExecutablePath: boolean;
  readonly preference: CustomEditorPreference;
}): boolean {
  if (!input.hasCustomExecutablePath) return false;
  return input.preference.useCustomEditorPath;
}

export function resolveCustomEditorPreferenceForSelection(
  value: OpenInPickerOptionValue,
): CustomEditorPreference {
  return isCustomEditorOption(value)
    ? { useCustomEditorPath: true, useCustomEditorPathTouched: true }
    : { useCustomEditorPath: false, useCustomEditorPathTouched: true };
}

export function resolveCustomEditorPreferenceForPathEdit(): CustomEditorPreference {
  return { useCustomEditorPath: true, useCustomEditorPathTouched: true };
}

export function resolveOpenInPickerOptions(input: {
  readonly platform: string;
  readonly availableEditors: ReadonlyArray<EditorId>;
  readonly hasCustomExecutablePath: boolean;
}): OpenInPickerOption[] {
  const fileManagerLabel = isMacPlatform(input.platform)
    ? "Finder"
    : isWindowsPlatform(input.platform)
      ? "Explorer"
      : "Files";

  const baseOptions: ReadonlyArray<{ label: string; value: EditorId }> = [
    { label: "Cursor", value: "cursor" },
    { label: "VS Code", value: "vscode" },
    { label: "Zed", value: "zed" },
    { label: "Antigravity", value: "antigravity" },
    { label: fileManagerLabel, value: "file-manager" },
  ];

  const detectedOptions: OpenInPickerOption[] = baseOptions.filter((option) =>
    input.availableEditors.includes(option.value),
  );

  if (input.hasCustomExecutablePath) {
    detectedOptions.push({ label: "Custom Editor", value: CUSTOM_EDITOR_OPTION_VALUE });
  }

  return detectedOptions;
}

export const CUSTOM_EDITOR_FALLBACK_TYPE: EditorId = "vscode";
