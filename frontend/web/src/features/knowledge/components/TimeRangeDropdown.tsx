/**
 * 知识管理的时间范围，外观与交互走共用的 TimeRangeDropdown。
 */
import { TimeRangeDropdown as SharedTimeRangeDropdown } from '@/components/TimeRangeDropdown';
import type { Range } from '../schema';
import { RANGES } from './constants';

const OPTIONS = RANGES.map((item) => ({ id: item.id, label: item.label }));

export function TimeRangeDropdown({ value, onChange }: {
  value: Range;
  onChange: (next: Range) => void;
}) {
  return <SharedTimeRangeDropdown value={value} onChange={onChange} options={OPTIONS} />;
}
