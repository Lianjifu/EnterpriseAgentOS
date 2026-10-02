/**
 * 记忆管理的时间范围，外观与交互走共用的 TimeRangeDropdown。
 */
import { TimeRangeDropdown as SharedTimeRangeDropdown } from '@/components/TimeRangeDropdown';
import type { MemoryRange } from '../schema';
import { RANGE_LABEL, RANGES } from './constants';

const OPTIONS = RANGES.map((id) => ({ id, label: RANGE_LABEL[id] }));

export function TimeRangeDropdown({ value, onChange }: {
  value: MemoryRange;
  onChange: (next: MemoryRange) => void;
}) {
  return <SharedTimeRangeDropdown value={value} onChange={onChange} options={OPTIONS} />;
}
