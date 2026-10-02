/**
 * AdminMetrics fixtures — 24 个延迟点 / 6 个模型 / 6 成本拆解 / 4 看板 / 5 阈值规则。
 */
import type {
  CostBreakdown, LatencyPoint, MetricsDashboard, ModelMetric, ThresholdRule,
} from './schema';

export const mockLatencyPoints: LatencyPoint[] = Array.from({ length: 24 }, (_, i) => {
  const t = `${String(i).padStart(2, '0')}:00`;
  const base = 220 + Math.round(Math.sin(i / 2) * 30);
  return {
    t,
    p50: base,
    p95: base + 320 + Math.round(Math.cos(i / 3) * 40),
    p99: base + 680 + Math.round(Math.sin(i / 1.7) * 90),
  };
});

export const mockModelMetrics: ModelMetric[] = [
  { id: 'md-001', model: '云知-旗舰 v4', provider: '云知智能', availability: 99.96, p50: 230, p95: 580, p99: 1180, tokensIn: 12_480_000, tokensOut: 4_320_000, cost: 18_440, calls: 18_204, errorRate: 0.2 },
  { id: 'md-002', model: '云知-经济 v3', provider: '云知智能', availability: 99.81, p50: 180, p95: 460, p99: 920, tokensIn: 8_120_000, tokensOut: 2_780_000, cost: 7_220, calls: 22_184, errorRate: 0.6 },
  { id: 'md-003', model: '北辰-逻辑 v2', provider: '北辰智算', availability: 99.62, p50: 260, p95: 720, p99: 1420, tokensIn: 6_240_000, tokensOut: 2_180_000, cost: 12_840, calls: 12_402, errorRate: 1.4 },
  { id: 'md-004', model: '南屿-推理 v3', provider: '南屿科技', availability: 99.43, p50: 290, p95: 880, p99: 1640, tokensIn: 4_880_000, tokensOut: 1_620_000, cost: 9_840, calls: 8_220, errorRate: 1.8 },
  { id: 'md-005', model: 'GPT-5 mini', provider: 'OpenAI 兼容', availability: 99.99, p50: 200, p95: 520, p99: 1100, tokensIn: 3_240_000, tokensOut: 1_080_000, cost: 6_240, calls: 6_124, errorRate: 0.1 },
  { id: 'md-006', model: 'Claude Sonnet 5', provider: 'Anthropic 兼容', availability: 99.91, p50: 240, p95: 600, p99: 1280, tokensIn: 2_440_000, tokensOut: 920_000, cost: 5_120, calls: 4_240, errorRate: 0.3 },
];

export const mockCostBreakdown: CostBreakdown[] = [
  { id: 'cb-001', bucket: '云知-旗舰 v4', amount: 18_440, pct: 32 },
  { id: 'cb-002', bucket: '北辰-逻辑 v2', amount: 12_840, pct: 22 },
  { id: 'cb-003', bucket: '南屿-推理 v3', amount: 9_840, pct: 17 },
  { id: 'cb-004', bucket: '云知-经济 v3', amount: 7_220, pct: 13 },
  { id: 'cb-005', bucket: 'GPT-5 mini', amount: 6_240, pct: 11 },
  { id: 'cb-006', bucket: '其他', amount: 2_780, pct: 5 },
];

export const mockMetricsDashboards: MetricsDashboard[] = [
  { id: 'db-001', name: '高优客户体验看板', range: '24h', panels: 12, owner: '张敏', starred: true },
  { id: 'db-002', name: 'Token & 成本总览', range: '7d', panels: 8, owner: '韩雪', starred: true },
  { id: 'db-003', name: 'MCP 通道健康度', range: '1h', panels: 6, owner: '李雷', starred: false },
  { id: 'db-004', name: 'P95 延迟地图', range: '24h', panels: 10, owner: '王芳', starred: false },
];

export const mockThresholdRules: ThresholdRule[] = [
  { id: 'th-001', metric: 'availability', comparator: '<', value: 99.5, severity: 'warn', enabled: true, hitCount: 2, window: '5m' },
  { id: 'th-002', metric: 'p95_latency', comparator: '>', value: 1500, severity: 'warn', enabled: true, hitCount: 6, window: '5m' },
  { id: 'th-003', metric: 'error_rate', comparator: '>', value: 1, severity: 'bad', enabled: true, hitCount: 1, window: '5m' },
  { id: 'th-004', metric: 'cost_daily', comparator: '>', value: 60000, severity: 'warn', enabled: false, hitCount: 0, window: '24h' },
  { id: 'th-005', metric: 'tokens_out', comparator: '>', value: 100_000_000, severity: 'good', enabled: true, hitCount: 3, window: '24h' },
];