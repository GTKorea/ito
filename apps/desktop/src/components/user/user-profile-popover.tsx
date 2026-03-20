'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfileStore, type UserProfile } from '@/stores/user-profile-store';
import {
  Github,
  Twitter,
  Linkedin,
  Globe,
  Link,
  Mail,
  Loader2,
} from 'lucide-react';

interface UserProfilePopoverProps {
  userId: string;
  children: ReactNode;
}

const platformIcons: Record<string, React.ElementType> = {
  github: Github,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
  website: Globe,
};

function getPlatformIcon(platform: string) {
  const key = platform.toLowerCase();
  return platformIcons[key] || Link;
}

export function UserProfilePopover({ userId, children }: UserProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState(false);
  const { fetchProfile, profiles, loading } = useUserProfileStore();
  const t = useTranslations('userProfile');
  const isLoading = loading[userId];

  useEffect(() => {
    if (!open) return;

    // Check cache first
    const cached = profiles[userId];
    if (cached) {
      setProfile(cached.profile);
    }

    fetchProfile(userId)
      .then((p) => setProfile(p))
      .catch(() => setError(true));
  }, [open, userId, fetchProfile, profiles]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button type="button" className="cursor-pointer" />
        }
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        sideOffset={8}
        className="w-72 p-0 bg-[#1A1A1A] border-white/10"
      >
        {isLoading && !profile ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error && !profile ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('loading')}
          </div>
        ) : profile ? (
          <ProfileContent profile={profile} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ProfileContent({ profile }: { profile: UserProfile }) {
  const t = useTranslations('userProfile');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';

  return (
    <div className="space-y-3">
      {/* Header with avatar */}
      <div className="flex items-center gap-3 p-4 pb-0">
        <Avatar className="h-14 w-14">
          {profile.avatarUrl && (
            <AvatarImage
              src={`${apiUrl}${profile.avatarUrl}`}
              alt={profile.name}
            />
          )}
          <AvatarFallback className="text-lg bg-primary text-primary-foreground">
            {profile.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{profile.name}</p>
          {profile.position && (
            <p className="text-xs text-muted-foreground truncate">
              {profile.position}
            </p>
          )}
        </div>
      </div>

      {/* Status */}
      {profile.status && (
        <div className="mx-4 flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
          <span className="text-xs text-foreground truncate">{profile.status}</span>
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <div className="px-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {profile.bio}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Email */}
      <div className="px-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{profile.email}</span>
      </div>

      {/* Social Links */}
      {profile.socialLinks && profile.socialLinks.length > 0 && (
        <div className="px-4 pb-1 flex flex-wrap gap-1.5">
          {profile.socialLinks.map((link, index) => {
            const Icon = getPlatformIcon(link.platform);
            return (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <Icon className="h-3 w-3" />
                {link.platform}
              </a>
            );
          })}
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-1" />
    </div>
  );
}
