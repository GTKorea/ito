'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSharedSpaceStore } from '@/stores/shared-space-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Globe,
  Plus,
  Users,
  CheckSquare,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SharedSpaceDetail } from '@/components/shared-spaces/shared-space-detail';

export default function SharedSpacesPage() {
  const {
    sharedSpaces,
    isLoading,
    fetchSharedSpaces,
    createSharedSpace,
    inviteWorkspace,
    acceptInvite,
  } = useSharedSpaceStore();
  const { currentWorkspace } = useWorkspaceStore();
  const searchParams = useSearchParams();
  const t = useTranslations('sharedSpaces');
  const tc = useTranslations('common');

  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [inviteSlug, setInviteSlug] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      fetchSharedSpaces();
    }
  }, [currentWorkspace, fetchSharedSpaces]);

  // Handle invite token from URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && !joining) {
      setJoining(true);
      acceptInvite(token)
        .then(() => {
          setJoining(false);
        })
        .catch(() => {
          setJoining(false);
        });
    }
  }, [searchParams, acceptInvite, joining]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const space = await createSharedSpace(newName, newDescription || undefined);
    setNewName('');
    setNewDescription('');
    setShowCreate(false);
    setSelectedSpaceId(space.id);
  };

  const handleInvite = async () => {
    if (!inviteSlug.trim() || !showInvite) return;
    try {
      const result = await inviteWorkspace(showInvite, inviteSlug);
      setInviteLink(result.inviteLink);
      setInviteSlug('');
    } catch {
      // handle error
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (selectedSpaceId) {
    return (
      <SharedSpaceDetail
        sharedSpaceId={selectedSpaceId}
        onBack={() => setSelectedSpaceId(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('newSharedSpace')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : sharedSpaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Globe className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{t('noSpacesYet')}</p>
            <p className="text-xs mt-1">{t('noSpacesDescription')}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowCreate(true)}
            >
              {t('createFirst')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {sharedSpaces.map((space) => (
              <div
                key={space.id}
                className="rounded-lg border border-border bg-card p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => setSelectedSpaceId(space.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{space.name}</h3>
                      {space.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {space.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                </div>

                <div className="flex items-center gap-4 mt-3">
                  {/* Participant workspace avatars */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {space.participants.slice(0, 4).map((p) => (
                        <Avatar key={p.id} className="h-5 w-5 border border-background">
                          <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                            {p.workspace.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {space._count?.participants || 0} {t('workspaces')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckSquare className="h-3 w-3" />
                    {space._count?.todos || 0} {t('todos')}
                  </div>
                </div>

                {/* Participant badges */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {space.participants.map((p) => (
                    <Badge
                      key={p.id}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {p.workspace.name}
                      {p.role === 'OWNER' && (
                        <span className="ml-1 text-primary">*</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Shared Space Dialog */}
      {showCreate && (
        <Dialog open onOpenChange={() => setShowCreate(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('createSharedSpace')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t('spaceName')}</Label>
                <Input
                  placeholder={t('spaceNamePlaceholder')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('descriptionOptional')}</Label>
                <Textarea
                  placeholder={t('descriptionPlaceholder')}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>
                {tc('create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Workspace Dialog */}
      {showInvite && (
        <Dialog open onOpenChange={() => { setShowInvite(null); setInviteLink(''); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('inviteWorkspace')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {!inviteLink ? (
                <>
                  <div className="space-y-1.5">
                    <Label>{t('workspaceSlug')}</Label>
                    <Input
                      placeholder={t('workspaceSlugPlaceholder')}
                      value={inviteSlug}
                      onChange={(e) => setInviteSlug(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                      autoFocus
                    />
                  </div>
                  <Button onClick={handleInvite} className="w-full" disabled={!inviteSlug.trim()}>
                    {t('sendInvite')}
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('inviteSent')}</p>
                  <div className="flex items-center gap-2">
                    <Input value={inviteLink} readOnly className="text-xs" />
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
