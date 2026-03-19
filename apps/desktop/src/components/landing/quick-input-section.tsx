'use client';

import { useEffect, useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useScrollAnimation } from './use-scroll-animation';

const FULL_TEXT = 'Design homepage > @Sarah > @Mike';
const TYPING_SPEED = 70;
const PAUSE_AT_MENTION = 600;

function TypingDemo() {
  const [text, setText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownName, setDropdownName] = useState('');
  const { ref, isVisible } = useScrollAnimation();
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!isVisible) return;

    indexRef.current = 0;
    setText('');

    const type = () => {
      const i = indexRef.current;
      if (i >= FULL_TEXT.length) {
        setShowDropdown(false);
        // Restart after pause
        timeoutRef.current = setTimeout(() => {
          indexRef.current = 0;
          setText('');
          timeoutRef.current = setTimeout(type, 500);
        }, 3000);
        return;
      }

      const char = FULL_TEXT[i];
      setText(FULL_TEXT.slice(0, i + 1));
      indexRef.current = i + 1;

      // Show dropdown when typing @S or @M
      if (FULL_TEXT.slice(Math.max(0, i - 1), i + 1) === '@S') {
        setShowDropdown(true);
        setDropdownName('Sarah');
        timeoutRef.current = setTimeout(() => {
          setShowDropdown(false);
          timeoutRef.current = setTimeout(type, TYPING_SPEED);
        }, PAUSE_AT_MENTION);
        return;
      }
      if (FULL_TEXT.slice(Math.max(0, i - 1), i + 1) === '@M') {
        setShowDropdown(true);
        setDropdownName('Mike');
        timeoutRef.current = setTimeout(() => {
          setShowDropdown(false);
          timeoutRef.current = setTimeout(type, TYPING_SPEED);
        }, PAUSE_AT_MENTION);
        return;
      }

      timeoutRef.current = setTimeout(type, TYPING_SPEED);
    };

    timeoutRef.current = setTimeout(type, 800);
    return () => clearTimeout(timeoutRef.current);
  }, [isVisible]);

  // Highlight parts of the text
  const renderText = () => {
    const parts = text.split(/(@\w+|>)/g);
    return parts.map((part, i) => {
      if (part === '>') {
        return (
          <span key={i} className="text-indigo-400">
            {' '}<ArrowRight size={14} className="inline" />{' '}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span key={i} className="rounded bg-indigo-500/20 px-1 text-indigo-300">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Input mockup */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 font-mono text-sm text-foreground">
            {renderText()}
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
          </div>
        </div>

        {/* Hint text */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <kbd className="rounded border border-border/50 px-1 py-0.5 text-[9px]">Enter</kbd>
          <span>to create</span>
          <span className="mx-1">·</span>
          <kbd className="rounded border border-border/50 px-1 py-0.5 text-[9px]">&gt;</kbd>
          <span>to connect</span>
          <span className="mx-1">·</span>
          <kbd className="rounded border border-border/50 px-1 py-0.5 text-[9px]">@</kbd>
          <span>to mention</span>
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div className="absolute left-4 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-xl">
          <div className="flex items-center gap-2 rounded-md bg-accent px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-300">
              {dropdownName[0]}
            </div>
            <span className="text-sm text-foreground">{dropdownName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function QuickInputSection() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="relative py-24 sm:py-32">
      <div
        className={`mx-auto max-w-6xl px-6 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mx-auto grid max-w-4xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('quickInput.title')}
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {t('quickInput.subtitle')}
            </p>
          </div>

          {/* Demo */}
          <TypingDemo />
        </div>
      </div>
    </section>
  );
}
