'use client';

import { HeroSection } from '@/components/landing/hero-section';
import { ThreadDemoSection } from '@/components/landing/thread-demo-section';
import { QuickInputSection } from '@/components/landing/quick-input-section';
import { GraphSection } from '@/components/landing/graph-section';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { IntegrationsSection } from '@/components/landing/integrations-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { StatsSection } from '@/components/landing/stats-section';
import { CTASection } from '@/components/landing/cta-section';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ThreadDemoSection />
      <QuickInputSection />
      <GraphSection />
      <FeaturesGrid />
      <IntegrationsSection />
      <PricingSection />
      <StatsSection />
      <CTASection />
    </>
  );
}
