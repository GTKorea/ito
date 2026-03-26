'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  UserPlus,
  Check,
  Copy,
  MoreHorizontal,
  Shield,
  Trash2,
  Loader2,
  LogOut,
  Camera,
  Building2,
  AlertTriangle,
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

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  OWNER: 'default',
  ADMIN: 'secondary',
  MEMBER: 'outline',
  GUEST: 'outline',
};

const ALL_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] as const;
const NON_OWNER_ROLES = ['ADMIN', 'MEMBER', 'GUEST'] as const;

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const { currentWorkspace, updateWorkspace, uploadLogo, deleteWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const t = useTranslations('workspaceSettings');
  const tc = useTranslations('common');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [myRole, setMyRole] = useState('MEMBER');

  // Workspace info state
  const [wsName, setWsName] = useState('');
  const [wsDescription, setWsDescription] = useState('');
  const [wsWebsite, setWsWebsite] = useState('');
  const [wsLocation, setWsLocation] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('MEMBER');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Leave state
  const [showLeave, setShowLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Initialize workspace info when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name || '');
      setWsDescription(currentWorkspace.description || '');
      setWsWebsite(currentWorkspace.website || '');
      setWsLocation(currentWorkspace.location || '');
    }
  }, [currentWorkspace]);

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    setMembersLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${currentWorkspace.id}`);
      setMembers(data.members || []);
      const me = data.members?.find((m: WorkspaceMember) => m.user.id === user?.id);
      setMyRole(me?.role || 'MEMBER');
      // Also populate workspace details from full response
      if (data.description !== undefined) setWsDescription(data.description || '');
      if (data.website !== undefined) setWsWebsite(data.website || '');
      if (data.location !== undefined) setWsLocation(data.location || '');
    } catch (error) {
      console.error('Failed to load workspace settings:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentWorkspace]);

  const canManageMembers = myRole === 'OWNER' || myRole === 'ADMIN';
  const isOwner = myRole === 'OWNER';

  const handleSaveInfo = async () => {
    if (!currentWorkspace) return;
    setInfoSaving(true);
    try {
      await updateWorkspace(currentWorkspace.id, {
        name: wsName.trim(),
        description: wsDescription.trim() || undefined,
        website: wsWebsite.trim() || undefined,
        location: wsLocation.trim() || undefined,
      });
      toast.success(t('saved'));
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 409) {
        toast.error(t('nameAlreadyInUse'));
      } else {
        toast.error(t('saveFailed'));
      }
    } finally {
      setInfoSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;
    try {
      await uploadLogo(currentWorkspace.id, file);
      toast.success(t('logoUpdated'));
    } catch {
      toast.error(t('logoUploadFailed'));
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/members/${userId}/role`, {
        role: newRole,
      });
      fetchMembers();
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace) return;
    // If removing self, show confirmation dialog instead
    if (memberId === user?.id) {
      setShowLeave(true);
      return;
    }
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${memberId}`);
      fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspace || !user) return;
    setLeaving(true);
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${user.id}`);
      // Remove from store and switch workspace
      const remaining = useWorkspaceStore.getState().workspaces.filter((ws) => ws.id !== currentWorkspace.id);
      const next = remaining[0] || null;
      if (next) {
        useWorkspaceStore.getState().setCurrentWorkspace(next);
      }
      useWorkspaceStore.setState({ workspaces: remaining, currentWorkspace: next });
      // Reset groups so sidebar updates immediately
      useTaskGroupStore.setState({ groups: [], totalActiveTaskCount: 0 });
      if (next) {
        useTaskGroupStore.getState().fetchGroups(next.id);
      }
      toast.success(t('leftWorkspace'));
      setShowLeave(false);
      router.push('/workspace');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('leaveFailed'));
    } finally {
      setLeaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentWorkspace) return;
    try {
      const { data } = await api.post(`/workspaces/${currentWorkspace.id}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteSent(true);
      if (data.inviteLink) {
        setInviteLink(data.inviteLink);
      }
    } catch (error) {
      console.error('Failed to update workspace:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseInvite = () => {
    setShowInvite(false);
    setInviteEmail('');
    setInviteRole('MEMBER');
    setInviteSent(false);
    setInviteLink('');
    setCopied(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;
    setDeleting(true);
    try {
      await deleteWorkspace(currentWorkspace.id, deleteConfirmName);
      toast.success(t('workspaceDeleted'));
      setShowDelete(false);
      router.push('/workspace');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';

  if (!currentWorkspace) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">{t('noWorkspace')}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="max-w-2xl p-6 space-y-6">
        {/* Workspace Info + Logo */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            {t('workspaceInfo')}
          </h2>

          <div className="flex items-start gap-4">
            {/* Logo */}
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => canManageMembers && logoInputRef.current?.click()}
            >
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-primary flex items-center justify-center">
                {currentWorkspace.avatarUrl ? (
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage
                      src={`${apiUrl}${currentWorkspace.avatarUrl}`}
                      alt={currentWorkspace.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground rounded-lg">
                      {currentWorkspace.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="text-xl font-bold text-primary-foreground">
                    {currentWorkspace.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {canManageMembers && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            {/* Name + Slug */}
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="wsName">{t('workspaceNameLabel')}</Label>
                <Input
                  id="wsName"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  disabled={!canManageMembers}
                />
              </div>
              <p className="text-xs text-muted-foreground">{currentWorkspace.slug}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* About */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t('about')}</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="wsDescription">{t('description')}</Label>
              <textarea
                id="wsDescription"
                value={wsDescription}
                onChange={(e) => setWsDescription(e.target.value)}
                disabled={!canManageMembers}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
                maxLength={500}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wsWebsite">{t('website')}</Label>
                <Input
                  id="wsWebsite"
                  value={wsWebsite}
                  onChange={(e) => setWsWebsite(e.target.value)}
                  disabled={!canManageMembers}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wsLocation">{t('location')}</Label>
                <Input
                  id="wsLocation"
                  value={wsLocation}
                  onChange={(e) => setWsLocation(e.target.value)}
                  disabled={!canManageMembers}
                  placeholder={t('locationPlaceholder')}
                />
              </div>
            </div>

            {canManageMembers && (
              <Button onClick={handleSaveInfo} disabled={infoSaving || !wsName.trim()}>
                {infoSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {tc('save')}
              </Button>
            )}
          </div>
        </section>

        <Separator />

        {/* Members */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{t('members')}</h2>
              {members.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {members.length}
                </Badge>
              )}
            </div>
            {canManageMembers && (
              <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
                <UserPlus className="mr-1 h-4 w-4" />
                {t('invite')}
              </Button>
            )}
          </div>

          {membersLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => {
                const isMe = member.user.id === user?.id;
                const isMemberOwner = member.role === 'OWNER';
                const canChangeRole = canManageMembers && !isMemberOwner && !isMe;
                const canRemove =
                  (canManageMembers && !isMemberOwner && !(myRole === 'ADMIN' && member.role === 'ADMIN')) ||
                  isMe;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/30 transition-colors group"
                  >
                    <Avatar className="h-7 w-7">
                      {member.user.avatarUrl && (
                        <AvatarImage
                          src={`${apiUrl}${member.user.avatarUrl}`}
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
                        {isMe && (
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

                    {(canChangeRole || canRemove) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-all" />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canChangeRole &&
                            (isOwner ? ALL_ROLES : NON_OWNER_ROLES).filter((r) => r !== member.role).map((role) => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => handleRoleChange(member.user.id, role)}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                {t(`role_${role}`)}
                              </DropdownMenuItem>
                            ))}
                          {canRemove && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveMember(member.user.id)}
                            >
                              {isMe ? (
                                <>
                                  <LogOut className="mr-2 h-4 w-4" />
                                  {t('leaveWorkspace')}
                                </>
                              ) : (
                                <>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('removeMember')}
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <Separator />
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">{t('dangerZone')}</h2>
          </div>

          {/* Leave Workspace */}
          <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">{t('leaveWorkspace')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('leaveWorkspaceDescription')}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowLeave(true)}
            >
              <LogOut className="mr-1 h-3.5 w-3.5" />
              {t('leaveWorkspace')}
            </Button>
          </div>

          {/* Delete Workspace - Owner only */}
          {isOwner && (
            <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">{t('deleteWorkspace')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('deleteWorkspaceDescription')}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {t('deleteWorkspace')}
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Invite Dialog */}
      {showInvite && (
        <Dialog open onOpenChange={handleCloseInvite}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {t('inviteTo', { name: currentWorkspace.name })}
              </DialogTitle>
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
                <div className="space-y-2">
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
                      <p className="text-[10px] text-muted-foreground">
                        {t('roleMemberDesc')}
                      </p>
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
                      <p className="text-[10px] text-muted-foreground">
                        {t('roleGuestDesc')}
                      </p>
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
                      <Input readOnly value={inviteLink} className="text-xs" />
                      <Button size="sm" variant="outline" onClick={handleCopyLink}>
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <Button onClick={handleCloseInvite} variant="outline" className="w-full">
                  {tc('done')}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Leave Confirmation Dialog */}
      {showLeave && (
        <Dialog open onOpenChange={() => setShowLeave(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('leaveConfirmTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('leaveConfirmDescription')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowLeave(false)}
                >
                  {tc('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={leaving}
                  onClick={handleLeaveWorkspace}
                >
                  {leaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  {t('leaveConfirmButton')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDelete && (
        <Dialog open onOpenChange={() => { setShowDelete(false); setDeleteConfirmName(''); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-destructive">
                {t('deleteConfirmTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('deleteConfirmDescription', { name: currentWorkspace.name })}
              </p>
              <div className="space-y-2">
                <Label>{t('deleteConfirmInput', { name: currentWorkspace.name })}</Label>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={currentWorkspace.name}
                  autoFocus
                />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                disabled={deleteConfirmName !== currentWorkspace.name || deleting}
                onClick={handleDeleteWorkspace}
              >
                {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {t('deleteConfirmButton')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
