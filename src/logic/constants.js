// 达人稿件全流程状态机定义
export const STAGES = [
  { key: 'draft_pending',   name: '大纲待审核', short: '大纲', kind: 'review',   chip: 'chip-blue',   dot: '#165dff', seq: 1 },
  { key: 'draft_revising',  name: '达人大纲修改中', short: '大纲修改', kind: 'revising', chip: 'chip-purple', dot: '#722ed1', seq: 2 },
  { key: 'script_creating', name: '脚本中',     short: '脚本撰写', kind: 'work',     chip: 'chip-gray',   dot: '#5c6470', seq: 3 },
  { key: 'script_pending',  name: '脚本待审核', short: '脚本', kind: 'review',   chip: 'chip-blue',   dot: '#165dff', seq: 4 },
  { key: 'script_revising', name: '达人脚本修改中', short: '脚本修改', kind: 'revising', chip: 'chip-purple', dot: '#722ed1', seq: 5 },
  { key: 'shooting',        name: '拍摄中',     short: '拍摄', kind: 'work',     chip: 'chip-gray',   dot: '#5c6470', seq: 6 },
  { key: 'video_pending',   name: '视频待审核', short: '视频', kind: 'review',   chip: 'chip-blue',   dot: '#165dff', seq: 7 },
  { key: 'video_revising',  name: '达人视频修改中', short: '视频修改', kind: 'revising', chip: 'chip-purple', dot: '#722ed1', seq: 8 },
  { key: 'done',            name: '定稿·待发布', short: '定稿', kind: 'done',     chip: 'chip-green',  dot: '#0a9c52', seq: 9 }
];

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

// 各阶段审稿对象的中文名称
export const REVIEW_ITEM = {
  draft_pending:  { label: '达人大纲',      stageLabel: '大纲',   icon: 'outline' },
  script_pending: { label: '达人脚本',      stageLabel: '脚本',   icon: 'script' },
  video_pending:  { label: '视频初稿',      stageLabel: '视频',   icon: 'video' }
};

// 审稿任务类型
export const REVIEW_TYPES = [
  { key: 'content', name: '内容·表达', color: '#165dff' },
  { key: 'compliance', name: '合规·卡审', color: '#d9382c' },
  { key: 'sales', name: '卖点·转化', color: '#d45f00' },
  { key: 'creative', name: '创意·流量', color: '#722ed1' },
  { key: 'tech', name: '技术·制作', color: '#0b8f8f' }
];
export const REVIEW_TYPE_MAP = Object.fromEntries(REVIEW_TYPES.map((t) => [t.key, t]));

// 通用工具
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowText() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function dayOffset(days) {
  const d = new Date(Date.now() + days * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

// 剪贴板
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}
