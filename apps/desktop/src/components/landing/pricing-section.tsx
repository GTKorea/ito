'use client';

import Link from 'next/link';
import { Check, X, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useScrollAnimation } from './use-scroll-animation';

type Feature = { key: string; free: boolean; pro: boolean; team: boolean; enterprise: boolean };

const FEATURES: Feature[] = [
  { key: 'unlimitedTasks', free: true, pro: true, team: true, enterprise: true },
  { key: 'unlimitedChain', free: true, pro: true, team: true, enterprise: true },
  { key: 'calendarSync', free: true, pro: true, team: true, enterprise: true },
  { key: 'slackIntegration', free: true, pro: true, team: true, enterprise: true },
  { key: 'teamDashboard', free: false, pro: true, team: true, enterprise: true },
  { key: 'guestRole', free: false, pro: true, team: true, enterprise: true },
  { key: 'activityLog', free: false, pro: false, team: true, enterprise: true },
  { key: 'prioritySupport', free: false, pro: false, team: true, enterprise: true },
  { key: 'ssoSaml', free: false, pro: false, team: false, enterprise: true },
  { key: 'dedicatedManager', free: false, pro: false, team: false, enterprise: true },
  { key: 'slaGuarantee', free: false, pro: false, team: false, enterprise: true },
];

const PLANS = ['free', 'pro', 'team', 'enterprise'] as const;

function FeatureIcon({ included }: { included: boolean }) {
  return included ? (
    <Check size={16} className="text-green-400" />
  ) : (
    <X size={14} className="text-muted-foreground/30" />
  );
}

function PlanCard({
  plan,
  isPopular,
  t,
}: {
  plan: (typeof PLANS)[number];
  isPopular: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const featureMap: Record<string, boolean> = {};
  for (const f of FEATURES) {
    featureMap[f.key] = f[plan];
  }

  const isEnterprise = plan === 'enterprise';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        isPopular
          ? 'border-indigo-500/50 bg-indigo-500/5'
          : 'border-border/50 bg-card/30'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-medium text-white">
          {t('pricing.popular')}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold">{t(`pricing.plans.${plan}.name`)}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          {isEnterprise ? (
            <span className="text-2xl font-bold">{t('pricing.plans.enterprise.price')}</span>
          ) : (
            <>
              <span className="text-3xl font-bold">
                {t(`pricing.plans.${plan}.price`)}
              </span>
              {plan !== 'free' && (
                <span className="text-sm text-muted-foreground">
                  {t('pricing.perUserMonth')}
                </span>
              )}
            </>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(`pricing.plans.${plan}.description`)}
        </p>
      </div>

      {/* Limits */}
      <div className="mb-4 space-y-2 border-b border-border/30 pb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('pricing.limits.workspaces')}</span>
          <span className="font-medium">{t(`pricing.plans.${plan}.workspaces`)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('pricing.limits.members')}</span>
          <span className="font-medium">{t(`pricing.plans.${plan}.members`)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('pricing.limits.teams')}</span>
          <span className="font-medium">{t(`pricing.plans.${plan}.teams`)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('pricing.limits.fileUpload')}</span>
          <span className="font-medium">{t(`pricing.plans.${plan}.fileUpload`)}</span>
        </div>
      </div>

      {/* Features */}
      <div className="mb-6 flex-1 space-y-2.5">
        {FEATURES.map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-sm">
            <FeatureIcon included={f[plan]} />
            <span
              className={
                f[plan] ? 'text-foreground' : 'text-muted-foreground/40'
              }
            >
              {t(`pricing.features.${f.key}`)}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isEnterprise ? (
        <a
          href="mailto:contact@ito.krow.kr"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          {t('pricing.plans.enterprise.cta')}
        </a>
      ) : (
        <Link
          href="/register"
          className={`inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-medium transition-opacity hover:opacity-90 ${
            isPopular
              ? 'bg-indigo-500 text-white'
              : 'bg-foreground text-background'
          }`}
        >
          {t(`pricing.plans.${plan}.cta`)}
        </Link>
      )}
    </div>
  );
}

export function PricingSection() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="pricing" ref={ref} className="relative py-24 sm:py-32">
      <div
        className={`mx-auto max-w-6xl px-6 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t('pricing.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Early Access Banner */}
        <div className="mb-12 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm">
            <Sparkles size={16} className="text-indigo-400" />
            <span className="text-indigo-300">{t('pricing.earlyAccess')}</span>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              isPopular={plan === 'pro'}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
