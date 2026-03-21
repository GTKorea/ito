'use client';

import React, { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTaskStore } from '@/stores/task-store';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Database,
  ListChecks,
  GitBranch,
  Rocket,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const TOTAL_STEPS = 5;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-6 bg-primary'
              : i < current
                ? 'w-1.5 bg-primary/50'
                : 'w-1.5 bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

function WelcomeStep() {
  const t = useTranslations('onboarding');
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t('welcome.title')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          {t('welcome.description')}
        </p>
      </div>
    </div>
  );
}

function SeedDataStep() {
  const t = useTranslations('onboarding');
  const { currentWorkspace } = useWorkspaceStore();
  const { fetchCategorizedTasks } = useTaskStore();
  const { isSeedingData, seedingError, setSeedingState } = useOnboardingStore();
  const [seeded, setSeeded] = useState(false);

  const handleSeed = useCallback(async () => {
    if (!currentWorkspace || seeded) return;
    setSeedingState(true);
    try {
      const { data } = await api.post(`/workspaces/${currentWorkspace.id}/seed-sample-data`);
      if (data.seeded) {
        await fetchCategorizedTasks(currentWorkspace.id);
        setSeeded(true);
      } else {
        setSeeded(true);
      }
      setSeedingState(false);
    } catch (err: any) {
      setSeedingState(false, err?.response?.data?.message || t('seedData.error'));
    }
  }, [currentWorkspace, fetchCategorizedTasks, setSeedingState, seeded, t]);

  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
        <Database className="h-7 w-7 text-blue-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t('seedData.title')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          {t('seedData.description')}
        </p>
      </div>

      {seedingError && (
        <p className="text-xs text-destructive">{seedingError}</p>
      )}

      {seeded ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          {t('seedData.success')}
        </div>
      ) : (
        <Button
          onClick={handleSeed}
          disabled={isSeedingData}
          className="mt-1"
        >
          {isSeedingData ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              {t('seedData.seeding')}
            </>
          ) : (
            <>
              <Database className="mr-1.5 h-4 w-4" />
              {t('seedData.button')}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function TaskOverviewStep() {
  const t = useTranslations('onboarding');
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
        <ListChecks className="h-7 w-7 text-emerald-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t('taskOverview.title')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          {t('taskOverview.description')}
        </p>
      </div>
      <div className="w-full max-w-[300px] space-y-2 mt-1">
        <div className="flex items-center gap-3 rounded-lg bg-[#1A1A1A] border border-border/50 p-3 text-left">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{t('taskOverview.example1.title')}</p>
            <p className="text-[10px] text-muted-foreground">{t('taskOverview.example1.meta')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-[#1A1A1A] border border-primary/30 p-3 text-left">
          <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{t('taskOverview.example2.title')}</p>
            <p className="text-[10px] text-muted-foreground">{t('taskOverview.example2.meta')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-[#1A1A1A] border border-border/50 p-3 text-left">
          <div className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{t('taskOverview.example3.title')}</p>
            <p className="text-[10px] text-muted-foreground">{t('taskOverview.example3.meta')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadConceptStep() {
  const t = useTranslations('onboarding');
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
        <GitBranch className="h-7 w-7 text-violet-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t('threadConcept.title')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          {t('threadConcept.description')}
        </p>
      </div>
      {/* Visual thread chain diagram */}
      <div className="w-full max-w-[280px] mt-1">
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">{t('threadConcept.me')}</div>
            <span className="text-[10px] text-muted-foreground">{t('threadConcept.create')}</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-primary/60" />
            <span className="text-[10px] text-primary/60">{t('threadConcept.connect')}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400">B</div>
            <span className="text-[10px] text-muted-foreground">{t('threadConcept.work')}</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-blue-400/60" />
            <span className="text-[10px] text-blue-400/60">{t('threadConcept.connect')}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-medium text-violet-400">C</div>
            <span className="text-[10px] text-muted-foreground">{t('threadConcept.work')}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <ArrowLeft className="h-3 w-3" />
            <span>{t('threadConcept.snapback1')}</span>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <ArrowLeft className="h-3 w-3" />
            <span>{t('threadConcept.snapback2')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletionStep() {
  const t = useTranslations('onboarding');
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
        <Rocket className="h-7 w-7 text-amber-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t('completion.title')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          {t('completion.description')}
        </p>
      </div>
      <div className="w-full max-w-[280px] space-y-2 mt-1">
        <div className="rounded-lg bg-[#1A1A1A] border border-border/50 p-3 text-left">
          <p className="text-xs font-medium text-foreground mb-1">{t('completion.nextSteps')}</p>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">1.</span>
              {t('completion.step1')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">2.</span>
              {t('completion.step2')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">3.</span>
              {t('completion.step3')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [
  WelcomeStep,
  SeedDataStep,
  TaskOverviewStep,
  ThreadConceptStep,
  CompletionStep,
];

export function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const {
    showWizard,
    wizardStep,
    nextWizardStep,
    prevWizardStep,
    skipWizard,
    completeWizard,
  } = useOnboardingStore();

  const isFirstStep = wizardStep === 0;
  const isLastStep = wizardStep === TOTAL_STEPS - 1;
  const StepComponent = STEP_COMPONENTS[wizardStep];

  if (!showWizard) return null;

  return (
    <Dialog
      open={showWizard}
      onOpenChange={(open) => {
        if (!open) skipWizard();
      }}
    >
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden" showCloseButton={false}>
        {/* Content */}
        <div className="px-6 pt-6 pb-4">
          <StepComponent />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-muted/30">
          <button
            onClick={skipWizard}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('skip')}
          </button>

          <StepIndicator current={wizardStep} total={TOTAL_STEPS} />

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={prevWizardStep}
                className="h-7 text-xs px-2"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                {t('previous')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={isLastStep ? completeWizard : nextWizardStep}
              className="h-7 text-xs px-3"
            >
              {isLastStep ? t('getStarted') : t('next')}
              {!isLastStep && <ArrowRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
