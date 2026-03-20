'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationPreference {
  type: string;
  inApp: boolean;
  email: boolean;
  slack: boolean;
  slackWebhookUrl: string | null;
}

const NOTIFICATION_TYPES = [
  'THREAD_RECEIVED',
  'THREAD_SNAPPED',
  'THREAD_COMPLETED',
  'WORKSPACE_INVITE',
  'TODO_ASSIGNED',
  'TODO_COMPLETED',
] as const;

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const t = useTranslations('notificationSettings');

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications/preferences');
      setPreferences(data);
    } catch {
      // API may not be available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = async (
    type: string,
    field: 'inApp' | 'email' | 'slack',
    value: boolean,
  ) => {
    const updated = preferences.map((p) =>
      p.type === type ? { ...p, [field]: value } : p,
    );
    setPreferences(updated);

    setSaving(true);
    try {
      const pref = updated.find((p) => p.type === type)!;
      await api.put('/notifications/preferences', {
        preferences: [
          {
            type: pref.type,
            inApp: pref.inApp,
            email: pref.email,
            slack: pref.slack,
            slackWebhookUrl: pref.slackWebhookUrl,
          },
        ],
      });
    } catch {
      // Revert on failure
      fetchPreferences();
    } finally {
      setSaving(false);
    }
  };

  const updateWebhookUrl = async (type: string, url: string) => {
    const updated = preferences.map((p) =>
      p.type === type ? { ...p, slackWebhookUrl: url } : p,
    );
    setPreferences(updated);
  };

  const saveWebhookUrl = async (type: string) => {
    const pref = preferences.find((p) => p.type === type);
    if (!pref) return;

    setSaving(true);
    try {
      await api.put('/notifications/preferences', {
        preferences: [
          {
            type: pref.type,
            inApp: pref.inApp,
            email: pref.email,
            slack: pref.slack,
            slackWebhookUrl: pref.slackWebhookUrl,
          },
        ],
      });
    } catch {
      fetchPreferences();
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = (type: string): string => {
    return t(`types.${type}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t('description')}
      </p>

      {/* Header row */}
      <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        <div>{t('type')}</div>
        <div className="text-center">{t('inApp')}</div>
        <div className="text-center">{t('email')}</div>
        <div className="text-center">{t('slack')}</div>
      </div>

      {/* Preference rows */}
      <div className="space-y-1">
        {preferences.map((pref) => (
          <div key={pref.type}>
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center rounded-md border border-border px-3 py-2.5">
              <div className="text-sm">{typeLabel(pref.type)}</div>

              <div className="flex justify-center">
                <ToggleButton
                  checked={pref.inApp}
                  onChange={(v) => updatePreference(pref.type, 'inApp', v)}
                />
              </div>
              <div className="flex justify-center">
                <ToggleButton
                  checked={pref.email}
                  onChange={(v) => updatePreference(pref.type, 'email', v)}
                />
              </div>
              <div className="flex justify-center">
                <ToggleButton
                  checked={pref.slack}
                  onChange={(v) => updatePreference(pref.type, 'slack', v)}
                />
              </div>
            </div>

            {/* Slack webhook URL input (shown when slack is enabled) */}
            {pref.slack && (
              <div className="ml-3 mt-1 mb-2">
                <Input
                  className="h-7 text-xs"
                  placeholder={t('webhookPlaceholder')}
                  value={pref.slackWebhookUrl || ''}
                  onChange={(e) => updateWebhookUrl(pref.type, e.target.value)}
                  onBlur={() => saveWebhookUrl(pref.type)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {saving && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('saving')}
        </p>
      )}
    </div>
  );
}

function ToggleButton({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'h-5 w-9 rounded-full transition-colors relative shrink-0',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
