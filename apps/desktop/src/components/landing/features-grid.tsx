'use client';

import { CalendarDays, Users, Bell, Terminal, Globe, Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useScrollAnimation } from './use-scroll-animation';

const FEATURES = [
  { icon: CalendarDays, key: 'calendar' },
  { icon: Users, key: 'teams' },
  { icon: Bell, key: 'notifications' },
  { icon: Terminal, key: 'slack' },
  { icon: Globe, key: 'i18n' },
  { icon: Monitor, key: 'desktop' },
] as const;

export function FeaturesGrid() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="features" ref={ref} className="relative py-16 sm:py-24">
      <div
        className={`mx-auto max-w-6xl px-6 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t('features.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group bg-background p-6 transition-colors duration-200 hover:bg-card/80"
            >
              <div className="mb-3 text-muted-foreground transition-colors group-hover:text-foreground">
                <Icon size={18} strokeWidth={1.5} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-foreground">
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`features.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
