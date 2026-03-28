'use client';

import { useState } from 'react';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  '#6B7280', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

interface TagManagerProps {
  groupId: string;
}

export function TagManager({ groupId }: TagManagerProps) {
  const t = useTranslations('groups');
  const { tags, createTag, updateTag, deleteTag } = useTaskGroupStore();
  const groupTags = tags[groupId] || [];

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createTag(groupId, newName.trim(), newColor);
      setNewName('');
      setNewColor(COLOR_PRESETS[0]);
    } catch {
      toast.error('Failed to create tag');
    }
  };

  const handleUpdate = async (tagId: string) => {
    try {
      await updateTag(tagId, { name: editName.trim() || undefined, color: editColor || undefined });
      setEditingId(null);
    } catch {
      toast.error('Failed to update tag');
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await deleteTag(tagId, groupId);
    } catch {
      toast.error('Failed to delete tag');
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('manageTags')}</h4>

      {/* Existing tags */}
      <div className="space-y-1">
        {groupTags.map((tag) => (
          <div key={tag.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50">
            {editingId === tag.id ? (
              <>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-5 w-5 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 text-xs flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                  autoFocus
                />
                <button onClick={() => handleUpdate(tag.id)} className="text-green-400 hover:opacity-70">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-70">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="flex-1 truncate">{tag.name}</span>
                <button
                  onClick={() => { setEditingId(tag.id); setEditName(tag.name); setEditColor(tag.color); }}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Color presets */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className={cn(
                'h-5 w-5 rounded-full border-2 transition-colors',
                newColor === color ? 'border-foreground' : 'border-transparent',
              )}
              style={{ backgroundColor: color }}
              onClick={() => setNewColor(color)}
            />
          ))}
        </div>
      </div>

      {/* Add new tag */}
      <div className="flex gap-2">
        <Input
          placeholder={t('tagName')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="h-7 text-xs flex-1"
        />
        <Button size="sm" variant="ghost" onClick={handleCreate} disabled={!newName.trim()} className="h-7 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
