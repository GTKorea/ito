'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useScrollAnimation } from './use-scroll-animation';

const STEPS = 5;
const STEP_INTERVAL = 2500;

const NODES = [
  { id: 'alice', label: 'Alice', x: 80, y: 100 },
  { id: 'bob', label: 'Bob', x: 260, y: 100 },
  { id: 'charlie', label: 'Charlie', x: 440, y: 100 },
];

function DemoVisual({ step }: { step: number }) {
  return (
    <div className="relative h-[240px] w-full sm:h-[280px]">
      <svg viewBox="0 0 520 200" fill="none" className="h-full w-full">
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
            x1="120"
            y1="100"
            x2="220"
            y2="100"
            stroke={step >= 5 ? 'url(#demo-line-done)' : 'url(#demo-line)'}
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
            x1="300"
            y1="100"
            x2="400"
            y2="100"
            stroke={step >= 5 ? 'url(#demo-line-done)' : 'url(#demo-line)'}
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

        {/* Arrow heads */}
        {step >= 2 && (
          <polygon
            points="220,94 220,106 232,100"
            fill={step >= 5 ? '#22c55e' : '#6366f1'}
            className="transition-colors duration-500"
          />
        )}
        {step >= 3 && (
          <polygon
            points="400,94 400,106 412,100"
            fill={step >= 5 ? '#22c55e' : '#6366f1'}
            className="transition-colors duration-500"
          />
        )}

        {/* Snap-back arrows (step 4+) */}
        {step === 4 && (
          <g opacity="0.6">
            <line
              x1="400"
              y1="130"
              x2="300"
              y2="130"
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
            <polygon points="300,126 300,134 290,130" fill="#f59e0b" />
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
          (step === 5 && i === 0);

        const isCompleted =
          (step >= 4 && i === 2) ||
          (step >= 5 && i === 1) ||
          (step >= 5 && i === 0);

        return (
          <motion.div
            key={node.id}
            className="absolute flex flex-col items-center gap-1.5"
            style={{
              left: `${(node.x / 520) * 100}%`,
              top: `${(node.y / 200) * 100 - 15}%`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={
              step === 4 && i === 1
                ? { scale: 1.15 }
                : step === 5 && i === 0
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
        );
      })}

      {/* Task card */}
      {step >= 1 && (
        <motion.div
          className="absolute left-1/2 top-[70%] -translate-x-1/2 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm sm:text-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-foreground">Design homepage</span>
          {step >= 2 && (
            <span className="ml-2 text-indigo-400">
              → {step >= 3 ? (step >= 4 ? (step >= 5 ? 'Alice ✓' : 'Bob') : 'Charlie') : 'Bob'}
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
        <div className="mx-auto grid max-w-4xl gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
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
