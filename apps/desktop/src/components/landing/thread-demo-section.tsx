'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useScrollAnimation } from './use-scroll-animation';

const STEPS = 6;
const STEP_INTERVAL = 2500;

const VB_W = 580;
const VB_H = 200;
const NODE_Y = 70;
const NODE_R = 25;

const NODES = [
  { id: 'alice', label: 'Alice', x: 80, y: NODE_Y },
  { id: 'bob', label: 'Bob', x: 290, y: NODE_Y },
  { id: 'charlie', label: 'Charlie', x: 500, y: NODE_Y },
];

function DemoVisual({ step }: { step: number }) {
  return (
    <div className="relative h-[240px] w-full sm:h-[280px]">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} fill="none" className="h-full w-full">
        <defs>
          <linearGradient id="demo-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="demo-line-done" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          <filter id="demo-glow">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Line Alice → Bob */}
        {step >= 2 && (
          <line
            x1={NODES[0].x + NODE_R}
            y1={NODE_Y}
            x2={NODES[1].x - NODE_R}
            y2={NODE_Y}
            stroke={step >= 6 ? 'url(#demo-line-done)' : 'url(#demo-line)'}
            strokeWidth="2"
            strokeDasharray={step === 2 ? '200' : 'none'}
            strokeDashoffset={step === 2 ? '0' : '0'}
            className="transition-all duration-700"
          >
            {step === 2 && (
              <animate
                attributeName="stroke-dashoffset"
                from="200"
                to="0"
                dur="0.8s"
                fill="freeze"
              />
            )}
          </line>
        )}

        {/* Line Bob → Charlie */}
        {step >= 3 && (
          <line
            x1={NODES[1].x + NODE_R}
            y1={NODE_Y}
            x2={NODES[2].x - NODE_R}
            y2={NODE_Y}
            stroke={step >= 6 ? 'url(#demo-line-done)' : 'url(#demo-line)'}
            strokeWidth="2"
            className="transition-all duration-700"
          >
            {step === 3 && (
              <animate
                attributeName="stroke-dashoffset"
                from="200"
                to="0"
                dur="0.8s"
                fill="freeze"
              />
            )}
          </line>
        )}

        {/* Arrow heads — midpoint between nodes */}
        {step >= 2 && (
          <polygon
            points={`${(NODES[0].x + NODES[1].x) / 2 - 6},${NODE_Y - 5} ${(NODES[0].x + NODES[1].x) / 2 - 6},${NODE_Y + 5} ${(NODES[0].x + NODES[1].x) / 2 + 6},${NODE_Y}`}
            fill={step >= 6 ? '#22c55e' : '#6366f1'}
            className="transition-colors duration-500"
          />
        )}
        {step >= 3 && (
          <polygon
            points={`${(NODES[1].x + NODES[2].x) / 2 - 6},${NODE_Y - 5} ${(NODES[1].x + NODES[2].x) / 2 - 6},${NODE_Y + 5} ${(NODES[1].x + NODES[2].x) / 2 + 6},${NODE_Y}`}
            fill={step >= 6 ? '#22c55e' : '#6366f1'}
            className="transition-colors duration-500"
          />
        )}

        {/* Snap-back: Charlie → Bob (step 4) */}
        {step === 4 && (
          <g opacity="0.6">
            <line
              x1={NODES[2].x - NODE_R}
              y1={NODE_Y + 18}
              x2={NODES[1].x + NODE_R}
              y2={NODE_Y + 18}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="16"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </line>
            <polygon
              points={`${NODES[1].x + NODE_R},${NODE_Y + 14} ${NODES[1].x + NODE_R},${NODE_Y + 22} ${NODES[1].x + NODE_R - 10},${NODE_Y + 18}`}
              fill="#f59e0b"
            />
          </g>
        )}

        {/* Snap-back: Bob → Alice (step 5) */}
        {step === 5 && (
          <g opacity="0.6">
            <line
              x1={NODES[1].x - NODE_R}
              y1={NODE_Y + 18}
              x2={NODES[0].x + NODE_R}
              y2={NODE_Y + 18}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="16"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </line>
            <polygon
              points={`${NODES[0].x + NODE_R},${NODE_Y + 14} ${NODES[0].x + NODE_R},${NODE_Y + 22} ${NODES[0].x + NODE_R - 10},${NODE_Y + 18}`}
              fill="#f59e0b"
            />
          </g>
        )}
      </svg>

      {/* Animated nodes */}
      {NODES.map((node, i) => {
        const isActive =
          (step === 1 && i === 0) ||
          (step === 2 && i === 1) ||
          (step === 3 && i === 2) ||
          (step === 4 && i === 1) ||
          (step === 5 && i === 0) ||
          (step === 6 && i === 0);

        const isCompleted =
          (step >= 4 && i === 2) ||
          (step >= 5 && i === 1) ||
          (step >= 6 && i === 0);

        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(node.x / VB_W) * 100}%`,
              top: `${(node.y / VB_H) * 100}%`,
            }}
          >
            <motion.div
              className="flex flex-col items-center gap-1.5"
              animate={
                (step === 4 && i === 1) || (step === 5 && i === 0)
                  ? { scale: 1.15 }
                  : { scale: 1 }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-500 sm:h-12 sm:w-12 sm:text-sm ${
                  isCompleted
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : isActive
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
                      : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check size={16} /> : node.label[0]}
              </div>
              <span className="text-[10px] text-muted-foreground sm:text-xs">{node.label}</span>
            </motion.div>
          </div>
        );
      })}

      {/* Task card */}
      {step >= 1 && (
        <motion.div
          className="absolute left-1/2 top-[75%] -translate-x-1/2 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm sm:text-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-foreground">Design homepage</span>
          {step >= 2 && (
            <span className="ml-2 text-indigo-400">
              → {step >= 6 ? 'Alice ✓' : step >= 5 ? 'Alice' : step >= 4 ? 'Bob' : step >= 3 ? 'Charlie' : 'Bob'}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}

export function ThreadDemoSection() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();
  const [step, setStep] = useState(0);

  const resetAndPlay = useCallback(() => {
    setStep(1);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    resetAndPlay();
  }, [isVisible, resetAndPlay]);

  useEffect(() => {
    if (step === 0 || step > STEPS) return;
    if (step > STEPS) {
      const timeout = setTimeout(() => setStep(0), 2000);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      if (step < STEPS) {
        setStep(step + 1);
      } else {
        setTimeout(() => {
          setStep(0);
          setTimeout(resetAndPlay, 500);
        }, 2000);
      }
    }, STEP_INTERVAL);
    return () => clearTimeout(timeout);
  }, [step, resetAndPlay]);

  const stepKeys = [
    'threadDemo.step1',
    'threadDemo.step2',
    'threadDemo.step3',
    'threadDemo.step4',
    'threadDemo.step5',
    'threadDemo.step6',
  ];

  return (
    <section
      id="thread-demo"
      ref={ref}
      className="relative py-24 sm:py-32"
    >
      <div
        className={`mx-auto max-w-6xl px-6 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Section header */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t('threadDemo.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('threadDemo.subtitle')}
          </p>
        </div>

        {/* Demo area */}
        <div className="mx-auto grid max-w-4xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Steps */}
          <div className="flex flex-col gap-3">
            {stepKeys.map((key, i) => (
              <button
                key={i}
                onClick={() => setStep(i + 1)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all duration-300 ${
                  step === i + 1
                    ? 'bg-accent text-foreground'
                    : step > i + 1
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    step > i + 1
                      ? 'bg-green-500/20 text-green-400'
                      : step === i + 1
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-accent text-muted-foreground'
                  }`}
                >
                  {step > i + 1 ? <Check size={12} /> : i + 1}
                </span>
                {t(key)}
              </button>
            ))}
          </div>

          {/* Visual */}
          <div className="rounded-2xl border border-border bg-card/50 p-6">
            <DemoVisual step={step} />
          </div>
        </div>
      </div>
    </section>
  );
}
