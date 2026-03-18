'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
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
import { User, Building2, UserPlus, Check, Camera, Copy, Link } from 'lucide-react';
import { useRef } from 'react';

export default function SettingsPage() {
  const { user, uploadAvatar } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { currentWorkspace, workspaces, setCurrentWorkspace, createWorkspace } =
    useWorkspaceStore();

  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground">
            Manage your profile and workspace
          </p>
        </div>
      </div>

      <div className="max-w-lg p-6 space-y-8">
        {/* Profile */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Profile</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <Avatar className="h-14 w-14">
                {user?.avatarUrl && (
                  <AvatarImage
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${user.avatarUrl}`}
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
            <Label htmlFor="name">Display Name</Label>
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
                {saved ? <Check className="h-4 w-4" /> : isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </section>

        <Separator />

        {/* Workspace */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Workspaces</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowCreateWs(true)}>
              <Building2 className="mr-1 h-3.5 w-3.5" />
              New
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
                    Current
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
              Invite to {currentWorkspace.name}
            </Button>
          )}
        </section>
      </div>

      {/* Create Workspace Dialog */}
      {showCreateWs && (
        <Dialog open onOpenChange={() => setShowCreateWs(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Workspace Name</Label>
                <Input
                  placeholder="My Team"
                  value={wsName}
                  onChange={(e) => {
                    setWsName(e.target.value);
                    setWsSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  placeholder="my-team"
                  value={wsSlug}
                  onChange={(e) => setWsSlug(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateWorkspace} className="w-full" disabled={!wsName.trim()}>
                Create Workspace
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
              <DialogTitle>Invite to {currentWorkspace?.name}</DialogTitle>
            </DialogHeader>
            {!inviteSent ? (
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  autoFocus
                />
                <Button
                  onClick={handleInvite}
                  className="w-full"
                  disabled={!inviteEmail.trim()}
                >
                  <UserPlus className="mr-1 h-4 w-4" /> Send Invite
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <Check className="h-4 w-4" />
                  <span>Invite sent to {inviteEmail}</span>
                </div>
                {inviteLink && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Share this link with the invitee:
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
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
