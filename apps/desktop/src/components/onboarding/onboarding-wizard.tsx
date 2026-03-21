'use client';

import React, { useCallback, useState } from 'react';
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
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          ito에 오신 것을 환영합니다!
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          실(Thread) 기반 협업을 시작해볼까요?
          태스크를 만들고 팀원에게 실을 연결하면, 완료 시 자동으로 되돌려받는 스마트 워크플로우를 경험할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function SeedDataStep() {
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
        // Already has data
        setSeeded(true);
      }
      setSeedingState(false);
    } catch (err: any) {
      setSeedingState(false, err?.response?.data?.message || '샘플 데이터 생성에 실패했습니다.');
    }
  }, [currentWorkspace, fetchCategorizedTasks, setSeedingState, seeded]);

  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
        <Database className="h-7 w-7 text-blue-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          샘플 데이터를 만들어 볼까요?
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          ito의 핵심 기능을 바로 체험할 수 있도록 예시 태스크를 생성합니다.
          실제 프로젝트와 비슷한 태스크들을 미리 만들어 드릴게요.
        </p>
      </div>

      {seedingError && (
        <p className="text-xs text-destructive">{seedingError}</p>
      )}

      {seeded ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          샘플 데이터가 생성되었습니다!
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
              생성 중...
            </>
          ) : (
            <>
              <Database className="mr-1.5 h-4 w-4" />
              샘플 데이터 생성
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function TaskOverviewStep() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
        <ListChecks className="h-7 w-7 text-emerald-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          태스크를 확인해보세요
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          방금 생성된 태스크들이 목록에 보입니다.
          각 태스크는 상태(진행 중, 완료 등)와 우선순위로 관리됩니다.
        </p>
      </div>
      <div className="w-full max-w-[300px] space-y-2 mt-1">
        <div className="flex items-center gap-3 rounded-lg bg-[#1A1A1A] border border-border/50 p-3 text-left">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">프로젝트 킥오프 미팅 준비</p>
            <p className="text-[10px] text-muted-foreground">완료됨 · 높음</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-[#1A1A1A] border border-primary/30 p-3 text-left">
          <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">디자인 시안 검토</p>
            <p className="text-[10px] text-muted-foreground">진행 중 · 보통</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-[#1A1A1A] border border-border/50 p-3 text-left">
          <div className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">API 문서 작성</p>
            <p className="text-[10px] text-muted-foreground">열림 · 낮음</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadConceptStep() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
        <GitBranch className="h-7 w-7 text-violet-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          실(Thread)을 연결해보세요
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          ito의 핵심은 실(Thread) 연결입니다.
          태스크를 팀원에게 넘기면 자동으로 체인이 만들어지고, 완료 시 snap-back으로 되돌아옵니다.
        </p>
      </div>
      {/* Visual thread chain diagram */}
      <div className="w-full max-w-[280px] mt-1">
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">나</div>
            <span className="text-[10px] text-muted-foreground">생성</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-primary/60" />
            <span className="text-[10px] text-primary/60">연결</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400">B</div>
            <span className="text-[10px] text-muted-foreground">작업</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-blue-400/60" />
            <span className="text-[10px] text-blue-400/60">연결</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-medium text-violet-400">C</div>
            <span className="text-[10px] text-muted-foreground">작업</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <ArrowLeft className="h-3 w-3" />
            <span>C 완료 → B에게 snap-back</span>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <ArrowLeft className="h-3 w-3" />
            <span>B 완료 → 나에게 snap-back</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletionStep() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
        <Rocket className="h-7 w-7 text-amber-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          준비 완료!
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px]">
          이제 직접 태스크를 만들고, 팀원을 초대해서 실(Thread)을 연결해보세요.
          상단의 <span className="text-foreground font-medium">+ 새 태스크</span> 버튼으로 시작할 수 있습니다.
        </p>
      </div>
      <div className="w-full max-w-[280px] space-y-2 mt-1">
        <div className="rounded-lg bg-[#1A1A1A] border border-border/50 p-3 text-left">
          <p className="text-xs font-medium text-foreground mb-1">다음 단계</p>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">1.</span>
              새 태스크를 만들어보세요
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">2.</span>
              팀원을 워크스페이스에 초대하세요
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">3.</span>
              태스크에 실(Thread)을 연결하세요
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
            건너뛰기
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
                이전
              </Button>
            )}
            <Button
              size="sm"
              onClick={isLastStep ? completeWizard : nextWizardStep}
              className="h-7 text-xs px-3"
            >
              {isLastStep ? '시작하기' : '다음'}
              {!isLastStep && <ArrowRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
