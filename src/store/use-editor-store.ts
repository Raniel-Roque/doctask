import { create } from "zustand";
import { type Editor } from "@tiptap/react";

interface EditorState {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  isSaving: boolean;
  setIsSaving: (isSaving: boolean) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  isSaving: false,
  setIsSaving: (isSaving) => set({ isSaving }),
  lastSaved: null,
  setLastSaved: (date) => set({ lastSaved: date }),
  saveError: null,
  setSaveError: (error) => set({ saveError: error }),
}));
