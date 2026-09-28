/**
 * Mock audit log factory.
 *
 * Synthesises a realistic-looking history of admin actions across the
 * mock user set so that the audit page has meaningful data to render.
 */

import { addDays } from '../utils/dateUtils';
import { generateAuditId } from '../utils/id';
import type {
  AdminAuditAction,
  AdminAuditRecord,
  AdminAuditSeverity,
  AdminAuditTarget,
} from '../types/audit.types';
import type { AdminUser } from '../types/user.types';
import { createRandom } from './random';
import { IP_POOL, USER_AGENTS } from './seedNames';

const ACTIONS: AdminAuditAction[] = [
  'user.created',
  'user.updated',
  'user.deleted',
  'user.suspended',
  'user.reinstated',
  'user.invited',
  'user.role_changed',
  'user.password_reset',
  'user.impersonated',
  'settings.updated',
  'export.generated',
  'session.started',
  'session.ended',
  'permission.granted',
  'permission.revoked',
];

const SEVERITIES: AdminAuditSeverity[] = ['info', 'notice', 'warning', 'critical'];

function summaryFor(
  action: AdminAuditAction,
  target: AdminAuditTarget,
  actorName: string,
): string {
  switch (action) {
    case 'user.created':
      return `${actorName} created ${target.label}`;
    case 'user.updated':
      return `${actorName} updated ${target.label}`;
    case 'user.deleted':
      return `${actorName} removed ${target.label}`;
    case 'user.suspended':
      return `${actorName} suspended ${target.label}`;
    case 'user.reinstated':
      return `${actorName} reinstated ${target.label}`;
    case 'user.invited':
      return `${actorName} invited ${target.label}`;
    case 'user.role_changed':
      return `${actorName} changed the role of ${target.label}`;
    case 'user.password_reset':
      return `${actorName} triggered a password reset for ${target.label}`;
    case 'user.impersonated':
      return `${actorName} impersonated ${target.label}`;
    case 'settings.updated':
      return `${actorName} updated ${target.label}`;
    case 'export.generated':
      return `${actorName} generated export ${target.label}`;
    case 'session.started':
      return `${actorName} started a session on ${target.label}`;
    case 'session.ended':
      return `${actorName} ended a session on ${target.label}`;
    case 'permission.granted':
      return `${actorName} granted ${target.label}`;
    case 'permission.revoked':
      return `${actorName} revoked ${target.label}`;
  }
}

export function buildAuditRecords(
  users: readonly AdminUser[],
  count: number,
  seed = 7,
): AdminAuditRecord[] {
  const random = createRandom(seed);
  if (!users.length) return [];
  const now = new Date();
  const records: AdminAuditRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const actor = random.pick(users);
    const targetUser = random.pick(users);
    const action = random.pick(ACTIONS);
    const severity = random.pick(SEVERITIES);
    const target: AdminAuditTarget = action.startsWith('settings')
      ? { kind: 'settings', id: 'settings', label: 'account settings' }
      : action.startsWith('export')
      ? {
          kind: 'export',
          id: generateAuditId(),
          label: `export-${random.int(100, 999)}.csv`,
        }
      : action.startsWith('permission')
      ? {
          kind: 'permission',
          id: generateAuditId(),
          label: `scope admin:${random.pick([
            'view-users',
            'update-user',
            'delete-user',
          ])}`,
        }
      : action.startsWith('session')
      ? {
          kind: 'session',
          id: generateAuditId(),
          label: 'the admin console',
        }
      : { kind: 'user', id: targetUser.id, label: targetUser.displayName };
    const timestamp = addDays(now, -random.int(0, 60)).toISOString();
    records.push({
      id: generateAuditId(),
      timestamp,
      action,
      severity,
      actor: {
        id: actor.id,
        displayName: actor.displayName,
        role: actor.role,
        ip: random.pick(IP_POOL),
        userAgent: random.pick(USER_AGENTS),
      },
      target,
      summary: summaryFor(action, target, actor.displayName),
      tags: random.bool(0.4)
        ? [random.pick(['nightly', 'batch', 'manual', 'review'])]
        : undefined,
      notes: random.bool(0.2)
        ? 'Automatic review flagged this event for follow-up.'
        : undefined,
    });
  }
  return records.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
