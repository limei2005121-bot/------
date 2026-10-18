/**
 * AI 后端代理服务（零第三方依赖，Node 18+）
 *
 * 作用：前端不在浏览器里暴露模型 API Key，所有大模型请求统一经此代理转发。
 * 兼容任何「OpenAI Chat Completions 风格」的国内模型：
 *   Kimi(Moonshot) / GLM(智谱) / 通义千问(DashScope 兼容) / DeepSeek / 火山方舟(豆包) …
 *
 * 启动：
 *   cp server/.env.example server/.env   # 按需修改 base/key/model
 *   npm run server                       # 默认监听 http://localhost:8787
 *
 * 前端 dev 模式已配置 Vite 代理：/api → http://localhost:8787，
 * 前端直接请求同源 /api/ai/health、/api/ai/chat 即可。
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);

/* ---------- 加载 server/.env（不依赖 dotenv，简单解析） ---------- */
function loadEnv() {
  const envPath = join(__dirname, '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('export ')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const BASE_URL = (process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
const API_KEY = process.env.AI_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'glm-4-flash';
const TREND_API_URL = process.env.TREND_API_URL || '';
const TREND_API_KEY = process.env.TREND_API_KEY || '';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_API_BASE = (process.env.FEISHU_API_BASE || 'https://open.feishu.cn').replace(/\/+$/, '');
const TIMEOUT_MS = 100 * 1000;
let feishuToken = '';
let feishuTokenExpiresAt = 0;

/* ---------- 小工具 ---------- */
const sendJSON = (res, status, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });

/** 转发到云端 chat/completions */
async function proxyChat(body) {
  const { system = '', user = '', temperature = 0.4, max_tokens: maxTokens = 2200, model: reqModel = '' } = body || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: String(reqModel).trim() || MODEL,
        messages: [
          { role: 'system', content: String(system || '').slice(0, 6000) },
          { role: 'user', content: String(user || '').slice(0, 60000) }
        ],
        temperature: Number(temperature) || 0.4,
        max_tokens: Math.min(Math.max(Number(maxTokens) || 2200, 256), 16000)
      }),
      signal: controller.signal
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) || `上游返回 ${resp.status}`;
      return { ok: false, status: 502, msg };
    }
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) return { ok: false, status: 502, msg: '模型返回内容为空' };
    return { ok: true, status: 200, text };
  } catch (err) {
    const name = err && err.name === 'AbortError' ? '请求超时' : (err && err.message);
    return { ok: false, status: 504, msg: `代理请求失败：${name || '未知错误'}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Query an authorized trend-data provider that follows this app's normalized response contract. */
async function proxyTrendSearch(body) {
  const { platform = 'all', keywords = '', competitors = [], limit = 10 } = body || {};
  if (!TREND_API_URL) {
    return { ok: false, status: 503, msg: '未配置 TREND_API_URL，请使用手动录入或配置合规数据服务' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const resp = await fetch(TREND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TREND_API_KEY ? { Authorization: `Bearer ${TREND_API_KEY}` } : {})
      },
      body: JSON.stringify({
        platform: ['xiaohongshu', 'douyin'].includes(platform) ? platform : 'all',
        keywords: String(keywords).slice(0, 200),
        competitors: Array.isArray(competitors) ? competitors.slice(0, 20).map((x) => String(x).slice(0, 100)) : [],
        limit: Math.min(Math.max(Number(limit) || 10, 1), 30)
      }),
      signal: controller.signal
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, status: 502, msg: (data && data.error) || `数据服务返回 ${resp.status}` };
    }
    if (!Array.isArray(data?.items)) {
      return { ok: false, status: 502, msg: '数据服务响应格式错误：缺少 items 数组' };
    }

    const items = data.items.slice(0, 30).map((item) => {
      let url = '';
      try {
        const parsed = new URL(String(item.url || ''));
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') url = parsed.toString();
      } catch { /* Invalid links are omitted from the normalized result. */ }
      return {
        platform: ['xiaohongshu', 'douyin'].includes(item.platform) ? item.platform : platform,
        competitor: String(item.competitor || '').slice(0, 100),
        title: String(item.title || '').slice(0, 300),
        content: String(item.content || '').slice(0, 5000),
        url,
        author: String(item.author || '').slice(0, 100),
        likes: Math.max(0, Number(item.likes) || 0),
        comments: Math.max(0, Number(item.comments) || 0),
        shares: Math.max(0, Number(item.shares) || 0),
        publishedAt: String(item.publishedAt || '').slice(0, 40)
      };
    }).filter((item) => item.title || item.content || item.url);
    return { ok: true, status: 200, items };
  } catch (err) {
    const name = err && err.name === 'AbortError' ? '请求超时' : (err && err.message);
    return { ok: false, status: 504, msg: `数据服务请求失败：${name || '未知错误'}` };
  } finally {
    clearTimeout(timer);
  }
}

function documentIdFromUrl(value) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw Object.assign(new Error('请提供有效的飞书文档链接'), { status: 400 });
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !(host === 'feishu.cn' || host.endsWith('.feishu.cn') || host === 'larksuite.com' || host.endsWith('.larksuite.com'))) {
    throw Object.assign(new Error('仅支持 HTTPS 飞书 / Lark 文档链接'), { status: 400 });
  }
  const match = url.pathname.match(/^\/docx\/([^/]+)\/?$/);
  if (!match) {
    throw Object.assign(new Error('目前仅支持飞书新版文档链接（/docx/{document_id}），请勿使用表格、知识库或旧版文档链接'), { status: 400 });
  }
  const documentId = decodeURIComponent(match[1]);
  if (!/^[a-zA-Z0-9_-]{27}$/.test(documentId)) {
    throw Object.assign(new Error('飞书文档 ID 格式不正确，请检查链接是否完整'), { status: 400 });
  }
  return documentId;
}

async function getFeishuTenantToken() {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    throw Object.assign(new Error('服务端未配置 FEISHU_APP_ID / FEISHU_APP_SECRET'), { status: 503 });
  }
  if (feishuToken && Date.now() < feishuTokenExpiresAt) return feishuToken;

  const resp = await fetch(`${FEISHU_API_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
    signal: AbortSignal.timeout(10_000)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.code !== 0 || !data.tenant_access_token) {
    throw Object.assign(new Error(data.msg || `获取飞书访问凭证失败（HTTP ${resp.status}）`), { status: 502 });
  }
  feishuToken = data.tenant_access_token;
  feishuTokenExpiresAt = Date.now() + Math.max(60, (Number(data.expire) || 7200) - 300) * 1000;
  return feishuToken;
}

async function readFeishuDocument(url) {
  const documentId = documentIdFromUrl(url);
  const token = await getFeishuTenantToken();
  const resp = await fetch(
    `${FEISHU_API_BASE}/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/raw_content`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
  );
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.code !== 0 || typeof data.data?.content !== 'string') {
    const forbidden = resp.status === 403 || data.code === 1770032;
    const status = forbidden ? 403 : resp.status === 404 ? 404 : 502;
    const msg = forbidden
      ? '飞书应用无权读取此文档。请在文档「添加文档应用」中添加该应用，并确认已开通 docx:document:readonly 权限。'
      : resp.status === 404
        ? '飞书文档不存在或链接已失效'
        : data.msg || `读取飞书文档失败（HTTP ${resp.status}）`;
    throw Object.assign(new Error(msg), { status });
  }
  const content = data.data.content.trim().slice(0, 60_000);
  if (!content) throw Object.assign(new Error('飞书文档内容为空'), { status: 422 });
  return { documentId, content };
}

/* ---------- 路由 ---------- */
const server = createServer(async (req, res) => {
  const url = (req.url || '').split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // 健康检查：前端用它判断当前走「云端大模型」还是「本地模拟引擎」
  if (req.method === 'GET' && url === '/api/ai/health') {
    return sendJSON(res, 200, {
      ok: true,
      configured: Boolean(API_KEY),
      mode: API_KEY ? 'cloud' : 'local',
      base: BASE_URL,
      model: MODEL,
      tip: API_KEY ? `已配置 ${MODEL}` : '未配置 AI_API_KEY，前端将使用本地模拟引擎'
    });
  }

  if (req.method === 'GET' && url === '/api/trends/health') {
    return sendJSON(res, 200, { configured: Boolean(TREND_API_URL) });
  }

  if (req.method === 'POST' && url === '/api/trends/search') {
    const body = await readBody(req);
    const result = await proxyTrendSearch(body);
    if (!result.ok) return sendJSON(res, result.status, { ok: false, error: result.msg });
    return sendJSON(res, 200, { ok: true, items: result.items });
  }

  if (req.method === 'POST' && url === '/api/feishu/document') {
    const body = await readBody(req);
    try {
      const document = await readFeishuDocument(body?.url);
      return sendJSON(res, 200, { ok: true, ...document });
    } catch (err) {
      return sendJSON(res, err.status || 502, { ok: false, error: err.message || '读取飞书文档失败' });
    }
  }

  if (req.method === 'POST' && url === '/api/ai/chat') {
    if (!API_KEY) {
      return sendJSON(res, 400, { ok: false, error: '服务端未配置 AI_API_KEY（见 server/.env）' });
    }
    const body = await readBody(req);
    const r = await proxyChat(body);
    if (!r.ok) return sendJSON(res, r.status, { ok: false, error: r.msg });
    return sendJSON(res, 200, { ok: true, text: r.text });
  }

  return sendJSON(res, 404, { ok: false, error: 'Not Found' });
});

server.listen(PORT, () => {
  const mode = API_KEY ? `云端大模型（${MODEL}）` : '未配置 Key（前端将回退本地模拟引擎）';
  console.log(`[ai-proxy] http://localhost:${PORT}  状态：${mode}`);
  console.log(`[ai-proxy] 上游：${BASE_URL}`);
});
