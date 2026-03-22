import { EDITORS, EditorId, NativeApi } from "@t3tools/contracts";
import { getLocalStorageItem, setLocalStorageItem, useLocalStorage } from "./hooks/useLocalStorage";
import { useMemo } from "react";
import { getAppSettingsSnapshot, updateAppSettings } from "./appSettings";

const LAST_EDITOR_KEY = "t3code:last-editor";

export function usePreferredEditor(availableEditors: ReadonlyArray<EditorId>) {
  const [lastEditor, setLastEditor] = useLocalStorage(LAST_EDITOR_KEY, null, EditorId);

  const effectiveEditor = useMemo(() => {
    if (lastEditor && availableEditors.includes(lastEditor)) return lastEditor;
    return EDITORS.find((editor) => availableEditors.includes(editor.id))?.id ?? null;
  }, [lastEditor, availableEditors]);

  return [effectiveEditor, setLastEditor] as const;
}

function persistPreferredEditor(editor: EditorId): void {
  setLocalStorageItem(LAST_EDITOR_KEY, editor, EditorId);
  updateAppSettings({ preferredEditor: editor });
}

export function resolveAndPersistPreferredEditor(
  availableEditors: readonly EditorId[],
): EditorId | null {
  const availableEditorIds = new Set(availableEditors);
  const settingsPreferred = getAppSettingsSnapshot().preferredEditor;
  if (settingsPreferred && availableEditorIds.has(settingsPreferred)) {
    persistPreferredEditor(settingsPreferred);
    return settingsPreferred;
  }

  const stored = getLocalStorageItem(LAST_EDITOR_KEY, EditorId);
  if (stored && availableEditorIds.has(stored)) {
    persistPreferredEditor(stored);
    return stored;
  }

  const editor = EDITORS.find((editor) => availableEditorIds.has(editor.id))?.id ?? null;
  if (editor) persistPreferredEditor(editor);
  return editor ?? null;
}

export async function openInPreferredEditor(api: NativeApi, targetPath: string): Promise<EditorId> {
  const { availableEditors } = await api.server.getConfig();
  const editor = resolveAndPersistPreferredEditor(availableEditors);
  if (!editor) throw new Error("No available editors found.");
  const settings = getAppSettingsSnapshot();
  const customPath = settings.preferredEditorExecutablePath.trim();
  if (settings.useCustomEditorPath && customPath.length > 0) {
    await api.shell.openInEditor(targetPath, editor, customPath);
  } else {
    await api.shell.openInEditor(targetPath, editor);
  }
  return editor;
}
