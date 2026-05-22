'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Baby, Bell, BellOff, Check, Import, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  DEFAULT_PREFS,
  getPrefs,
  permission as getPermission,
  requestPermission,
  setPrefs as savePrefs,
  showNotification,
  supportsNotifications,
  type ReminderPrefs,
} from '@/lib/notifications';

export function SettingsPanel() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [prefs, setPrefsState] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [tested, setTested] = useState(false);

  useEffect(() => {
    setPrefsState(getPrefs());
    setPerm(getPermission());
  }, []);

  function update(next: Partial<ReminderPrefs>) {
    const merged = { ...prefs, ...next };
    setPrefsState(merged);
    savePrefs(merged);
  }

  async function onToggleReminders() {
    if (!prefs.enabled) {
      const p = await requestPermission();
      setPerm(p);
      if (p !== 'granted') {
        update({ enabled: false });
        return;
      }
      update({ enabled: true });
    } else {
      update({ enabled: false });
    }
  }

  async function sendTest() {
    if (getPermission() !== 'granted') {
      const p = await requestPermission();
      setPerm(p);
      if (p !== 'granted') return;
    }
    await showNotification('Luna reminders are on ✨', 'This is what a gentle nudge will look like.');
    setTested(true);
    setTimeout(() => setTested(false), 2500);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }

  const notifSupported = supportsNotifications();
  const denied = perm === 'denied';

  return (
    <div className="space-y-7 animate-slide-up">
      {/* Appearance */}
      <Card title="Appearance">
        <p className="text-sm text-ink-600 mb-3">Choose how Luna looks.</p>
        <div className="grid grid-cols-3 gap-2">
          <ThemeOption icon={Sun} label="Light" active={theme === 'light'} onClick={() => setTheme('light')} />
          <ThemeOption icon={Moon} label="Dark" active={theme === 'dark'} onClick={() => setTheme('dark')} />
          <ThemeOption icon={Monitor} label="System" active={theme === 'system'} onClick={() => setTheme('system')} />
        </div>
      </Card>

      {/* Reminders */}
      <Card title="Reminders">
        {!notifSupported ? (
          <p className="text-sm text-ink-600">
            This device or browser doesn&apos;t support notifications.
          </p>
        ) : (
          <>
            <Row
              icon={prefs.enabled ? Bell : BellOff}
              title="Gentle reminders"
              subtitle="A soft nudge to check in, plus a heads-up before your period."
            >
              <Toggle on={prefs.enabled && perm === 'granted'} onChange={onToggleReminders} />
            </Row>

            {denied && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Notifications are blocked in your browser settings. Enable them for this site to turn
                reminders on.
              </p>
            )}

            {prefs.enabled && perm === 'granted' && (
              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-ink-800">Daily check-in time</span>
                  <input
                    type="time"
                    value={prefs.dailyTime}
                    onChange={(e) => update({ dailyTime: e.target.value })}
                    className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm outline-none focus:border-rose-400"
                  />
                </label>
                <Row title="Period approaching" subtitle="Alerts at 2 days, 1 day, and the day itself.">
                  <Toggle on={prefs.periodAlerts} onChange={(v) => update({ periodAlerts: v })} />
                </Row>
                <button
                  onClick={sendTest}
                  className="w-full rounded-2xl border border-cream-200 bg-cream-50 py-3 text-sm text-ink-700 hover:bg-cream-100 flex items-center justify-center gap-2"
                >
                  {tested ? <Check size={15} /> : <Bell size={15} />}
                  {tested ? 'Sent — check your notifications' : 'Send a test reminder'}
                </button>
              </div>
            )}
            <p className="mt-4 text-xs text-ink-500 leading-relaxed">
              Reminders run while Luna is open in your browser or installed as an app. Keep it added to
              your home screen for the most reliable nudges.
            </p>
          </>
        )}
      </Card>

      {/* Pregnancy */}
      <Card title="Pregnancy">
        <Link
          href="/pregnancy"
          className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 p-4 hover:bg-cream-100 transition"
        >
          <div className="h-10 w-10 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
            <Baby size={18} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink-900">Pregnancy mode</p>
            <p className="text-xs text-ink-500">Week-by-week tracking, kicks, contractions &amp; weight.</p>
          </div>
        </Link>
      </Card>

      {/* Data */}
      <Card title="Your data">
        <Link
          href="/import"
          className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 p-4 hover:bg-cream-100 transition"
        >
          <div className="h-10 w-10 rounded-2xl bg-mauve-100 grid place-items-center text-mauve-500">
            <Import size={18} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink-900">Import from another app</p>
            <p className="text-xs text-ink-500">Bring your history over from Flo and others.</p>
          </div>
        </Link>
      </Card>

      {/* Account */}
      <Card title="Account">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 p-4 hover:bg-cream-100 transition text-left"
        >
          <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
            <LogOut size={18} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink-900">Sign out</p>
            <p className="text-xs text-ink-500">You can always sign back in.</p>
          </div>
        </button>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 p-5">
      <h2 className="font-serif text-xl mb-3">{title}</h2>
      {children}
    </section>
  );
}

function ThemeOption({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Sun;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-2xl border py-3 flex flex-col items-center gap-1.5 transition',
        active
          ? 'border-rose-400 bg-rose-50 text-rose-600'
          : 'border-cream-200 bg-cream-50 text-ink-600 hover:bg-cream-100',
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={1.75} />
      <span className="text-xs">{label}</span>
    </button>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon?: typeof Bell;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 h-9 w-9 shrink-0 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
            <Icon size={17} strokeWidth={1.75} />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-ink-900">{title}</p>
          {subtitle && <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={[
        'shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors',
        on ? 'bg-rose-500' : 'bg-cream-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-cream-50 shadow transition',
          on ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
