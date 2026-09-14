import { useRef } from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';
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

export const SmsMessagingPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<HTMLDivElement>(null);
  const phoneARef = useRef<HTMLDivElement>(null);
  const phoneBRef = useRef<HTMLDivElement>(null);

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
