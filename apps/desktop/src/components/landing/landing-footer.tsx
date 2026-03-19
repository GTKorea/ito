'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function LandingFooter() {
  const t = useTranslations('landing');

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between">
        {/* Logo + Copyright */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
            糸
          </div>
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ito
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('footer.privacy')}
          </Link>
          <Link
            href="/terms-of-service"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('footer.terms')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
