import type { VercelRequest, VercelResponse } from '@vercel/node';

const SMS_URL = 'https://smsethiopia.com/api/sms/send';

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

  const apiKey = process.env.SMS_ETHIOPIA_API_KEY;
  if (!apiKey) {
    res
      .status(500)
      .json({ error: 'SMS_ETHIOPIA_API_KEY is not configured on the server' });
    return;
  }

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
        .map((n) => normalizeMsisdn(n))
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
    recipients.map(async (msisdn) => {
      try {
        const r = await fetch(SMS_URL, {
          method: 'POST',
          headers: {
            KEY: apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ msisdn, text: message }),
        });
        const text = await r.text();
        let data: unknown = text;
        try {
          data = JSON.parse(text);
        } catch {
          // keep raw text
        }
        const ok = r.ok && !hasErrorSignal(data);
        return { to: msisdn, ok, status: r.status, data };
      } catch (err) {
        return {
          to: msisdn,
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

function hasErrorSignal(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.error) return true;
  if (typeof d.status === 'string' && /error|fail/i.test(d.status)) return true;
  if (d.success === false) return true;
  if (typeof d.code === 'string' && d.code !== '0' && d.code !== '200') {
    return true;
  }
  return false;
}

function normalizeMsisdn(input: unknown): string | null {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('251') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) {
    return `251${digits.slice(1)}`;
  }
  if (digits.length === 9) return `251${digits}`;
  return null;
}
