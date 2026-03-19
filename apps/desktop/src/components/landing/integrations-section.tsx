'use client';

import { Calendar, MessageSquare, Laptop } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useScrollAnimation } from './use-scroll-animation';

const INTEGRATIONS = [
  { icon: Calendar, key: 'calendar', accent: '#6366f1' },
  { icon: MessageSquare, key: 'slack', accent: '#8b5cf6' },
  { icon: Laptop, key: 'desktop', accent: '#a78bfa' },
] as const;

export function IntegrationsSection() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="integrations" ref={ref} className="relative py-24 sm:py-32">
      <div
        className={`mx-auto max-w-6xl px-6 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t('integrations.title')}
          </h2>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {INTEGRATIONS.map(({ icon: Icon, key, accent }) => (
            <div
              key={key}
              className="group flex flex-col gap-6 rounded-2xl border border-border/50 bg-card/30 p-6 transition-colors duration-300 hover:border-border sm:p-8 md:flex-row md:items-center md:gap-10"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${accent}15` }}
              >
                <Icon size={24} style={{ color: accent }} />
              </div>
              <div>
                <h3 className="mb-1.5 text-lg font-semibold">
                  {t(`integrations.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`integrations.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
