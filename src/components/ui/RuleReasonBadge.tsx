import { Gauge, Moon, Route as RouteIcon, type LucideIcon } from 'lucide-react';
import {
  RULE_REASON_LABEL,
  type EventKind,
  type RuleReasonCode,
} from '../../lib/ruleFiltered';
import { REASON_STYLE } from './ruleReasonStyles';

export const RuleReasonBadge = ({
  reason,
  title,
}: {
  reason: RuleReasonCode;
  title?: string;
}) => {
  const { icon: Icon, badge } = REASON_STYLE[reason];
  return (
    <span
      title={title ?? RULE_REASON_LABEL[reason]}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${badge}`}
    >
      <Icon size={10} /> {RULE_REASON_LABEL[reason]}
    </span>
  );
};

const KIND_ICON: Record<EventKind, LucideIcon> = {
  speed: Gauge,
  nights: Moon,
  continuous: RouteIcon,
};

export const KindIcon = ({ kind, size = 12 }: { kind: EventKind; size?: number }) => {
  const Icon = KIND_ICON[kind];
  return <Icon size={size} />;
};

