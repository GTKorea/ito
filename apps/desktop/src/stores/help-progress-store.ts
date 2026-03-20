import { create } from 'zustand';

const STORAGE_KEY = 'ito_help_progress';

export const STEP_IDS = [
  'getting-started.ws-step1', 'getting-started.ws-step2', 'getting-started.ws-step3',
  'getting-started.invite-step1', 'getting-started.invite-step2', 'getting-started.invite-step3',
  'task-management.step1', 'task-management.step2', 'task-management.step3',
  'thread-connection.step1', 'thread-connection.step2', 'thread-connection.step3', 'thread-connection.step4',
  'snapback.step1', 'snapback.step2', 'snapback.step3', 'snapback.step4', 'snapback.step5',
] as const;

type StepId = (typeof STEP_IDS)[number];

interface HelpProgressState {
  completed: Record<string, boolean>;
  toggleStep: (stepId: string) => void;
  completedCount: () => number;
  totalSteps: number;
  sectionProgress: (sectionPrefix: string) => { done: number; total: number };
}

function loadCompleted(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCompleted(completed: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  } catch {}
}

export const useHelpProgressStore = create<HelpProgressState>((set, get) => ({
  completed: loadCompleted(),
  totalSteps: STEP_IDS.length,

  toggleStep: (stepId: string) => {
    const { completed } = get();
    const next = { ...completed, [stepId]: !completed[stepId] };
    // Remove falsy entries to keep storage clean
    if (!next[stepId]) {
      delete next[stepId];
    }
    saveCompleted(next);
    set({ completed: next });
  },

  completedCount: () => {
    const { completed } = get();
    return Object.values(completed).filter(Boolean).length;
  },

  sectionProgress: (sectionPrefix: string) => {
    const { completed } = get();
    const sectionSteps = STEP_IDS.filter((id) => id.startsWith(sectionPrefix + '.'));
    const done = sectionSteps.filter((id) => completed[id]).length;
    return { done, total: sectionSteps.length };
  },
}));
