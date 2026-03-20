'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PageTooltipProps {
  pageKey: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function PageTooltip({ pageKey, title, description }: PageTooltipProps) {
  const { checkPageOnboarding, dismissPageOnboarding } = useOnboardingStore();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const shouldShow = checkPageOnboarding(pageKey);
    if (shouldShow) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [pageKey, checkPageOnboarding]);

  const handleDismiss = () => {
    setVisible(false);
    dismissPageOnboarding(pageKey);
  };

  if (!mounted || !visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Light backdrop */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={handleDismiss}
      />

      {/* Tooltip card — centered near top of main content area */}
      <div
        className="pointer-events-auto absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 w-80 animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <div className="rounded-lg border border-border bg-[#1A1A1A] p-4 shadow-xl">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            {description}
          </p>

          {/* Dismiss */}
          <div className="flex justify-end">
            <Button size="sm" className="h-7 text-xs px-3" onClick={handleDismiss}>
              확인
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
