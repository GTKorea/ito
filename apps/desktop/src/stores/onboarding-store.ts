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
const WIZARD_STORAGE_KEY = 'ito_onboarding_wizard_done';


interface OnboardingState {
  // Tooltip tour state
  steps: OnboardingStep[];
  currentStep: number;
  isActive: boolean;
  startOnboarding: () => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  checkAndStart: () => void;

  // Wizard state
  showWizard: boolean;
  wizardStep: number;
  wizardCompleted: boolean;
  isSeedingData: boolean;
  seedingError: string | null;
  openWizard: () => void;
  closeWizard: () => void;
  setWizardStep: (step: number) => void;
  nextWizardStep: () => void;
  prevWizardStep: () => void;
  skipWizard: () => void;
  completeWizard: () => void;
  setSeedingState: (loading: boolean, error?: string | null) => void;
  checkAndStartWizard: () => boolean;

}

const WIZARD_TOTAL_STEPS = 5;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  // Tooltip tour
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
      const wizardDone = localStorage.getItem(WIZARD_STORAGE_KEY);
      // Only start tooltip tour if wizard is already done but tour hasn't been done
      if (!done && wizardDone) {
        setTimeout(() => {
          set({ isActive: true, currentStep: 0 });
        }, 1000);
      }
    } catch {}
  },

  // Wizard state
  showWizard: false,
  wizardStep: 0,
  wizardCompleted: false,
  isSeedingData: false,
  seedingError: null,

  openWizard: () => {
    set({ showWizard: true, wizardStep: 0 });
  },

  closeWizard: () => {
    set({ showWizard: false });
  },

  setWizardStep: (step: number) => {
    set({ wizardStep: Math.max(0, Math.min(step, WIZARD_TOTAL_STEPS - 1)) });
  },

  nextWizardStep: () => {
    const { wizardStep } = get();
    if (wizardStep < WIZARD_TOTAL_STEPS - 1) {
      set({ wizardStep: wizardStep + 1 });
    } else {
      get().completeWizard();
    }
  },

  prevWizardStep: () => {
    const { wizardStep } = get();
    if (wizardStep > 0) {
      set({ wizardStep: wizardStep - 1 });
    }
  },

  skipWizard: () => {
    set({ showWizard: false, wizardStep: 0, wizardCompleted: true });
    try {
      localStorage.setItem(WIZARD_STORAGE_KEY, 'true');
    } catch {}
  },

  completeWizard: () => {
    set({ showWizard: false, wizardStep: 0, wizardCompleted: true });
    try {
      localStorage.setItem(WIZARD_STORAGE_KEY, 'true');
      // After wizard, optionally start the tooltip tour
      const tourDone = localStorage.getItem(STORAGE_KEY);
      if (!tourDone) {
        setTimeout(() => {
          set({ isActive: true, currentStep: 0 });
        }, 500);
      }
    } catch {}
  },

  setSeedingState: (loading: boolean, error: string | null = null) => {
    set({ isSeedingData: loading, seedingError: error });
  },

  checkAndStartWizard: () => {
    try {
      const wizardDone = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (!wizardDone) {
        set({ showWizard: true, wizardStep: 0 });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

}));
