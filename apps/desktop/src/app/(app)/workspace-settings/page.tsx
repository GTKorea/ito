'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
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

const ROLES = ['ADMIN', 'MEMBER', 'GUEST'] as const;

export default function WorkspaceSettingsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const t = useTranslations('workspaceSettings');
  const tc = useTranslations('common');

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [myRole, setMyRole] = useState('MEMBER');

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('MEMBER');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    setMembersLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${currentWorkspace.id}`);
      setMembers(data.members || []);
      const me = data.members?.find((m: WorkspaceMember) => m.user.id === user?.id);
      setMyRole(me?.role || 'MEMBER');
    } catch {
      // handle
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentWorkspace]);

  const canManageMembers = myRole === 'OWNER' || myRole === 'ADMIN';

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/members/${userId}/role`, {
        role: newRole,
      });
      fetchMembers();
    } catch {
      // handle
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${userId}`);
      fetchMembers();
    } catch {
      // handle
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
    } catch {
      // handle
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

  if (!currentWorkspace) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">{t('noWorkspace')}</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        {canManageMembers && (
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            {t('invite')}
          </Button>
        )}
      </div>

      <div className="max-w-2xl p-6 space-y-6">
        {/* Workspace Info */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            {t('workspaceInfo')}
          </h2>
          <div className="flex items-center gap-4 rounded-lg border border-border p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{currentWorkspace.name}</p>
              <p className="text-xs text-muted-foreground">{currentWorkspace.slug}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Members */}
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

          {membersLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => {
                const isMe = member.user.id === user?.id;
                const isOwner = member.role === 'OWNER';
                const canChangeRole = canManageMembers && !isOwner && !isMe;
                const canRemove =
                  (canManageMembers && !isOwner && !(myRole === 'ADMIN' && member.role === 'ADMIN')) ||
                  isMe;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/30 transition-colors group"
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
                            ROLES.filter((r) => r !== member.role).map((role) => (
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
    </div>
  );
}
