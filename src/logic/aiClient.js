/**
 * 云端大模型客户端（方案 A：经由后端代理 server/index.mjs）
 *
 * - 后端未启动 / 未配置 Key / 请求失败时，一律由调用方回退「本地模拟引擎」(mockAI)。
 * - 开发模式走 Vite 代理（/api → http://localhost:8787）。
 * - 若部署时前端与后端不同源，可通过 VITE_AI_BASE 指定后端地址，例如 http://localhost:8787。
 */
import { uid } from './constants.js';

const AI_PREFIX = (import.meta.env && import.meta.env.VITE_AI_BASE) || '';

/* ---------- 引擎探测（带缓存） ---------- */
const HEALTH_TTL = 20 * 1000;
let healthCache = null;
let healthAt = 0;

async function fetchJSON(url, opts = {}, timeout = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** 返回 { mode: 'cloud' | 'local', provider?, model? }。失败一律视为 local。 */
export async function getEngine(force = false) {
  if (!force && healthCache && Date.now() - healthAt < HEALTH_TTL) return healthCache;
  const fallback = { mode: 'local', provider: '', model: '' };
  try {
    const r = await fetchJSON(`${AI_PREFIX}/api/ai/health`, {}, 2500);
    healthCache = r && r.configured ? { mode: 'cloud', provider: r.base || '', model: r.model || '' } : fallback;
  } catch (e) {
    healthCache = fallback;
  }
  healthAt = Date.now();
  return healthCache;
}

/* ---------- 基础对话 ---------- */
export async function chatAI({ system = '', user = '', temperature = 0.4, maxTokens = 2200, model = '' } = {}) {
  const body = { system, user, temperature, max_tokens: maxTokens };
  if (model && String(model).trim()) body.model = String(model).trim();
  const r = await fetchJSON(
    `${AI_PREFIX}/api/ai/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    110 * 1000
  );
  if (!r || !r.text) throw new Error('模型返回为空');
  return r.text;
}

export async function getTrendServiceStatus() {
  return fetchJSON(`${AI_PREFIX}/api/trends/health`, {}, 4000);
}

export async function searchTrendNotes({ platform, keywords, competitors, limit = 10 }) {
  const result = await fetchJSON(`${AI_PREFIX}/api/trends/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, keywords, competitors, limit })
  }, 25_000);
  return Array.isArray(result?.items) ? result.items : [];
}

export async function fetchFeishuDocument(url) {
  const result = await fetchJSON(`${AI_PREFIX}/api/feishu/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  }, 20_000);
  if (typeof result?.content !== 'string' || !result.content.trim()) {
    throw new Error('飞书文档没有可审阅的正文内容');
  }
  return result;
}

/** 容错 JSON 解析：先整体解析，再剥掉 markdown 代码围栏 / 用首尾括号截取 */
function parseJSON(text) {
  if (!text) throw new Error('JSON 为空');
  const clean = text.replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(clean); } catch { /* 继续尝试截取 */ }
  const start = clean.search(/[[{]/);
  if (start < 0) throw new Error('未找到 JSON');
  const open = clean[start];
  const close = open === '[' ? ']' : '}';
  const end = clean.lastIndexOf(close);
  if (end <= start) throw new Error('JSON 不完整');
  return JSON.parse(clean.slice(start, end + 1));
}

const str = (v, d = '') => (typeof v === 'string' && v.trim() ? v.trim() : d);
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);

/* ================= 洞察生成 ================= */
const INSIGHTS_SCHEMA = `只输出一个 JSON 对象，不要任何额外文字或 markdown，结构如下：
{
  "cat": "一句话品类描述，如：敏感肌功效护肤",
  "topics": [至少4条，最多6条：{
     "title":"选题标题","angle":"切入角度","hook":"前3秒/首图钩子",
     "why":"为什么能打","risk":"风险点或合规提醒",
     "refComp":"对标竞品做法(可为空串)","refNote":"素材/拍摄备注(可为空串)",
     "platform":"抖音|小红书|双平台","type":"图文|短视频","score":80
  }],
  "hotspots": [3~5条：{"title":"热点话题标题","detail":"结合话题怎么切入"}],
  "compliance": [3~6条：{"title":"合规点","detail":"具体注意事项"}]
}`;

function normalizeTopics(raw) {
  return arr(raw).slice(0, 6).map((t) => {
    const platform = str(t.platform);
    const p = platform.includes('小红书') && platform.includes('抖音') ? '双平台'
      : platform.includes('小红书') ? '小红书'
        : platform.includes('抖音') ? '抖音'
          : '双平台';
    const type = str(t.type, '短视频');
    return {
      id: uid('tp'),
      title: str(t.title, '（未命名选题）'),
      angle: str(t.angle),
      hook: str(t.hook),
      why: str(t.why),
      risk: str(t.risk),
      refComp: str(t.refComp),
      refNote: str(t.refNote),
      platform: p,
      type,
      score: Math.max(1, Math.min(99, Math.round(num(t.score, 80)))),
      liked: false
    };
  });
}

/** 云端生成洞察；结构非法或联网失败时抛错，由调用方回退本地 */
export async function cloudInsights(project, model = '') {
  const brief = project.brief || {};
  const user = [
    '请为下面的品牌与产品，产出一份达人内容「AI 选题洞察」。',
    '要求：贴近小红书/抖音生态，选题有差异化，天然留出合规与转化余地。',
    '',
    `品牌：${brief.brandName || project.name || ''}`,
    `品牌介绍：${(brief.brandIntro || '').slice(0, 1500)}`,
    `产品：${brief.product || ''}`,
    `产品 Brief：${(brief.productBrief || '').slice(0, 1500)}`,
    `投放渠道/备注：${(brief.notes || '').slice(0, 800)}`,
    `竞品：${(brief.competitors || []).join('、')}`,
    '',
    INSIGHTS_SCHEMA
  ].join('\n');

  const text = await chatAI({
    system: '你是资深品牌内容策略专家，精通小红书与抖音达人种草、内容安全合规。回答只输出 JSON。',
    user,
    temperature: 0.6,
    maxTokens: 2600,
    model
  });
  const raw = parseJSON(text);
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.topics) || !raw.topics.length) {
    throw new Error('洞察结构非法');
  }
  return {
    cat: str(raw.cat, '（待补充品类描述）'),
    topics: normalizeTopics(raw.topics),
    hotspots: arr(raw.hotspots).slice(0, 5).map((h) => ({ title: str(h.title, '热点'), detail: str(h.detail) })).filter((h) => h.title !== '热点' || h.detail),
    compliance: arr(raw.compliance).slice(0, 8).map((c) => ({ title: str(c.title, '合规提醒'), detail: str(c.detail) })).filter((c) => c.title !== '合规提醒' || c.detail),
    generatedAt: new Date().toISOString()
  };
}

/* ================= 整合营销策略 ================= */
const STRATEGY_SCHEMA = `只输出一个 JSON 对象，不要任何额外文字或 markdown，结构如下：
{
  "category": "品类",
  "executiveSummary": "结合目标与预算的策略结论",
  "positioning": "本次传播定位与核心信息",
  "audience": "目标人群与洞察",
  "channelStrategies": [{"platform":"平台","role":"渠道角色","content":"内容方向与内容形式","budget":"预算建议","kpi":"建议指标"}],
  "creatorPlan": "达人层级、数量及筛选标准",
  "contentPillars": ["内容支柱"],
  "timeline": [{"phase":"阶段","timing":"时间","actions":"关键动作"}],
  "budgetPlan": [{"item":"预算项","amount":"金额或比例","reason":"分配依据"}],
  "measurement": ["衡量指标与复盘方式"],
  "risks": ["风险与应对"]
}`;

const cleanStrategy = (raw) => {
  const list = (value) => Array.isArray(value) ? value : [];
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  return {
    category: text(raw.category),
    executiveSummary: text(raw.executiveSummary),
    positioning: text(raw.positioning),
    audience: text(raw.audience),
    channelStrategies: list(raw.channelStrategies).slice(0, 8).map((item) => ({
      platform: text(item.platform),
      role: text(item.role),
      content: text(item.content),
      budget: text(item.budget),
      kpi: text(item.kpi)
    })),
    creatorPlan: text(raw.creatorPlan),
    contentPillars: list(raw.contentPillars).filter((item) => typeof item === 'string').slice(0, 10),
    timeline: list(raw.timeline).slice(0, 8).map((item) => ({
      phase: text(item.phase),
      timing: text(item.timing),
      actions: text(item.actions)
    })),
    budgetPlan: list(raw.budgetPlan).slice(0, 10).map((item) => ({
      item: text(item.item),
      amount: text(item.amount),
      reason: text(item.reason)
    })),
    measurement: list(raw.measurement).filter((item) => typeof item === 'string').slice(0, 10),
    risks: list(raw.risks).filter((item) => typeof item === 'string').slice(0, 10)
  };
};

/** Generate or revise a strategy from the user brief and explicitly supplied research results. */
export async function cloudMarketingStrategy({ brief, researchNotes = [], previousStrategy = null, feedback = '', model = '' }) {
  const user = [
    '请为用户制定一份可执行、预算闭环的达人整合营销策略。必须逐项响应用户目标、预算、投放平台和限制条件。',
    '不得编造市场数据、平台热度、达人报价或调研结论；只可将下方实际检索到的笔记作为外部证据，没有证据时明确按经验假设给出建议。',
    '预算分配合计应尽量等于用户预算；若数据不足，标明估算假设。达人数量不得超过用户计划数量（未填写时给出建议数量）。',
    '',
    `用户项目 Brief：\n${JSON.stringify(brief).slice(0, 10000)}`,
    `授权趋势服务实际返回的公开内容数据（可能为空）：\n${JSON.stringify(researchNotes).slice(0, 18000)}`,
    previousStrategy ? `待优化的上一版策略：\n${JSON.stringify(previousStrategy).slice(0, 10000)}` : '',
    feedback ? `用户本轮修改意见（必须落实）：\n${feedback.slice(0, 3000)}` : '',
    '',
    STRATEGY_SCHEMA
  ].filter(Boolean).join('\n');

  const text = await chatAI({
    system: '你是中国消费品牌整合营销负责人，擅长抖音、小红书达人投放、预算规划、内容策略与效果衡量。只输出符合要求的 JSON，不把推测描述成事实。',
    user,
    temperature: 0.45,
    maxTokens: 4200,
    model
  });
  const raw = parseJSON(text);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('策略结果不是有效对象');
  const strategy = cleanStrategy(raw);
  if (!strategy.executiveSummary || !strategy.channelStrategies.length) {
    throw new Error('策略结果缺少核心结论或渠道策略，请重新生成');
  }
  return { ...strategy, generatedAt: new Date().toISOString() };
}

/* ================= 审稿批注 ================= */
const ALLOWED_TYPES = ['compliance', 'content', 'creative', 'sales', 'tech'];
const ALLOWED_SEV = ['block', 'must', 'suggest'];

/** 云端审稿；返回 anns（异常/结构非法抛错，由调用方回退本地） */
export async function cloudReview({ stageKey, doc, brief, project, model = '' }) {
  const ruleNotes = `${brief.notes || ''}\n${brief.complianceText || ''}`.slice(0, 1500);
  const benchmarkNotes = (brief.competitorNotes || []).slice(0, 5).map((note, i) => ({
    index: i + 1,
    platform: note.platform === 'douyin' ? '抖音' : note.platform === 'xiaohongshu' ? '小红书' : '其他',
    competitor: note.competitor || '',
    title: (note.title || '').slice(0, 200),
    content: (note.content || '').slice(0, 1000),
    url: note.url || '',
    engagement: `赞 ${Number(note.likes) || 0} / 评 ${Number(note.comments) || 0} / 转 ${Number(note.shares) || 0}`
  }));
  const user = [
    '你是品牌投放方的资深内容审稿主编。请针对达人的稿子逐段审查并产出修订批注。',
    '',
    `审核阶段：${stageKey}`,
    `品牌：${brief.brandName || ''}`,
    `品牌介绍：${(brief.brandIntro || '').slice(0, 1000)}`,
    `产品 Brief：${(brief.productBrief || '').slice(0, 1200)}`,
    `项目卡审规则 / 拍摄注意事项：${ruleNotes}`,
    `竞品：${(brief.competitors || []).join('、')}`,
    `竞品高互动笔记参考（仅用于分析内容结构与表达，不得照搬原文）：${JSON.stringify(benchmarkNotes)}`,
    '',
    `稿件文本（blocks）：\n${JSON.stringify((doc.blocks || []).map((b) => ({ id: b.id, tag: b.tag, text: (b.text || '').slice(0, 900) })))}`,
    '',
    '输出要求：只输出一个 JSON 数组（不要任何额外文字），3~8 条批注，覆盖合规/内容/转化/创作/技术等维度，越尖锐越具体越好。',
    '每条结构：{"type":"compliance|content|creative|sales|tech","blockId":"必须是上方 blocks 里的 id",',
    '  "where":"定位到块内的具体句子/片段(摘录原文)","suggestion":"具体可执行的修改建议","reason":"为什么(引用品牌要求/合规点)",',
    '  "severity":"block(红线/违规)|must(必须改)|suggest(建议)"}'
  ].join('\n');

  const text = await chatAI({
    system: '你是懂抖音/小红书内容生态、广告法、医疗/功效宣称合规的品牌审稿主编。回答只输出 JSON 数组。',
    user,
    temperature: 0.35,
    maxTokens: 2600,
    model
  });
  const raw = parseJSON(text);
  const items = arr(raw);

  const idSet = new Set((doc.blocks || []).map((b) => b.id));
  const fallbackBlock = doc.blocks && doc.blocks[0];
  const anns = items.slice(0, 8).map((it) => {
    const blockId = idSet.has(it.blockId) ? it.blockId : (fallbackBlock && fallbackBlock.id);
    const block = blockId ? (doc.blocks || []).find((b) => b.id === blockId) : null;
    const type = ALLOWED_TYPES.includes(it.type) ? it.type : 'content';
    const severity = ALLOWED_SEV.includes(it.severity) ? it.severity : 'suggest';
    const original = str(it.where, block ? block.text : '');
    return {
      id: uid('an'),
      type,
      blockId,
      where: original,
      original,
      suggestion: str(it.suggestion),
      reason: str(it.reason),
      severity,
      status: 'open',
      createdAt: new Date().toISOString()
    };
  }).filter((a) => a.suggestion || a.reason);

  if (!anns.length) throw new Error('审稿结果为空');
  return anns;
}
