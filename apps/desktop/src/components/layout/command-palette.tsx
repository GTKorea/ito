'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  CheckSquare,
  Link2,
  Users,
  Bell,
  Settings,
  Plus,
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('commandPalette');
  const tc = useTranslations('common');
  const ts = useTranslations('sidebar');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('placeholder')} />
      <CommandList>
        <CommandEmpty>{tc('noResults')}</CommandEmpty>
        <CommandGroup heading={t('actions')}>
          <CommandItem onSelect={() => {
            navigate('/workspace');
            setOpen(false);
            // Focus the quick input after navigation
            setTimeout(() => {
              const quickInput = document.querySelector<HTMLInputElement>(
                '[data-quick-input]',
              );
              quickInput?.focus();
            }, 100);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createNewTask')}
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading={t('navigation')}>
          <CommandItem onSelect={() => navigate('/workspace')}>
            <CheckSquare className="mr-2 h-4 w-4" />
            {ts('myTasks')}
          </CommandItem>
          <CommandItem onSelect={() => navigate('/threads')}>
            <Link2 className="mr-2 h-4 w-4" />
            {ts('threads')}
          </CommandItem>
          <CommandItem onSelect={() => navigate('/teams')}>
            <Users className="mr-2 h-4 w-4" />
            {ts('teams')}
          </CommandItem>
          <CommandItem onSelect={() => navigate('/notifications')}>
            <Bell className="mr-2 h-4 w-4" />
            {ts('notifications')}
          </CommandItem>
          <CommandItem onSelect={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            {ts('settings')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
