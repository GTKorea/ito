'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Rocket,
  ListTodo,
  Link2,
  RotateCcw,
  Bell,
  Keyboard,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Circle,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useHelpProgressStore } from '@/stores/help-progress-store';

function SectionProgressBadge({ sectionPrefix }: { sectionPrefix: string }) {
  const { done, total } = useHelpProgressStore((s) => s.sectionProgress(sectionPrefix));
  if (done === 0) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
      {done}/{total}
    </span>
  );
}

interface SectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  trackable?: boolean;
}

function Section({ id, icon, title, children, defaultOpen = false, trackable = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-card/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/30"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          {icon}
        </div>
        <span className="flex-1 text-sm font-semibold">
          {title}
          {trackable && <SectionProgressBadge sectionPrefix={id} />}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

function ThreadChainDiagram() {
  const t = useTranslations('help');

  return (
    <div className="my-4 space-y-3">
      {/* Forward chain */}
      <div className="rounded-lg border border-border bg-background/50 p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('threadDiagram.connectPhase')}
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              A
            </div>
            <span className="text-[10px] text-muted-foreground">{t('threadDiagram.creator')}</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-primary" />
            <span className="text-[9px] text-primary">connect</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
              B
            </div>
            <span className="text-[10px] text-muted-foreground">{t('threadDiagram.assignee')}</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-blue-400" />
            <span className="text-[9px] text-blue-400">connect</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold">
              C
            </div>
            <span className="text-[10px] text-muted-foreground">{t('threadDiagram.assignee')}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Snap-back chain */}
      <div className="rounded-lg border border-border bg-background/50 p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('threadDiagram.snapbackPhase')}
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="flex flex-col items-center gap-1">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
              A
              <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 text-green-400" />
            </div>
            <span className="text-[10px] text-green-400">{t('threadDiagram.done')}</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-green-400 rotate-180" />
            <span className="text-[9px] text-green-400">snap</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
              B
              <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 text-green-400" />
            </div>
            <span className="text-[10px] text-green-400">{t('threadDiagram.done')}</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-4 w-4 text-green-400 rotate-180" />
            <span className="text-[9px] text-green-400">snap</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
              C
              <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 text-green-400" />
            </div>
            <span className="text-[10px] text-green-400">{t('threadDiagram.resolved')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', color)}>
      <Circle className="h-2 w-2 fill-current" />
      {label}
    </span>
  );
}

function StepItem({ number, stepId, children }: { number: number; stepId?: string; children: React.ReactNode }) {
  const completed = useHelpProgressStore((s) => stepId ? !!s.completed[stepId] : false);
  const toggleStep = useHelpProgressStore((s) => s.toggleStep);

  return (
    <div className="flex gap-3">
      {stepId ? (
        <button
          onClick={() => toggleStep(stepId)}
          className="shrink-0 mt-0.5 transition-colors"
          type="button"
        >
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-zinc-600 hover:text-zinc-400" />
          )}
        </button>
      ) : (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
          {number}
        </div>
      )}
      <p className={cn(
        'text-sm leading-relaxed pt-0.5',
        stepId && completed ? 'text-muted-foreground/50' : 'text-muted-foreground',
      )}>
        {children}
      </p>
    </div>
  );
}

function SnapbackStepItem({ step, stepId }: { step: number; stepId: string }) {
  const t = useTranslations('help');
  const completed = useHelpProgressStore((s) => !!s.completed[stepId]);
  const toggleStep = useHelpProgressStore((s) => s.toggleStep);

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-background/50 px-3 py-2.5">
      <button
        onClick={() => toggleStep(stepId)}
        className="shrink-0 mt-0.5 transition-colors"
        type="button"
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-zinc-600 hover:text-zinc-400" />
        )}
      </button>
      <p className={cn(
        'text-xs leading-relaxed',
        completed ? 'text-muted-foreground/50' : 'text-muted-foreground',
      )}>
        {t(`snapback.example${step}`)}
      </p>
    </div>
  );
}

function ProgressBar() {
  const t = useTranslations('help');
  const completedCount = useHelpProgressStore((s) => s.completedCount());
  const totalSteps = useHelpProgressStore((s) => s.totalSteps);
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const allDone = completedCount === totalSteps;

  return (
    <div className="rounded-lg border border-border bg-card/50 px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {allDone
            ? t('allComplete')
            : t('progress', { count: completedCount, total: totalSteps })}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800">
        <div
          className="h-2 rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const t = useTranslations('help');

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-2xl p-6 space-y-3">
        {/* Progress Bar */}
        <ProgressBar />

        {/* Getting Started */}
        <Section
          id="getting-started"
          icon={<Rocket className="h-4 w-4 text-primary" />}
          title={t('gettingStarted.title')}
          defaultOpen
          trackable
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('gettingStarted.description')}
            </p>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('gettingStarted.createWorkspaceTitle')}
              </h3>
              <div className="space-y-2.5">
                <StepItem number={1} stepId="getting-started.ws-step1">{t('gettingStarted.step1')}</StepItem>
                <StepItem number={2} stepId="getting-started.ws-step2">{t('gettingStarted.step2')}</StepItem>
                <StepItem number={3} stepId="getting-started.ws-step3">{t('gettingStarted.step3')}</StepItem>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('gettingStarted.inviteTitle')}
              </h3>
              <div className="space-y-2.5">
                <StepItem number={1} stepId="getting-started.invite-step1">{t('gettingStarted.inviteStep1')}</StepItem>
                <StepItem number={2} stepId="getting-started.invite-step2">{t('gettingStarted.inviteStep2')}</StepItem>
                <StepItem number={3} stepId="getting-started.invite-step3">{t('gettingStarted.inviteStep3')}</StepItem>
              </div>
            </div>
          </div>
        </Section>

        {/* Task Management */}
        <Section
          id="task-management"
          icon={<ListTodo className="h-4 w-4 text-primary" />}
          title={t('taskManagement.title')}
          trackable
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('taskManagement.description')}
            </p>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('taskManagement.statusTitle')}
              </h3>
              <div className="flex flex-wrap gap-2">
                <StatusBadge color="bg-blue-500/10 text-blue-400" label="OPEN" />
                <StatusBadge color="bg-yellow-500/10 text-yellow-400" label="IN_PROGRESS" />
                <StatusBadge color="bg-red-500/10 text-red-400" label="BLOCKED" />
                <StatusBadge color="bg-green-500/10 text-green-400" label="COMPLETED" />
                <StatusBadge color="bg-zinc-500/10 text-zinc-400" label="CANCELLED" />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('taskManagement.priorityTitle')}
              </h3>
              <div className="flex flex-wrap gap-2">
                <StatusBadge color="bg-red-500/10 text-red-400" label={t('taskManagement.urgent')} />
                <StatusBadge color="bg-orange-500/10 text-orange-400" label={t('taskManagement.high')} />
                <StatusBadge color="bg-yellow-500/10 text-yellow-400" label={t('taskManagement.medium')} />
                <StatusBadge color="bg-blue-500/10 text-blue-400" label={t('taskManagement.low')} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('taskManagement.createTaskTitle')}
              </h3>
              <div className="space-y-2.5">
                <StepItem number={1} stepId="task-management.step1">{t('taskManagement.createStep1')}</StepItem>
                <StepItem number={2} stepId="task-management.step2">{t('taskManagement.createStep2')}</StepItem>
                <StepItem number={3} stepId="task-management.step3">{t('taskManagement.createStep3')}</StepItem>
              </div>
            </div>
          </div>
        </Section>

        {/* Thread Connection */}
        <Section
          id="thread-connection"
          icon={<Link2 className="h-4 w-4 text-primary" />}
          title={t('threadConnection.title')}
          trackable
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('threadConnection.description')}
            </p>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('threadConnection.howItWorksTitle')}
              </h3>
              <div className="space-y-2.5">
                <StepItem number={1} stepId="thread-connection.step1">{t('threadConnection.step1')}</StepItem>
                <StepItem number={2} stepId="thread-connection.step2">{t('threadConnection.step2')}</StepItem>
                <StepItem number={3} stepId="thread-connection.step3">{t('threadConnection.step3')}</StepItem>
                <StepItem number={4} stepId="thread-connection.step4">{t('threadConnection.step4')}</StepItem>
              </div>
            </div>

            <ThreadChainDiagram />

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <p className="text-xs font-medium text-yellow-400 mb-1.5">{t('threadConnection.rulesTitle')}</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                  {t('threadConnection.rule1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                  {t('threadConnection.rule2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                  {t('threadConnection.rule3')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                  {t('threadConnection.rule4')}
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Snap-back System */}
        <Section
          id="snapback"
          icon={<RotateCcw className="h-4 w-4 text-primary" />}
          title={t('snapback.title')}
          trackable
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('snapback.description')}
            </p>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('snapback.exampleTitle')}
              </h3>

              {/* Step-by-step snap-back example */}
              <div className="space-y-2">
                <SnapbackStepItem step={1} stepId="snapback.step1" />
                <SnapbackStepItem step={2} stepId="snapback.step2" />
                <SnapbackStepItem step={3} stepId="snapback.step3" />
                <SnapbackStepItem step={4} stepId="snapback.step4" />
                <SnapbackStepItem step={5} stepId="snapback.step5" />
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-primary">{t('snapback.tipLabel')}</span>{' '}
                {t('snapback.tip')}
              </p>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section
          id="notifications"
          icon={<Bell className="h-4 w-4 text-primary" />}
          title={t('notifications.title')}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('notifications.description')}
            </p>

            <div className="space-y-2">
              {(['threadReceived', 'threadSnapped', 'threadCompleted', 'workspaceInvite', 'todoAssigned', 'todoCompleted'] as const).map((type) => (
                <div key={type} className="flex items-start gap-3 rounded-md border border-border bg-background/50 px-3 py-2.5">
                  <Bell className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">{t(`notifications.types.${type}.name`)}</p>
                    <p className="text-[11px] text-muted-foreground">{t(`notifications.types.${type}.description`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Keyboard Shortcuts */}
        <Section
          id="shortcuts"
          icon={<Keyboard className="h-4 w-4 text-primary" />}
          title={t('shortcuts.title')}
        >
          <div className="space-y-1">
            <ShortcutRow keys={['\u2318', 'K']} description={t('shortcuts.commandPalette')} />
            <Separator />
            <ShortcutRow keys={['\u2318', 'N']} description={t('shortcuts.newTask')} />
            <Separator />
            <ShortcutRow keys={['Esc']} description={t('shortcuts.closePanel')} />
          </div>
        </Section>
      </div>
    </div>
  );
}
