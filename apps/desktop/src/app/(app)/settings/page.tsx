'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore, SUPPORTED_LOCALES } from '@/stores/locale-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Check,
  Camera,
  Globe,
  Calendar,
  Unlink,
  Loader2,
} from 'lucide-react';

interface CalendarIntegration {
  id: string;
  provider: string;
  syncEnabled: boolean;
  calendarId?: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, uploadAvatar } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Calendar integrations state
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Fetch calendar integrations
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

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.patch('/users/me', { name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectCalendar = (provider: 'google' | 'outlook') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';
    const token = localStorage.getItem('accessToken');
    window.location.href = `${apiUrl}/calendar/${provider}/connect?token=${token}`;
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
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
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
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving || name === user?.name}
              >
                {saved ? <Check className="h-4 w-4" /> : isSaving ? t('savingProfile') : tc('save')}
              </Button>
            </div>
          </div>
        </section>

        <Separator />

        {/* Language */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t('language')}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('languageDescription')}
          </p>
          <div className="grid grid-cols-1 gap-1">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc.value}
                onClick={() => setLocale(loc.value)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  locale === loc.value
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex-1 text-left">
                  <p className="font-medium">{loc.nativeLabel}</p>
                  <p className="text-[10px] text-muted-foreground">{loc.label}</p>
                </div>
                {locale === loc.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
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
      </div>
    </div>
  );
}
