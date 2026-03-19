'use client';

import { useTranslations } from 'next-intl';
import { useScrollAnimation } from './use-scroll-animation';

const STATS = ['languages', 'realtime', 'crossPlatform', 'openArch'] as const;

export function StatsSection() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="relative py-16 sm:py-24">
      <div
        className={`mx-auto max-w-4xl px-6 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {STATS.map((key) => (
            <div key={key} className="text-center">
              <div className="text-2xl font-bold text-foreground sm:text-3xl">
                {t(`stats.${key}.value`)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t(`stats.${key}.label`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
