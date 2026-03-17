'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => navigate('/workspace')}>
            <Plus className="mr-2 h-4 w-4" />
            Create new todo
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate('/workspace')}>
            <CheckSquare className="mr-2 h-4 w-4" />
            My Todos
          </CommandItem>
          <CommandItem onSelect={() => navigate('/threads')}>
            <Link2 className="mr-2 h-4 w-4" />
            Threads
          </CommandItem>
          <CommandItem onSelect={() => navigate('/teams')}>
            <Users className="mr-2 h-4 w-4" />
            Teams
          </CommandItem>
          <CommandItem onSelect={() => navigate('/notifications')}>
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </CommandItem>
          <CommandItem onSelect={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
