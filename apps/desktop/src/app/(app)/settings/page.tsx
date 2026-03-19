'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useLocaleStore, SUPPORTED_LOCALES } from '@/stores/locale-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Building2,
  UserPlus,
  Check,
  Camera,
  Copy,
  Globe,
  Calendar,
  Users,
  Unlink,
  Loader2,
} from 'lucide-react';

interface WorkspaceMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

interface CalendarIntegration {
  id: string;
  provider: string;
  syncEnabled: boolean;
  calendarId?: string;
  createdAt: string;
}

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  ADMIN: 'secondary',
  MEMBER: 'outline',
  GUEST: 'outline',
};

export default function SettingsPage() {
  const { user, uploadAvatar } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspace, workspaces, setCurrentWorkspace, createWorkspace } =
    useWorkspaceStore();
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'GUEST'>('MEMBER');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Members state
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Calendar integrations state
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Fetch members when workspace changes
  useEffect(() => {
    if (!currentWorkspace) {
      setMembers([]);
      return;
    }
    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const { data } = await api.get(`/workspaces/${currentWorkspace.id}`);
        setMembers(data.members || []);
      } catch {
        // ignore
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [currentWorkspace?.id]);

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
    } catch {
      // handle
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!wsName.trim()) return;
    const slug = wsSlug.trim() || wsName.toLowerCase().replace(/\s+/g, '-');
    await createWorkspace(wsName, slug);
    setWsName('');
    setWsSlug('');
    setShowCreateWs(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentWorkspace) return;
    try {
      const res = await api.post(`/workspaces/${currentWorkspace.id}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteSent(true);
      setInviteLink(res.data.inviteLink);
    } catch {
      // handle
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseInvite = () => {
    setShowInvite(false);
    setInviteSent(false);
    setInviteEmail('');
    setInviteRole('MEMBER');
    setInviteLink(null);
    setCopied(false);
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
    } catch {
      // handle
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

        <Separator />

        {/* Workspace */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{t('workspaces')}</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowCreateWs(true)}>
              <Building2 className="mr-1 h-3.5 w-3.5" />
              {tc('new')}
            </Button>
          </div>

          <div className="space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  currentWorkspace?.id === ws.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{ws.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ws.slug}</p>
                </div>
                {currentWorkspace?.id === ws.id && (
                  <Badge variant="secondary" className="text-[10px]">
                    {tc('current')}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {currentWorkspace && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowInvite(true)}
            >
              <UserPlus className="mr-1 h-3.5 w-3.5" />
              {t('inviteTo', { name: currentWorkspace.name })}
            </Button>
          )}
        </section>

        <Separator />

        {/* Members */}
        {currentWorkspace && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{t('members')}</h2>
              {members.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {members.length}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('membersDescription', { name: currentWorkspace.name })}
            </p>

            {membersLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/30 transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      {member.user.avatarUrl && (
                        <AvatarImage
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011'}${member.user.avatarUrl}`}
                          alt={member.user.name}
                        />
                      )}
                      <AvatarFallback className="text-[10px] bg-secondary">
                        {member.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {member.user.name}
                        </span>
                        {member.user.id === user?.id && (
                          <span className="text-[10px] text-muted-foreground">
                            ({t('you')})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {member.user.email}
                      </p>
                    </div>
                    <Badge
                      variant={ROLE_BADGE_VARIANT[member.role] || 'outline'}
                      className="text-[10px] shrink-0"
                    >
                      {t(`role_${member.role}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Create Workspace Dialog */}
      {showCreateWs && (
        <Dialog open onOpenChange={() => setShowCreateWs(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('workspaces')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t('workspaceName')}</Label>
                <Input
                  placeholder={t('workspaceNamePlaceholder')}
                  value={wsName}
                  onChange={(e) => {
                    setWsName(e.target.value);
                    setWsSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('slug')}</Label>
                <Input
                  placeholder={t('slugPlaceholder')}
                  value={wsSlug}
                  onChange={(e) => setWsSlug(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateWorkspace} className="w-full" disabled={!wsName.trim()}>
                {tc('create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Dialog */}
      {showInvite && (
        <Dialog open onOpenChange={handleCloseInvite}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('inviteTo', { name: currentWorkspace?.name || '' })}</DialogTitle>
            </DialogHeader>
            {!inviteSent ? (
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder={t('invitePlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  autoFocus
                />

                {/* Role selector */}
                <div className="space-y-1.5">
                  <Label>{t('inviteRole')}</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setInviteRole('MEMBER')}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        inviteRole === 'MEMBER'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-accent/50'
                      }`}
                    >
                      <p className="font-medium">{t('role_MEMBER')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('roleMemberDesc')}</p>
                    </button>
                    <button
                      onClick={() => setInviteRole('GUEST')}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        inviteRole === 'GUEST'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-accent/50'
                      }`}
                    >
                      <p className="font-medium">{t('role_GUEST')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('roleGuestDesc')}</p>
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleInvite}
                  className="w-full"
                  disabled={!inviteEmail.trim()}
                >
                  <UserPlus className="mr-1 h-4 w-4" /> {t('sendInvite')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <Check className="h-4 w-4" />
                  <span>{t('inviteSentTo', { email: inviteEmail })}</span>
                </div>
                {inviteLink && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t('shareLinkWithInvitee')}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={inviteLink}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyLink}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleCloseInvite}
                  variant="outline"
                  className="w-full"
                >
                  {tc('done')}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
