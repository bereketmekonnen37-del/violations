import type { VercelRequest, VercelResponse } from '@vercel/node';

const AFRO_URL = 'https://api.afromessage.com/api/send';

type SendResult = {
  to: string;
  ok: boolean;
  status: number;
  data: unknown;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.AFROMESSAGE_API_KEY;
  if (!token) {
    res
      .status(500)
      .json({ error: 'AFROMESSAGE_API_KEY is not configured on the server' });
    return;
  }

  const sender = (process.env.AFROMESSAGE_SENDER_ID ?? '').trim();
  const identifier = (process.env.AFROMESSAGE_IDENTIFIER_ID ?? '').trim();

  const body = (req.body ?? {}) as { to?: unknown; message?: unknown };
  const message = String(body.message ?? '').trim();
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  if (message.length > 500) {
    res.status(400).json({ error: 'message too long (max 500 chars)' });
    return;
  }

  const rawList = Array.isArray(body.to) ? body.to : [body.to];
  const recipients = Array.from(
    new Set(
      rawList
        .map((n) => normalizePhone(n))
        .filter((n): n is string => Boolean(n)),
    ),
  );
  if (recipients.length === 0) {
    res
      .status(400)
      .json({ error: 'at least one valid recipient is required' });
    return;
  }

  const results: SendResult[] = await Promise.all(
    recipients.map(async (to) => {
      const url = new URL(AFRO_URL);
      if (identifier) url.searchParams.set('from', identifier);
      if (sender) url.searchParams.set('sender', sender);
      url.searchParams.set('to', to);
      url.searchParams.set('message', message);

      try {
        const r = await fetch(url.toString(), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await r.text();
        let data: unknown = text;
        try {
          data = JSON.parse(text);
        } catch {
          // keep raw text
        }
        const ack =
          data && typeof data === 'object' && 'acknowledge' in data
            ? (data as { acknowledge?: unknown }).acknowledge
            : undefined;
        const ok = r.ok && (ack === undefined || ack === 'success');
        return { to, ok, status: r.status, data };
      } catch (err) {
        return {
          to,
          ok: false,
          status: 0,
          data: {
            error: err instanceof Error ? err.message : String(err),
          },
        };
      }
    }),
  );

  const allOk = results.every((r) => r.ok);
  res.status(allOk ? 200 : 502).json({ ok: allOk, results });
}

function normalizePhone(input: unknown): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('251') && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) {
    return `+251${digits.slice(1)}`;
  }
  if (digits.length === 9) return `+251${digits}`;
  return null;
}
