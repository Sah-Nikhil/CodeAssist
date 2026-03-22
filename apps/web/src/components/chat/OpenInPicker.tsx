import { EditorId, type ResolvedKeybindingsConfig } from "@t3tools/contracts";
import { memo, useCallback, useEffect, useMemo } from "react";
import { isOpenFavoriteEditorShortcut, shortcutLabelForCommand } from "../../keybindings";
import { usePreferredEditor } from "../../editorPreferences";
import { useAppSettings } from "../../appSettings";
import { ChevronDownIcon, FolderClosedIcon, SettingsIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Group, GroupSeparator } from "../ui/group";
import { Menu, MenuItem, MenuPopup, MenuShortcut, MenuTrigger } from "../ui/menu";
import { AntigravityIcon, CursorIcon, Icon, VisualStudioCode, Zed } from "../Icons";
import { toastManager } from "../ui/toast";
import { readNativeApi } from "~/nativeApi";
import {
  CUSTOM_EDITOR_FALLBACK_TYPE,
  CUSTOM_EDITOR_OPTION_VALUE,
  isCustomEditorOption,
  type OpenInPickerOptionValue,
  resolveCustomEditorPreferenceForSelection,
  resolveOpenInPickerOptions,
  resolveUseCustomEditor,
} from "./OpenInPicker.logic";

const iconByOptionValue: Record<EditorId, Icon> = {
  cursor: CursorIcon,
  vscode: VisualStudioCode,
  zed: Zed,
  antigravity: AntigravityIcon,
  "file-manager": FolderClosedIcon,
};

const customOption = {
  label: "Custom Editor",
  Icon: SettingsIcon,
  value: CUSTOM_EDITOR_OPTION_VALUE,
} as const;

const resolveOptions = (
  platform: string,
  availableEditors: ReadonlyArray<EditorId>,
  hasCustomExecutablePath: boolean,
) => {
  const resolved = resolveOpenInPickerOptions({
    platform,
    availableEditors,
    hasCustomExecutablePath,
  });
  return resolved.map((option) => {
    if (isCustomEditorOption(option.value)) {
      return customOption;
    }
    return {
      label: option.label,
      value: option.value,
      Icon: iconByOptionValue[option.value],
    };
  });
};

const resolvePrimaryValue = (input: {
  preferredEditor: EditorId | null;
  useCustomEditor: boolean;
  hasCustomExecutablePath: boolean;
  availableEditors: ReadonlyArray<EditorId>;
}): OpenInPickerOptionValue | null => {
  if (input.useCustomEditor && input.hasCustomExecutablePath) {
    return CUSTOM_EDITOR_OPTION_VALUE;
  }
  if (input.preferredEditor && input.availableEditors.includes(input.preferredEditor)) {
    return input.preferredEditor;
  }
  return null;
};

const resolveBuiltinEditor = (value: OpenInPickerOptionValue): EditorId | null => {
  if (isCustomEditorOption(value)) {
    return null;
  }
  return value;
};

export const OpenInPicker = memo(function OpenInPicker({
  keybindings,
  availableEditors,
  openInCwd,
}: {
  keybindings: ResolvedKeybindingsConfig;
  availableEditors: ReadonlyArray<EditorId>;
  openInCwd: string | null;
}) {
  const { settings, updateSettings } = useAppSettings();
  const [preferredEditor, setPreferredEditor] = usePreferredEditor(availableEditors);

  const hasCustomExecutablePath = settings.preferredEditorExecutablePath.trim().length > 0;
  const useCustomEditor = resolveUseCustomEditor({
    hasCustomExecutablePath,
    preference: {
      useCustomEditorPath: settings.useCustomEditorPath,
      useCustomEditorPathTouched: settings.useCustomEditorPathTouched,
    },
  });

  const options = useMemo(
    () => resolveOptions(navigator.platform, availableEditors, hasCustomExecutablePath),
    [availableEditors, hasCustomExecutablePath],
  );
  const primaryOptionValue = resolvePrimaryValue({
    preferredEditor,
    useCustomEditor,
    hasCustomExecutablePath,
    availableEditors,
  });
  const primaryOption = options.find(({ value }) => value === primaryOptionValue) ?? null;

  const openInEditor = useCallback(
    (optionValue: OpenInPickerOptionValue | null) => {
      const api = readNativeApi();
      if (!api || !openInCwd) return;
      const effectiveValue = optionValue ?? primaryOptionValue;
      if (!effectiveValue) return;

      if (isCustomEditorOption(effectiveValue)) {
        const customPath = settings.preferredEditorExecutablePath.trim();
        if (!customPath) {
          toastManager.add({ type: "error", title: "No custom editor path" });
          return;
        }

        updateSettings(resolveCustomEditorPreferenceForSelection(CUSTOM_EDITOR_OPTION_VALUE));
        if (window.desktopBridge?.openInEditor) {
          void window.desktopBridge.openInEditor(customPath, openInCwd);
          return;
        }
        void api.shell.openInEditor(openInCwd, CUSTOM_EDITOR_FALLBACK_TYPE, customPath);
        return;
      }

      const editor = resolveBuiltinEditor(effectiveValue);
      if (!editor) return;
      void api.shell.openInEditor(openInCwd, editor);
      setPreferredEditor(editor);
      updateSettings({
        preferredEditor: editor,
        ...resolveCustomEditorPreferenceForSelection(editor),
      });
    },
    [openInCwd, primaryOptionValue, setPreferredEditor, settings, updateSettings],
  );

  const openFavoriteEditorShortcutLabel = useMemo(
    () => shortcutLabelForCommand(keybindings, "editor.openFavorite"),
    [keybindings],
  );

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const api = readNativeApi();
      if (!isOpenFavoriteEditorShortcut(e, keybindings)) return;
      if (!api || !openInCwd) return;
      if (!primaryOptionValue) return;

      e.preventDefault();
      openInEditor(primaryOptionValue);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keybindings, openInCwd, openInEditor, primaryOptionValue]);

  return (
    <Group aria-label="Subscription actions">
      <Button
        size="xs"
        variant="outline"
        disabled={!primaryOptionValue || !openInCwd}
        onClick={() => openInEditor(primaryOptionValue)}
      >
        {primaryOption?.Icon && <primaryOption.Icon aria-hidden="true" className="size-3.5" />}
        <span className="sr-only @sm/header-actions:not-sr-only @sm/header-actions:ml-0.5">
          Open
        </span>
      </Button>
      <GroupSeparator className="hidden @sm/header-actions:block" />
      <Menu>
        <MenuTrigger render={<Button aria-label="Copy options" size="icon-xs" variant="outline" />}>
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </MenuTrigger>
        <MenuPopup align="end">
          {options.length === 0 && <MenuItem disabled>No installed editors found</MenuItem>}
          {options.map(({ label, Icon, value }) => (
            <MenuItem key={value} onClick={() => openInEditor(value)}>
              <Icon aria-hidden="true" className="text-muted-foreground" />
              {label}
              {value === primaryOptionValue && openFavoriteEditorShortcutLabel && (
                <MenuShortcut>{openFavoriteEditorShortcutLabel}</MenuShortcut>
              )}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>
    </Group>
  );
});
