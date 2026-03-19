import { create } from 'zustand';

export interface OnboardingStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'create-task',
    targetSelector: '[data-onboarding="new-task"]',
    title: 'Create a task',
    description: 'Start by creating your first task. Tasks are the building blocks of your workflow.',
    position: 'bottom',
  },
  {
    id: 'connect-thread',
    targetSelector: '[data-onboarding="connect-thread"]',
    title: 'Connect a thread',
    description: 'Connect tasks to teammates with threads. When they finish, it snaps back to you automatically.',
    position: 'bottom',
  },
  {
    id: 'view-graph',
    targetSelector: 'a[href="/graph"]',
    title: 'View the graph',
    description: 'Visualize all your thread connections in an interactive graph view.',
    position: 'right',
  },
  {
    id: 'check-notifications',
    targetSelector: 'a[href="/notifications"]',
    title: 'Check notifications',
    description: 'Stay updated on thread activity, snap-backs, and workspace invites.',
    position: 'right',
  },
];

const STORAGE_KEY = 'ito_onboarding_done';

interface OnboardingState {
  steps: OnboardingStep[];
  currentStep: number;
  isActive: boolean;
  startOnboarding: () => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  checkAndStart: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  steps: ONBOARDING_STEPS,
  currentStep: 0,
  isActive: false,

  startOnboarding: () => {
    set({ isActive: true, currentStep: 0 });
  },

  nextStep: () => {
    const { currentStep, steps } = get();
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().completeOnboarding();
    }
  },

  skipOnboarding: () => {
    set({ isActive: false, currentStep: 0 });
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  },

  completeOnboarding: () => {
    set({ isActive: false, currentStep: 0 });
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  },

  checkAndStart: () => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        // Small delay so the DOM is ready
        setTimeout(() => {
          set({ isActive: true, currentStep: 0 });
        }, 1000);
      }
    } catch {}
  },
}));
