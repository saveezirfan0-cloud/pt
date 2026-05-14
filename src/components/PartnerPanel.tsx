'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Link as LinkIcon, Trash2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Invite = {
  id: string;
  invite_code: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type Connection = {
  id: string;
  partner_id: string;
  share_periods: boolean;
  share_symptoms: boolean;
  share_predictions: boolean;
  partner: { id: string; display_name: string | null; email: string | null } | null;
};

export function PartnerPanel({
  userId,
  invites,
  connections,
}: {
  userId: string;
  invites: Invite[];
  connections: Connection[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const pending = invites.filter((i) => i.status === 'pending');

  async function createInvite() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.from('partner_invites').insert({ inviter_id: userId });
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }

  async function revokeInvite(id: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from('partner_invites').update({ status: 'revoked' }).eq('id', id);
    setBusy(false);
    router.refresh();
  }

  async function disconnect(partnerId: string) {
    if (!confirm('Disconnect your partner? They will lose access.')) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.rpc('disconnect_partner', { p_partner: partnerId });
    setBusy(false);
    router.refresh();
  }

  async function updateShare(
    id: string,
    field: 'share_periods' | 'share_symptoms' | 'share_predictions',
    value: boolean
  ) {
    const supabase = createClient();
    await supabase.from('partner_connections').update({ [field]: value }).eq('id', id);
    router.refresh();
  }

  function copyLink(code: string) {
    const url = `${window.location.origin}/partner/accept?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      {/* Connected partners */}
      <section>
        <h2 className="font-serif text-2xl mb-3">Connected</h2>
        {connections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cream-200 p-6 text-center">
            <p className="text-ink-600">No partners connected yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {connections.map((c) => (
              <li
                key={c.id}
                className="rounded-3xl border border-cream-200 bg-cream-50/70 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-serif text-xl">
                      {c.partner?.display_name || 'Partner'}
                    </p>
                    <p className="text-xs text-ink-500">{c.partner?.email}</p>
                  </div>
                  <button
                    onClick={() => disconnect(c.partner_id)}
                    className="text-ink-500 hover:text-rose-600 p-2 -m-2"
                    aria-label="Disconnect"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  <Toggle
                    label="Share period dates"
                    on={c.share_periods}
                    onChange={(v) => updateShare(c.id, 'share_periods', v)}
                  />
                  <Toggle
                    label="Share symptoms & mood"
                    on={c.share_symptoms}
                    onChange={(v) => updateShare(c.id, 'share_symptoms', v)}
                  />
                  <Toggle
                    label="Share predictions"
                    on={c.share_predictions}
                    onChange={(v) => updateShare(c.id, 'share_predictions', v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending invites */}
      {pending.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl mb-3">Pending invites</h2>
          <ul className="space-y-3">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="rounded-3xl border border-cream-200 bg-cream-50/70 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
                    <LinkIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-700 truncate">
                      Share this link with your partner
                    </p>
                    <p className="text-xs text-ink-500 truncate">
                      Code: {inv.invite_code}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => copyLink(inv.invite_code)}
                    className="flex-1 rounded-xl bg-ink-900 text-cream-50 py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    {copied === inv.invite_code ? (
                      <>
                        <Check size={14} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy invite link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm text-ink-600"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Create new invite */}
      <section>
        <button
          onClick={createInvite}
          disabled={busy}
          className="w-full rounded-2xl bg-rose-500 text-cream-50 py-4 font-medium disabled:opacity-60 hover:bg-rose-600 transition flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          {busy ? 'Working…' : 'Create new invite link'}
        </button>
        {err && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3">
            {err}
          </p>
        )}
        <p className="text-xs text-ink-500 mt-3 leading-relaxed">
          Invite links expire in 14 days. Each link can be used once.
        </p>
      </section>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between text-left py-1.5"
    >
      <span className="text-sm text-ink-800">{label}</span>
      <span
        className={[
          'inline-flex h-6 w-11 items-center rounded-full transition-colors',
          on ? 'bg-rose-500' : 'bg-cream-200',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-cream-50 shadow transition',
            on ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
