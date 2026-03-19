'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CardPosition {
  top: number;
  left: number;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingOverlay() {
  const { steps, currentStep, isActive, nextStep, skipOnboarding, checkAndStart } =
    useOnboardingStore();
  const [cardPos, setCardPos] = useState<CardPosition | null>(null);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAndStart();
  }, [checkAndStart]);

  const positionCard = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;

    const step = steps[currentStep];
    const el = document.querySelector(step.targetSelector);

    if (!el) {
      setCardPos(null);
      setHighlightRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const cardWidth = 320;
    const cardHeight = 160;
    const gap = 12;

    setHighlightRect({
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
    });

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - cardWidth / 2;
        break;
      case 'top':
        top = rect.top - cardHeight - gap;
        left = rect.left + rect.width / 2 - cardWidth / 2;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - cardHeight / 2;
        left = rect.right + gap;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - cardHeight / 2;
        left = rect.left - cardWidth - gap;
        break;
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - cardWidth - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - cardHeight - 8));

    setCardPos({ top, left });
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    positionCard();
    window.addEventListener('resize', positionCard);
    return () => window.removeEventListener('resize', positionCard);
  }, [positionCard]);

  // Re-position when step changes with a small delay for DOM updates
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(positionCard, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive, positionCard]);

  if (!mounted || !isActive) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={skipOnboarding} />

      {/* Highlight cutout */}
      {highlightRect && (
        <div
          className="absolute rounded-lg border-2 border-primary bg-transparent z-[1]"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Card */}
      {cardPos && (
        <div
          className="absolute z-[2] w-80 rounded-lg border border-border bg-[#1A1A1A] p-4 shadow-xl"
          style={{ top: cardPos.top, left: cardPos.left }}
        >
          {/* Close button */}
          <button
            onClick={skipOnboarding}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <p className="text-xs text-muted-foreground mb-1">
            Step {currentStep + 1} of {steps.length}
          </p>
          <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipOnboarding}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
            <Button size="sm" className="h-7 text-xs px-3" onClick={nextStep}>
              {isLastStep ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
