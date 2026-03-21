'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { isTauri } from '@/lib/platform';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore, SUPPORTED_LOCALES, type Locale } from '@/stores/locale-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Check,
  Camera,
  Globe,
  Calendar,
  Bell,
  Unlink,
  Loader2,
  MessageSquare,
  Briefcase,
  Link,
  Plus,
  X,
  Github,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  Dribbble,
  Figma,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { NotificationSettings } from '@/components/settings/notification-settings';

const SOCIAL_PLATFORMS: { value: string; label: string; icon: LucideIcon; placeholder: string }[] = [
  { value: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/username' },
  { value: 'x', label: 'X (Twitter)', icon: Twitter, placeholder: 'https://x.com/username' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/username' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@channel' },
  { value: 'dribbble', label: 'Dribbble', icon: Dribbble, placeholder: 'https://dribbble.com/username' },
  { value: 'behance', label: 'Behance', icon: Figma, placeholder: 'https://behance.net/username' },
  { value: 'figma', label: 'Figma', icon: Figma, placeholder: 'https://figma.com/@username' },
  { value: 'website', label: 'Website', icon: Globe, placeholder: 'https://example.com' },
];

interface CalendarIntegration {
  id: string;
  provider: string;
  syncEnabled: boolean;
  calendarId?: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, uploadAvatar } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  const [name, setName] = useState(user?.name || '');
  const [status, setStatus] = useState(user?.status || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [position, setPosition] = useState(user?.position || '');
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>(
    user?.socialLinks || [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Calendar integrations state
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Desktop detection
  const [isDesktop, setIsDesktop] = useState(false);
  const calendarPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const calendarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slack integration state
  const [slackStatus, setSlackStatus] = useState<{ connected: boolean; teamName?: string } | null>(null);
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackUserLinked, setSlackUserLinked] = useState(false);
  const [slackLinkCode, setSlackLinkCode] = useState<string | null>(null);
  const [slackLinkExpiry, setSlackLinkExpiry] = useState<Date | null>(null);
  const [slackLinkLoading, setSlackLinkLoading] = useState(false);

  // Fetch calendar integrations + Slack status
  useEffect(() => {
    const fetchCalendar = async () => {
      setCalendarLoading(true);
      try {
        const { data } = await api.get('/calendar/integrations');
        setCalendarIntegrations(data);
      } catch {
        // Calendar API may not be available
      } finally {
        setCalendarLoading(false);
      }
    };
    fetchCalendar();
  }, []);

  useEffect(() => {
    setIsDesktop(isTauri());
    return () => {
      if (calendarPollRef.current) clearInterval(calendarPollRef.current);
      if (calendarTimeoutRef.current) clearTimeout(calendarTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const fetchSlack = async () => {
      setSlackLoading(true);
      try {
        const { data } = await api.get(`/slack/status?workspaceId=${currentWorkspace.id}`);
        setSlackStatus(data);
        if (data.connected) {
          const { data: linkData } = await api.get(`/slack/user-link-status?workspaceId=${currentWorkspace.id}`);
          setSlackUserLinked(linkData.linked);
        }
      } catch {
        setSlackStatus({ connected: false });
      } finally {
        setSlackLoading(false);
      }
    };
    fetchSlack();
  }, [currentWorkspace?.id]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const validLinks = socialLinks.filter((l) => l.platform && l.url);
      await api.patch('/users/me', {
        name,
        status: status || null,
        bio: bio || null,
        position: position || null,
        socialLinks: validLinks.length > 0 ? validLinks : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: '', url: '' }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const handleConnectSlack = () => {
    if (!currentWorkspace?.id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';
    window.location.href = `${apiUrl}/slack/install?workspaceId=${currentWorkspace.id}`;
  };

  const handleGenerateLinkCode = async () => {
    if (!currentWorkspace?.id) return;
    setSlackLinkLoading(true);
    try {
      const { data } = await api.post(`/slack/link-code?workspaceId=${currentWorkspace.id}`);
      setSlackLinkCode(data.code);
      setSlackLinkExpiry(new Date(data.expiresAt));
    } catch (error) {
      console.error('Failed to generate link code:', error);
    } finally {
      setSlackLinkLoading(false);
    }
  };

  const handleUnlinkSlack = async () => {
    if (!currentWorkspace?.id) return;
    try {
      await api.delete(`/slack/unlink?workspaceId=${currentWorkspace.id}`);
      setSlackUserLinked(false);
      setSlackLinkCode(null);
    } catch (error) {
      console.error('Failed to unlink Slack:', error);
    }
  };

  const handleConnectCalendar = async (provider: 'google' | 'outlook') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';
    const token = localStorage.getItem('accessToken');

    if (isDesktop) {
      // Desktop: open external browser + poll for result
      const state = crypto.randomUUID();
      try {
        const res = await fetch(
          `${apiUrl}/calendar/${provider}/init?token=${token}&state=${state}`,
        );
        if (!res.ok) throw new Error('Failed to init calendar OAuth');
        const { url } = await res.json();
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);

        // Poll for result
        calendarPollRef.current = setInterval(async () => {
          try {
            const r = await fetch(
              `${apiUrl}/calendar/oauth-result?state=${state}`,
            );
            if (r.ok) {
              if (calendarPollRef.current)
                clearInterval(calendarPollRef.current);
              // Refresh integrations list
              const intRes = await api.get('/calendar/integrations');
              setCalendarIntegrations(intRes.data);
            }
          } catch {
            /* not ready yet */
          }
        }, 2000);

        // Stop after 5 minutes
        calendarTimeoutRef.current = setTimeout(() => {
          if (calendarPollRef.current) clearInterval(calendarPollRef.current);
        }, 5 * 60 * 1000);
      } catch {
        // Fallback to web flow
        window.location.href = `${apiUrl}/calendar/${provider}/connect?token=${token}`;
      }
    } else {
      window.location.href = `${apiUrl}/calendar/${provider}/connect?token=${token}`;
    }
  };

  const handleDisconnectCalendar = async (integrationId: string) => {
    setDisconnecting(integrationId);
    try {
      await api.delete(`/calendar/integrations/${integrationId}`);
      setCalendarIntegrations((prev) => prev.filter((c) => c.id !== integrationId));
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
    } finally {
      setDisconnecting(null);
    }
  };

  const isCalendarConnected = (provider: string) =>
    calendarIntegrations.some((c) => c.provider === provider);

  const getCalendarIntegration = (provider: string) =>
    calendarIntegrations.find((c) => c.provider === provider);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-lg p-6 space-y-8">
        {/* Profile */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t('profile')}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <Avatar className="h-14 w-14">
                {user?.avatarUrl && (
                  <AvatarImage
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011'}${user.avatarUrl}`}
                    alt={user.name}
                  />
                )}
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await uploadAvatar(file);
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t('displayName')}</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <Label htmlFor="status">{t('status')}</Label>
            </div>
            <Input
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder={t('statusPlaceholder')}
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">{t('bio')}</Label>
              <span className="text-[10px] text-muted-foreground">
                {t('bioCharCount', { count: bio.length })}
              </span>
            </div>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder={t('bioPlaceholder')}
              maxLength={200}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <Label htmlFor="position">{t('position')}</Label>
            </div>
            <Input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t('positionPlaceholder')}
              maxLength={100}
            />
          </div>

          {/* Social Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="h-3.5 w-3.5 text-muted-foreground" />
                <Label>{t('socialLinks')}</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={addSocialLink}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('addSocialLink')}
              </Button>
            </div>
            {socialLinks.map((link, index) => {
              const selectedPlatform = SOCIAL_PLATFORMS.find((p) => p.value === link.platform);
              const usedPlatforms = socialLinks
                .filter((_, i) => i !== index)
                .map((l) => l.platform);
              return (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={link.platform}
                    onValueChange={(val: string) => updateSocialLink(index, 'platform', val)}
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue placeholder={t('platformPlaceholder')}>
                        {selectedPlatform ? (
                          <span className="flex items-center gap-2">
                            <selectedPlatform.icon className="h-3.5 w-3.5" />
                            {selectedPlatform.label}
                          </span>
                        ) : (
                          t('platformPlaceholder')
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <SelectItem
                          key={platform.value}
                          value={platform.value}
                          disabled={usedPlatforms.includes(platform.value)}
                        >
                          <span className="flex items-center gap-2">
                            <platform.icon className="h-3.5 w-3.5" />
                            {platform.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={link.url}
                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                    placeholder={selectedPlatform?.placeholder || t('urlPlaceholder')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSocialLink(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {saved ? <Check className="h-4 w-4 mr-1" /> : null}
            {saved ? tc('save') : isSaving ? t('savingProfile') : tc('save')}
          </Button>
        </section>

        <Separator />

        {/* Language */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t('language')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('languageDescription')}
          </p>
          <Select
            value={locale}
            onValueChange={(val: Locale) => setLocale(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(() => {
                  const current = SUPPORTED_LOCALES.find((l) => l.value === locale);
                  return current ? `${current.nativeLabel} — ${current.label}` : locale;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{loc.nativeLabel}</span>
                    <span className="text-muted-foreground text-xs">{loc.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <Separator />

        {/* Calendar Integrations */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t('calendarIntegrations')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('calendarDescription')}
          </p>

          {calendarLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Google Calendar */}
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-red-500/10">
                    <Calendar className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('googleCalendar')}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isCalendarConnected('google') ? t('connected') : t('notConnected')}
                    </p>
                  </div>
                </div>
                {isCalendarConnected('google') ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const integration = getCalendarIntegration('google');
                      if (integration) handleDisconnectCalendar(integration.id);
                    }}
                    disabled={disconnecting === getCalendarIntegration('google')?.id}
                  >
                    {disconnecting === getCalendarIntegration('google')?.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlink className="mr-1 h-3.5 w-3.5" />
                    )}
                    {t('disconnect')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnectCalendar('google')}
                  >
                    {t('connectCalendar')}
                  </Button>
                )}
              </div>

              {/* Outlook Calendar */}
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                    <Calendar className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('outlookCalendar')}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isCalendarConnected('outlook') ? t('connected') : t('notConnected')}
                    </p>
                  </div>
                </div>
                {isCalendarConnected('outlook') ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const integration = getCalendarIntegration('outlook');
                      if (integration) handleDisconnectCalendar(integration.id);
                    }}
                    disabled={disconnecting === getCalendarIntegration('outlook')?.id}
                  >
                    {disconnecting === getCalendarIntegration('outlook')?.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlink className="mr-1 h-3.5 w-3.5" />
                    )}
                    {t('disconnect')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnectCalendar('outlook')}
                  >
                    {t('connectCalendar')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>

        <Separator />

        {/* Slack Integration */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t('slackIntegration')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('slackDescription')}
          </p>

          {/* Workspace-level Slack connection */}
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-500/10">
                <Hash className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Slack</p>
                <p className="text-[10px] text-muted-foreground">
                  {slackLoading
                    ? '...'
                    : slackStatus?.connected
                      ? t('slackConnected', { team: slackStatus.teamName || 'Slack' })
                      : t('slackDisconnected')}
                </p>
              </div>
            </div>
            {!slackStatus?.connected && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleConnectSlack}
                disabled={slackLoading || !currentWorkspace}
              >
                {t('addToSlack')}
              </Button>
            )}
            {slackStatus?.connected && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <Check className="h-3.5 w-3.5" />
                {t('connected')}
              </div>
            )}
          </div>

          {/* User-level Slack account linking */}
          {slackStatus?.connected && (
            <div className="rounded-md border border-border px-3 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('slackAccountLink')}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {slackUserLinked
                      ? t('slackAccountLinked')
                      : t('slackAccountNotLinked')}
                  </p>
                </div>
                {slackUserLinked ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={handleUnlinkSlack}
                  >
                    <Unlink className="mr-1 h-3.5 w-3.5" />
                    {t('disconnect')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateLinkCode}
                    disabled={slackLinkLoading}
                  >
                    {slackLinkLoading ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link className="mr-1 h-3.5 w-3.5" />
                    )}
                    {t('slackGenerateCode')}
                  </Button>
                )}
              </div>

              {slackLinkCode && !slackUserLinked && (
                <div className="rounded-md bg-muted/50 px-3 py-2.5 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    {t('slackLinkInstruction')}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-background px-2 py-1 text-sm font-mono font-bold tracking-widest">
                      /ito link {slackLinkCode}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`/ito link ${slackLinkCode}`);
                      }}
                    >
                      {t('copy')}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('slackCodeExpiry')}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <Separator />

        {/* Notification Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t('notificationSettings')}</h2>
          </div>
          <NotificationSettings />
        </section>
      </div>
    </div>
  );
}
