'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Globe, Menu, X, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocaleStore, SUPPORTED_LOCALES } from '@/stores/locale-store';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('landing');
  const { locale, setLocale } = useLocaleStore();

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">
            糸
          </div>
          <span className="text-lg font-semibold tracking-tight">ito</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          <button
            onClick={() => scrollTo('features')}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.features')}
          </button>
          <button
            onClick={() => scrollTo('integrations')}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.integrations')}
          </button>
          <button
            onClick={() => scrollTo('pricing')}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.pricing')}
          </button>
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Language Switcher */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Change language"
            >
              <Globe size={18} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-border bg-background/95 py-1 shadow-xl backdrop-blur-xl">
                {SUPPORTED_LOCALES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => {
                      setLocale(l.value);
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                      locale === l.value ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{l.nativeLabel}</span>
                    {locale === l.value && <Check size={14} className="text-foreground" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.login')}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {t('nav.getStarted')}
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-b border-border bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            <button
              onClick={() => scrollTo('features')}
              className="rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('nav.features')}
            </button>
            <button
              onClick={() => scrollTo('integrations')}
              className="rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('nav.integrations')}
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('nav.pricing')}
            </button>
            <div className="my-2 h-px bg-border" />
            {/* Mobile Language Selector */}
            <div className="px-3 py-2">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                <Globe size={14} />
                <span>Language</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTED_LOCALES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLocale(l.value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                      locale === l.value
                        ? 'bg-foreground text-background font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {l.nativeLabel}
                  </button>
                ))}
              </div>
            </div>
            <div className="my-2 h-px bg-border" />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('nav.login')}
            </Link>
            <Link
              href="/register"
              className="mt-1 rounded-lg bg-foreground px-3 py-2.5 text-center text-sm font-medium text-background"
            >
              {t('nav.getStarted')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
