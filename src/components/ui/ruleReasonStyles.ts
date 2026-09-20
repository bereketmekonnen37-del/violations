import {
  MapPin,
  Ruler,
  ScissorsLineDashed,
  ShieldCheck,
  TimerOff,
  type LucideIcon,
} from 'lucide-react';
import {
  primaryReason,
  type RuleFilteredEvent,
  type RuleReasonCode,
} from '../../lib/ruleFiltered';

export const REASON_STYLE: Record<
  RuleReasonCode,
  { icon: LucideIcon; badge: string; row: string }
> = {
  'allowed-vid': {
    icon: ShieldCheck,
    badge:
      'bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-800',
    row: 'bg-red-50/60 dark:bg-red-950/20',
  },
  'allowed-location': {
    icon: MapPin,
    badge:
      'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800',
    row: 'bg-red-50/60 dark:bg-red-950/20',
  },
  'under-estimated': {
    icon: Ruler,
    badge:
      'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:ring-amber-800',
    row: 'bg-amber-50/70 dark:bg-amber-950/20',
  },
  'above-cap': {
    icon: ScissorsLineDashed,
    badge:
      'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-900/50 dark:text-violet-100 dark:ring-violet-800',
    row: 'bg-violet-50/70 dark:bg-violet-950/20',
  },
  'below-threshold': {
    icon: TimerOff,
    badge:
      'bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600',
    row: 'bg-slate-100/80 dark:bg-slate-800/40',
  },
};

/** Row tint for the Filtered tab, taken from the strongest reason. */
export const reasonRowClass = (e: RuleFilteredEvent): string =>
  REASON_STYLE[primaryReason(e)].row;

/** Legend of the Filtered-tab row colours. */
export const REASON_ORDER: RuleReasonCode[] = [
  'allowed-vid',
  'allowed-location',
  'under-estimated',
  'above-cap',
  'below-threshold',
];
