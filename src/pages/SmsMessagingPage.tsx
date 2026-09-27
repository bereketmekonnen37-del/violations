import { useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquareText, Send, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ElectricBroadcast } from '../components/branding/ElectricBroadcast';

interface DriverAlert {
  name: string;
  tag: string;
  message: string;
}

const SPEED_ALERT: DriverAlert = {
  name: 'አበበ ካሳ',
  tag: 'Speeding · Djibouti road',
  message: 'ውድ አበበ ካሳ፣ በጅቡቲ መንገድ ላይ ከፍተኛ ፍጥነት ታይቷል። እባክዎ ፍጥነትዎን ይቀንሱ።',
};

const NIGHT_ALERT: DriverAlert = {
  name: 'ትዕግስት ገብሬ',
  tag: 'Night driving',
  message: 'ውድ ትዕግስት ገብሬ፣ በሌሊት ሰዓት ረዥም ጊዜ እያሽከረከሩ ተገኝተዋል። እባክዎ ደንቡን ያክብሩ።',
};

type TrialContact = { label: string; phone: string };

const TRIAL_CONTACTS: TrialContact[] = [
  { label: 'Whitelisted test line A', phone: '0965186004' },
  { label: 'Whitelisted test line B', phone: '0955344558' },
];

const PRESET_MESSAGES: { label: string; text: string }[] = [
  {
    label: 'ፍጥነት (Speed)',
    text: 'ውድ ሹፌር፣ ከተፈቀደው በላይ ፍጥነት ሲነዱ ተመዝግቧል። እባክዎ ፍጥነትዎን ወዲያውኑ ይቀንሱ። — FleetWatch',
  },
  {
    label: 'ሌሊት (Nights)',
    text: 'ውድ ሹፌር፣ በሌሊት ሰዓት (18:00–06:00) ረዥም ጊዜ እያሽከረከሩ ተገኝተዋል። እባክዎ የሌሊት ደንቡን ያክብሩ። — FleetWatch',
  },
  {
    label: 'ተከታታይ (Continuous)',
    text: 'ውድ ሹፌር፣ ያለ በቂ እረፍት ተከታታይ ረዥም ሰዓት ሲነዱ ተመዝግቧል። እባክዎ ወዲያውኑ እረፍት ይውሰዱ። — FleetWatch',
  },
];

type SendOutcome = {
  ok: boolean;
  results?: { to: string; ok: boolean; status: number; data: unknown }[];
  error?: string;
};

const extractReason = (data: unknown): string | null => {
  if (!data) return null;
  if (typeof data === 'string') return data.trim() || null;
  if (typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const direct =
    (typeof d.error_message === 'string' && d.error_message) ||
    (typeof d.message === 'string' && d.message) ||
    (typeof d.error === 'string' && d.error) ||
    (typeof d.description === 'string' && d.description);
  if (direct) return String(direct);
  if (d.response && typeof d.response === 'object') {
    const r = d.response as Record<string, unknown>;
    if (Array.isArray(r.errors) && r.errors.length > 0) {
      return r.errors.map((x) => String(x)).join('; ');
    }
    if (typeof r.message === 'string') return r.message;
  }
  return null;
};

export const SmsMessagingPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<HTMLDivElement>(null);
  const phoneARef = useRef<HTMLDivElement>(null);
  const phoneBRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<string[]>(
    TRIAL_CONTACTS.map((c) => c.phone),
  );
  const [message, setMessage] = useState<string>(PRESET_MESSAGES[0].text);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);

  const canSend = useMemo(
    () => !sending && selected.length > 0 && message.trim().length > 0,
    [sending, selected, message],
  );

  const toggleContact = (phone: string) => {
    setSelected((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone],
    );
  };

  const sendTest = async () => {
    if (!canSend) return;
    setSending(true);
    setOutcome(null);
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: selected, message: message.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as SendOutcome;
      setOutcome({ ...data, ok: res.ok && data.ok !== false });
    } catch (err) {
      setOutcome({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Coming soon"
        title="SMS Messaging &amp; Drivers"
        subtitle="Reach every driver directly from FleetWatch — violation alerts, reminders and two-way replies, all by text. We're building it right now."
      />

      <div
        ref={heroRef}
        className="sms-hero relative overflow-hidden rounded-3xl border border-brand-blue-line p-6 dark:border-ink-800 sm:p-12"
      >
        <div className="relative z-10 mb-10 flex items-center justify-center gap-2">
          <span className="soon-pill">
            <span className="soon-dot" />
            <Sparkles size={12} />
            Coming soon — one broadcast, every driver
          </span>
        </div>

        {/* ── Top of the pyramid: the 7771 broadcast node ──────────── */}
        <div ref={senderRef} className="sender-hero relative z-10 mx-auto">
          <div className="sender-hero-orb">
            <span className="sender-hero-pulse" />
            <span className="sender-hero-pulse sender-hero-pulse-2" />
            <span className="sender-hero-pulse sender-hero-pulse-3" />
            <div className="sender-hero-core">
              <MessageSquareText size={26} strokeWidth={1.75} />
            </div>
          </div>
          <span className="sender-hero-tag">7771</span>
          <h2 className="sender-hero-title">
            One system.
            <br />
            Every driver, at once.
          </h2>
          <p className="sender-hero-sub">
            The moment a violation is confirmed, FleetWatch texts the driver
            directly — by name, in Amharic.
          </p>
        </div>

        {/* ── Base of the pyramid: two drivers, two live alerts ────── */}
        <div className="relative z-10 mt-10 grid gap-8 sm:mt-14 sm:grid-cols-2 sm:gap-10">
          <div ref={phoneARef} className="big-phone-col">
            <BigPhone alert={SPEED_ALERT} />
          </div>
          <div ref={phoneBRef} className="big-phone-col">
            <BigPhone alert={NIGHT_ALERT} />
          </div>
        </div>

        <ElectricBroadcast
          containerRef={heroRef}
          sourceRef={senderRef}
          targetRefA={phoneARef}
          targetRefB={phoneBRef}
        />
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-blue-line px-5 py-4 text-center text-xs font-medium text-ink-500 dark:border-ink-700 dark:text-ink-400">
        No setup needed on your end — this tab will light up on its own the
        moment it ships.
      </div>

      <section className="sms-trial mt-8 rounded-3xl border border-brand-blue-line p-6 dark:border-ink-800 sm:p-8">
        <header className="sms-trial-head">
          <span className="sms-trial-pill">
            <span className="sms-trial-dot" />
            Afromessage trial · internal testing
          </span>
          <h3 className="sms-trial-title">Send a live test message</h3>
          <p className="sms-trial-sub">
            Fires a real SMS through the Afromessage trial gateway. Pick the
            recipients, tweak the message, and hit send.
          </p>
        </header>

        <div className="sms-trial-grid">
          <div>
            <label className="sms-trial-label">Recipients</label>
            <div className="sms-trial-chips">
              {TRIAL_CONTACTS.map((c) => {
                const active = selected.includes(c.phone);
                return (
                  <button
                    key={c.phone}
                    type="button"
                    onClick={() => toggleContact(c.phone)}
                    className={`sms-trial-chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                  >
                    <span className="sms-trial-chip-label">{c.label}</span>
                    <span className="sms-trial-chip-phone">{c.phone}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="sms-trial-label">Presets</label>
            <div className="sms-trial-presets">
              {PRESET_MESSAGES.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setMessage(p.text)}
                  className={`sms-trial-preset${
                    message === p.text ? ' is-active' : ''
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="sms-trial-label mt-5 block" htmlFor="sms-trial-msg">
          Message
        </label>
        <textarea
          id="sms-trial-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
          className="sms-trial-textarea"
          placeholder="Type the SMS body…"
        />
        <div className="sms-trial-meta">
          <span>{message.trim().length} / 500 characters</span>
          <span>{selected.length} recipient{selected.length === 1 ? '' : 's'}</span>
        </div>

        <div className="sms-trial-actions">
          <button
            type="button"
            onClick={sendTest}
            disabled={!canSend}
            className="sms-trial-send"
          >
            {sending ? (
              <>
                <Loader2 size={14} className="sms-trial-spin" /> Sending…
              </>
            ) : (
              <>
                <Send size={14} /> Send test SMS
              </>
            )}
          </button>
        </div>

        {outcome && (
          <div
            className={`sms-trial-outcome${
              outcome.ok ? ' is-ok' : ' is-err'
            }`}
            role="status"
          >
            <p className="sms-trial-outcome-title">
              {outcome.ok
                ? 'Delivered to the gateway.'
                : outcome.error ?? 'Send failed. Check the details below.'}
            </p>
            {outcome.results && outcome.results.length > 0 && (
              <ul className="sms-trial-outcome-list">
                {outcome.results.map((r) => {
                  const reason = extractReason(r.data);
                  return (
                    <li key={r.to} className="sms-trial-outcome-row">
                      <div className="sms-trial-outcome-line">
                        <span className="sms-trial-outcome-to">{r.to}</span>
                        <span
                          className={`sms-trial-outcome-status${
                            r.ok ? ' is-ok' : ' is-err'
                          }`}
                        >
                          {r.ok ? 'OK' : `HTTP ${r.status || 'error'}`}
                        </span>
                      </div>
                      {!r.ok && reason && (
                        <p className="sms-trial-outcome-reason">{reason}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      <style>{`
        /* Flat, minimal — no gradients on any card or panel here. */
        .sms-hero {
          background: var(--color-brand-blue-tint);
        }

        .soon-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-brand-accent-dark);
          background: var(--color-brand-accent-soft);
          border: 1px solid var(--color-brand-accent-line);
        }
        .soon-dot {
          width: 6px; height: 6px; border-radius: 9999px;
          background: var(--color-brand-accent);
          animation: soonPulse 1.8s ease-in-out infinite;
        }
        @keyframes soonPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        /* ── Top of the pyramid: the 7771 node ────────────────────── */
        .sender-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 420px;
          text-align: center;
        }
        .sender-hero-orb {
          position: relative;
          width: 88px; height: 88px;
          display: flex; align-items: center; justify-content: center;
        }
        .sender-hero-core {
          position: relative;
          z-index: 1;
          width: 76px; height: 76px;
          border-radius: 9999px;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-brand-blue);
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(62, 85, 165, 0.25);
        }
        .sender-hero-pulse {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1.5px solid var(--color-brand-blue);
          opacity: 0;
          animation: senderHeroPulse 3.3s ease-out infinite;
        }
        .sender-hero-pulse-2 { animation-delay: 1.1s; }
        .sender-hero-pulse-3 { animation-delay: 2.2s; }
        @keyframes senderHeroPulse {
          0% { opacity: 0.5; transform: scale(0.82); }
          100% { opacity: 0; transform: scale(1.7); }
        }
        .sender-hero-tag {
          margin-top: 12px;
          padding: 3px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.03em;
          color: #ffffff;
          background: var(--color-ink-900);
        }
        .sender-hero-title {
          margin-top: 14px;
          font-size: 26px;
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--color-brand-blue-dark);
        }
        .sender-hero-sub {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--color-text-muted);
        }

        /* ── Base of the pyramid: the two driver phones ───────────── */
        .big-phone-col {
          display: flex;
          justify-content: center;
        }
        .big-phone {
          width: 100%;
          max-width: 260px;
          border-radius: 22px;
          padding: 9px;
          background: var(--color-ink-900);
          box-shadow: 0 16px 32px rgba(15, 20, 40, 0.16);
        }
        .big-phone-notch {
          display: block;
          width: 34px; height: 5px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.22);
          margin: 0 auto 8px;
        }
        .big-phone-screen {
          border-radius: 15px;
          background: #ffffff;
          padding: 12px 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .big-phone-bar {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--color-text-muted);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--color-brand-blue-line);
        }
        .big-phone-avatar {
          width: 16px; height: 16px;
          border-radius: 9999px;
          background: var(--color-brand-blue-soft);
          border: 1px solid var(--color-brand-blue-line);
        }
        .big-phone-bubble {
          font-size: 12.5px;
          line-height: 1.6;
          padding: 9px 11px;
          border-radius: 13px 13px 13px 4px;
          background: var(--color-brand-blue-soft);
          color: var(--color-text-primary);
          opacity: 0;
          transform: translateY(5px) scale(0.97);
          animation: bigBubble 3.2s ease-in-out infinite;
        }
        @keyframes bigBubble {
          0%, 18% { opacity: 0; transform: translateY(5px) scale(0.97); }
          28%, 92% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(5px) scale(0.97); }
        }
        .big-phone-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 600;
          color: var(--color-text-muted);
          opacity: 0;
          animation: bigMeta 3.2s ease-in-out infinite;
        }
        @keyframes bigMeta {
          0%, 34% { opacity: 0; }
          44%, 92% { opacity: 1; }
          100% { opacity: 0; }
        }
        .big-phone-label {
          margin-top: 10px;
          text-align: center;
        }
        .big-phone-label-name {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .big-phone-label-tag {
          margin-top: 1px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--color-text-muted);
        }

        @media (prefers-reduced-motion: reduce) {
          .soon-dot, .sender-hero-pulse, .big-phone-bubble, .big-phone-meta {
            animation: none !important;
          }
          .big-phone-bubble, .big-phone-meta { opacity: 1; transform: none; }
        }

        /* ── Trial sandbox ─────────────────────────────────────────── */
        .sms-trial { background: #ffffff; }
        :global(.dark) .sms-trial { background: var(--color-ink-950, #0f172a); }
        .sms-trial-head { text-align: center; margin-bottom: 20px; }
        .sms-trial-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 4px 12px; border-radius: 9999px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--color-brand-blue-dark);
          background: var(--color-brand-blue-soft);
          border: 1px solid var(--color-brand-blue-line);
        }
        .sms-trial-dot {
          width: 6px; height: 6px; border-radius: 9999px;
          background: var(--color-brand-blue);
          animation: soonPulse 1.8s ease-in-out infinite;
        }
        .sms-trial-title {
          margin-top: 12px;
          font-size: 20px; font-weight: 700;
          color: var(--color-brand-blue-dark);
        }
        .sms-trial-sub {
          margin-top: 6px;
          font-size: 13px; line-height: 1.5;
          color: var(--color-text-muted);
        }
        .sms-trial-grid {
          display: grid; gap: 18px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .sms-trial-grid { grid-template-columns: 1fr 1fr; }
        }
        .sms-trial-label {
          display: block;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin-bottom: 8px;
        }
        .sms-trial-chips {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .sms-trial-chip {
          display: inline-flex; flex-direction: column; align-items: flex-start;
          padding: 8px 12px; border-radius: 12px;
          background: var(--color-brand-blue-tint);
          border: 1px solid var(--color-brand-blue-line);
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .sms-trial-chip:hover { border-color: var(--color-brand-blue); }
        .sms-trial-chip.is-active {
          background: var(--color-brand-blue);
          border-color: var(--color-brand-blue);
          color: #ffffff;
        }
        .sms-trial-chip-label {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.04em;
          opacity: 0.85;
        }
        .sms-trial-chip-phone {
          margin-top: 2px;
          font-size: 13px; font-weight: 700;
        }
        .sms-trial-presets {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .sms-trial-preset {
          padding: 8px 12px; border-radius: 9999px;
          font-size: 12px; font-weight: 600;
          background: transparent;
          border: 1px solid var(--color-brand-blue-line);
          color: var(--color-text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sms-trial-preset:hover { border-color: var(--color-brand-blue); }
        .sms-trial-preset.is-active {
          background: var(--color-brand-accent-soft);
          border-color: var(--color-brand-accent);
          color: var(--color-brand-accent-dark);
        }
        .sms-trial-textarea {
          width: 100%; resize: vertical;
          min-height: 96px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--color-brand-blue-line);
          background: var(--color-brand-blue-tint);
          font-size: 13.5px; line-height: 1.55;
          color: var(--color-text-primary);
          transition: border-color 0.15s ease;
        }
        .sms-trial-textarea:focus {
          outline: none;
          border-color: var(--color-brand-blue);
        }
        .sms-trial-meta {
          display: flex; justify-content: space-between;
          margin-top: 6px;
          font-size: 11px; color: var(--color-text-muted);
        }
        .sms-trial-actions {
          margin-top: 16px;
          display: flex; justify-content: flex-end;
        }
        .sms-trial-send {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 9999px;
          font-size: 13px; font-weight: 700;
          background: var(--color-brand-blue);
          color: #ffffff;
          border: none; cursor: pointer;
          transition: background 0.15s ease;
        }
        .sms-trial-send:hover:not(:disabled) {
          background: var(--color-brand-blue-hover);
        }
        .sms-trial-send:disabled {
          opacity: 0.55; cursor: not-allowed;
        }
        .sms-trial-spin { animation: sms-trial-spin 0.9s linear infinite; }
        @keyframes sms-trial-spin {
          to { transform: rotate(360deg); }
        }
        .sms-trial-outcome {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 12.5px;
          border: 1px solid transparent;
        }
        .sms-trial-outcome.is-ok {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #065f46;
        }
        .sms-trial-outcome.is-err {
          background: #fef2f2;
          border-color: var(--color-brand-red-muted);
          color: var(--color-brand-red-dark);
        }
        .sms-trial-outcome-title { font-weight: 700; }
        .sms-trial-outcome-list {
          margin-top: 8px;
          display: flex; flex-direction: column; gap: 4px;
          font-size: 12px;
        }
        .sms-trial-outcome-list li {
          display: flex; justify-content: space-between;
          font-variant-numeric: tabular-nums;
        }
        .sms-trial-outcome-to { font-weight: 600; }
        .sms-trial-outcome-status.is-ok { color: #047857; font-weight: 700; }
        .sms-trial-outcome-status.is-err { color: var(--color-brand-red); font-weight: 700; }
        .sms-trial-outcome-row { display: flex; flex-direction: column; gap: 3px; }
        .sms-trial-outcome-line {
          display: flex; justify-content: space-between;
        }
        .sms-trial-outcome-reason {
          font-size: 11.5px; line-height: 1.4;
          font-weight: 500;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

const BigPhone = ({ alert }: { alert: DriverAlert }) => (
  <div className="flex flex-col items-center">
    <div className="big-phone">
      <span className="big-phone-notch" />
      <div className="big-phone-screen">
        <div className="big-phone-bar">
          <span className="big-phone-avatar" />
          7771
        </div>
        <div className="big-phone-bubble">{alert.message}</div>
        <div className="big-phone-meta">Delivered</div>
      </div>
    </div>
    <div className="big-phone-label">
      <p className="big-phone-label-name">{alert.name}</p>
      <p className="big-phone-label-tag">{alert.tag}</p>
    </div>
  </div>
);
