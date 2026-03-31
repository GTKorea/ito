'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ThreadVisual } from './thread-visual';
import { useScrollAnimation } from './use-scroll-animation';

export function CTASection() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="relative overflow-hidden py-24 sm:py-32">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <ThreadVisual
          className="h-full max-h-[400px] w-full max-w-[700px]"
          opacity={0.15}
          speed={0.5}
        />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div
        className={`relative z-10 mx-auto max-w-2xl px-6 text-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {t('cta.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
          {t('cta.subtitle')}
        </p>
        <div className="mt-10">
          <Link
            href="/register"
            className="inline-flex h-12 items-center rounded-xl bg-foreground px-10 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {t('cta.button')}
          </Link>
        </div>
      </div>
    </section>
  );
}
