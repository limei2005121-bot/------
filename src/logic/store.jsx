// =====================================================================
// 数据层：React Context + localStorage 持久化
// 所有「动作」都产出一个新 state，保持简单可控，方便后续接后端。
// =====================================================================
import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { uid, nowText, dayOffset } from './constants.js';
import { buildReviewDoc, reviewBlocks, generateInsights } from './mockAI.js';
import { getEngine, cloudInsights, cloudReview, fetchFeishuDocument } from './aiClient.js';

const STORAGE_KEY = 'grass-planting-platform-v1';
const DEFAULT_AI_MODEL = 'qwen3.8-max';

/* ---------------- 纯工具 ---------------- */
const updProject = (projects, pid, fn) => projects.map((p) => (p.id === pid ? fn(p) : p));
const updKol = (project, kid, fn) => ({ ...project, kols: project.kols.map((k) => (k.id === kid ? fn(k) : k)) });

function newKol(name, link) {
  return {
    id: uid('kol'),
    name,
    docLink: link || '',
    docLinkSource: link ? 'feishu' : '',
    status: 'draft_pending',
    review: null,
    events: [{ ts: nowText(), text: `已上传达人稿件（${name}），等待 AI 审核大纲`, kind: 'upload' }],
    createdAt: nowText(),
    updatedAt: nowText()
  };
}

function pushEvent(kol, text, kind = 'sys') {
  return { ...kol, updatedAt: nowText(), events: [...kol.events, { ts: nowText(), text, kind }] };
}

/* ---------------- 示例演示数据 ---------------- */
function buildSeed() {
  const t = nowText();
  const mkInsights = (project) => generateInsights(project);

  const brief = {
    brandName: '植愈 PURELY',
    brandIntro: '植愈 PURELY 是主打“温和植萃 × 有效成分”的功能性护肤品牌，核心客群为 22-30 岁有熬夜、换季泛红困扰的都市女性。本次为 618 大促前的内容蓄水。',
    brandIntroDocs: [
      { id: 'bi1', kind: 'feishu', title: '植愈品牌手册 · 品牌介绍', url: 'https://bytedance.feishu.cn/docx/purely_brand' },
      { id: 'bi2', kind: 'file', name: '品牌调性定义_v3.txt', size: '12 KB', parsed: true }
    ],
    product: '植愈修护精华 30ml',
    productBrief: '核心卖点：B5 + 积雪草双核心成分修护屏障，质地清爽不黏腻，敏感肌可用。目标人群：熬夜党、换季敏感泛红人群。本次需要 12 条达人内容（小红书图文 + 抖音短视频），预算与执行节奏以排期为准。',
    productBriefDocs: [
      { id: 'pb1', kind: 'feishu', title: '植愈修护精华 · 618 产品 Brief', url: 'https://bytedance.feishu.cn/docx/purely_brief' }
    ],
    notes: '1. 不要提“祛红血丝、根治敏感”等绝对化功效词，只能写“泛红有缓解、帮助修护”；2. 成分功效表述需以成分本身为准，不演绎临床效果；3. 统一使用话题 #植愈焕活季，评论置顶由品牌统一维护；4. 禁止与医生专家身份绑定推荐。',
    shootNotes: '1. 素颜前后对比镜头需自然光下拍摄，不额外磨皮滤镜；2. 产品 LOGO 需完整露出且不被遮挡；3. 每支视频片头保留品牌 3 秒口播提示“品牌合作内容”；4. BGM 使用平台商用曲库正版音源。',
    competitors: ['修丽可色修精华', '薇诺娜舒敏保湿特护霜', '理肤泉 B5 修复霜'],
    benchmarkLinks: [
      'https://www.douyin.com/video/72xxx（对标本：泛红修护实测）',
      'https://www.xiaohongshu.com/explore/6xxx（对标图文：敏感肌成分党拆解）'
    ],
    benchmarkVideos: [
      { id: 'f1', name: '竞品爆款_泛红修护实测_34s.mp4', size: '18.6 MB', blob: null },
      { id: 'f2', name: '成分党拆解B5修护_图文素材.mp4', size: '9.2 MB', blob: null }
    ]
  };

  const seedProject = {
    id: uid('proj'),
    name: '植愈精华 · 618 达人种草',
    brandName: brief.brandName,
    category: '美妆护肤',
    channel: '抖音 + 小红书',
    brief,
    insights: mkInsights({ name: '植愈精华 · 618 达人种草', brief }),
    kols: [],
    createdAt: dayOffset(-12),
    updatedAt: t
  };

  // 构造不同状态的达人稿件
  const kol = (name, status, extra = {}) => {
    const base = newKol(name, `https://bytedance.feishu.cn/docx/${name.replace(/[^a-zA-Z]/g, '').toLowerCase()}_demo`);
    return { ...base, status, docLinkSource: 'demo', ...extra };
  };

  const kols = [
    // 1) 待 AI 审大纲（干净起始态，供现场演示一键审稿）
    pushEvent(kol('林小鹿 Lin', 'draft_pending', { docLink: 'https://bytedance.feishu.cn/docx/linxl_0312' }), '等待启动 AI 审稿', 'upload'),
    // 2) 大纲已审待用户确认（演示用户复核批注）
    buildPending('奶盐汽水', 'draft_pending'),
    // 3) 达人正在修改大纲 → 已确认
    kol('苏打泡泡', 'draft_revising', { docLink: 'https://bytedance.feishu.cn/docx/soda_0311' }),
    // 4) 脚本待审核（带 AI 批注待确认）
    buildPending('一颗奶冻', 'script_pending'),
    // 5) 达人脚本修改中
    kol('阿呜漫游', 'script_revising'),
    // 6) 拍摄中
    kol('桃桃乌龙', 'shooting'),
    // 7) 视频待审核 + 已确认批注（演示“已确认”的已阅态）
    buildPending('Momo酱', 'video_pending'),
    // 8) 定稿待发布
    {
      ...pushEvent(kol('夏日气泡水', 'done', { docLink: 'https://bytedance.feishu.cn/docx/bubble_0308' }), '达人修改完成，已确认定稿'),
      publish: { platform: '小红书 · 图文', publishAt: dayOffset(2) }
    }
  ].map((k, i) => ({
    ...k,
    id: uid('kol'),
    createdAt: dayOffset(-8 + i),
    updatedAt: k.updatedAt || nowText()
  }));

  function buildPending(name, stageKey) {
    const doc = buildReviewDoc(stageKey, { name });
    const anns = reviewBlocks({ stageKey, doc, brief, project: seedProject });
    const k = kol(name, stageKey, { docLink: 'https://bytedance.feishu.cn/docx/' + encodeURIComponent(name) });
    k.review = {
      stageKey,
      doc,
      anns,
      status: 'awaiting',       // awaiting: AI 已生成、等用户复核确认
      createdAt: t
    };
    return pushEvent(k, `AI 已完成${stageKey === 'draft_pending' ? '大纲' : stageKey === 'script_pending' ? '脚本' : '视频'}审稿，等待您复核批注`, 'ai');
  }

  seedProject.kols = kols;
  seedProject.insights = seedProject.insights;

  return [seedProject];
}

/* ---------------- 持久化 ---------------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects)) {
        return { ...parsed, aiModel: parsed.aiModel || DEFAULT_AI_MODEL };
      }
    }
  } catch (e) { /* ignore */ }
  return { projects: buildSeed(), bootedAt: nowText(), aiModel: DEFAULT_AI_MODEL };
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ---------------- Context ---------------- */
const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);

  // 始终指向最新 state，供异步动作（云端 AI 生成）读取当前项目数据
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = (fn) => setState((prev) => {
    const next = fn(prev);
    saveState(next);
    return next;
  });
  const getProject = (pid) => stateRef.current.projects.find((p) => p.id === pid);

  const api = useMemo(() => {
    /**
     * AI 洞察：云端大模型优先；未配置 / 联网失败时自动回退本地模拟引擎。
     * forceCloud=true 表示已确认云端可用，直接请求云端，失败再回退。
     * 返回实际使用的引擎：'cloud' | 'local'
     */
    async function makeInsightFor(pid, forceCloud = false) {
      const src = getProject(pid);
      if (!src) return 'local';
      let insights = null;
      let used = 'local';
      const wantCloud = forceCloud || (await getEngine()).mode === 'cloud';
      if (wantCloud) {
        try {
          insights = await cloudInsights(src, stateRef.current.aiModel || '');
          used = 'cloud';
        } catch (e) {
          console.warn('[AI] 云端洞察失败，回退本地引擎：', e && e.message);
        }
      }
      if (!insights) insights = generateInsights(src);
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (p) => ({ ...p, insights, updatedAt: nowText() }))
      }));
      return used;
    }

    /** Read linked Feishu documents before review; never substitute demo feedback for real drafts. */
    async function makeReviewFor(pid, kid, stageKey) {
      const proj = getProject(pid);
      const kol = proj && proj.kols.find((k) => k.id === kid);
      if (!proj || !kol) throw new Error('项目或达人稿件不存在，请刷新页面后重试');
      let doc;
      const hasDocxToken = /^https:\/\/[^/]*(?:feishu\.cn|larksuite\.com)\/docx\/[a-zA-Z0-9_-]{27}\/?(?:[?#].*)?$/.test(kol.docLink || '');
      const shouldReadFeishu = Boolean(kol.docLink) && (
        kol.docLinkSource === 'feishu' || (kol.docLinkSource !== 'demo' && hasDocxToken)
      );
      if (shouldReadFeishu) {
        const fetched = await fetchFeishuDocument(kol.docLink);
        doc = buildReviewDoc(stageKey, kol, fetched.content, 'feishu');
        doc.fetchedAt = nowText();
        doc.documentId = fetched.documentId;
      } else {
        doc = buildReviewDoc(stageKey, kol);
      }
      let anns = null;
      let used = 'local';
      if ((await getEngine()).mode === 'cloud') {
        try {
          anns = await cloudReview({ stageKey, doc, brief: (proj && proj.brief) || {}, project: proj, model: stateRef.current.aiModel || '' });
          used = 'cloud';
        } catch (e) {
          console.warn('[AI] 云端审稿失败，回退本地引擎：', e && e.message);
          if (doc.source !== 'demo') {
            throw new Error(`已读取稿件正文，但云端 AI 审稿失败：${e.message || '请检查模型配置后重试'}`);
          }
        }
      }
      if (doc.source !== 'demo' && used !== 'cloud') {
        throw new Error('已读取稿件正文，但未配置可用的云端 AI。真实稿件不会使用演示规则代替审核，请先配置 AI_API_KEY 后重试');
      }
      if (!anns) anns = reviewBlocks({ stageKey, doc, brief: (proj && proj.brief) || {}, project: proj });
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (p) =>
          updKol(p, kid, (k) => {
            const review = { stageKey, doc, anns, status: 'awaiting', createdAt: nowText() };
            const k2 = { ...k, review, status: stageKey };
            return pushEvent(k2, `AI 已完成${labelOf(stageKey)}审稿，等待您复核批注`, 'ai');
          }))
      }));
      return used;
    }

    return {
    state,

    // —— 项目 ——
    createProject(form) {
      const now = nowText();
      const project = {
        id: uid('proj'),
        name: form.name,
        brandName: form.brandName || '',
        category: form.category || '',
        channel: form.channel || '抖音 + 小红书',
        strategy: form.strategy || null,
        researchMessage: form.researchMessage || '',
        researchNotes: form.researchNotes || [],
        brief: {
          brandName: form.brandName || '',
          brandIntro: form.brandIntro || '',
          brandIntroDocs: form.brandIntroDocs || [],
          product: form.product || '',
          productBrief: form.productBrief || '',
          productBriefDocs: form.productBriefDocs || [],
          campaignGoal: form.campaignGoal || '',
          targetAudience: form.targetAudience || '',
          budget: form.budget || '',
          plannedQuantity: form.plannedQuantity || '',
          campaignPeriod: form.campaignPeriod || '',
          channels: form.channels || [],
          notes: form.notes || '',
          shootNotes: form.shootNotes || '',
          competitors: form.competitors || [],
          benchmarkVideos: form.benchmarkVideos || [],
          benchmarkLinks: form.benchmarkLinks || [],
          competitorNotes: form.researchNotes || form.competitorNotes || []
        },
        kols: [],
        createdAt: dayOffset(0),
        updatedAt: now
      };
      // 本地引擎先生成洞察（必须在 project 对象定义完成后调用，避免 TDZ 引用自身）
      if (form.genInsight !== false) project.insights = generateInsights(project);
      commit((s) => ({ ...s, projects: [project, ...s.projects] }));
      // 若配置了云端大模型，则创建后后台用云端重新生成一次洞察（本地已即时生成，创建过程不等待）
      if (form.genInsight !== false) {
        getEngine().then((eng) => {
          if (eng && eng.mode === 'cloud') makeInsightFor(project.id, true).catch(() => {});
        });
      }
      return project.id;
    },

    patchProject(pid, patch) {
      commit((s) => ({ ...s, projects: updProject(s.projects, pid, (p) => ({ ...p, ...patch, updatedAt: nowText() })) }));
    },

    removeProject(pid) {
      commit((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== pid) }));
    },

    patchBrief(pid, briefPatch) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (p) => ({ ...p, brief: { ...p.brief, ...briefPatch }, updatedAt: nowText() }))
      }));
    },

    // —— AI 洞察 ——
    async generateInsight(pid) {
      return makeInsightFor(pid);
    },

    // —— 达人稿件 ——
    addKol(pid, { name, link, draftContent = '' }) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (p) => ({
          ...p,
          kols: [...p.kols, { ...newKol(name, link), docLinkSource: link ? 'feishu' : '', drafts: draftContent ? { draft_pending: draftContent } : {} }],
          updatedAt: nowText()
        }))
      }));
    },

    saveKolDraft(pid, kid, stageKey, content) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (p) =>
          updKol(p, kid, (k) => {
            const drafts = { ...(k.drafts || {}) };
            if (content.trim()) drafts[stageKey] = content.trim();
            else delete drafts[stageKey];
            return pushEvent({
              ...k,
              drafts,
              review: k.review?.stageKey === stageKey ? null : k.review
            }, `已更新${labelOf(stageKey)}稿件正文`, 'upload');
          }))
      }));
    },

    saveKolDocLink(pid, kid, link) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (p) =>
          updKol(p, kid, (k) => pushEvent({
            ...k,
            docLink: link.trim(),
            docLinkSource: link.trim() ? 'feishu' : '',
            review: null
          }, link.trim() ? '已更新飞书稿件链接' : '已移除飞书稿件链接', 'upload')))
      }));
    },

    removeKol(pid, kid) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (p) => ({ ...p, kols: p.kols.filter((k) => k.id !== kid) }))
      }));
    },

    // 手动推进状态（用户确认达人已完成修改 / 进入下一阶段）
    advanceStage(pid, kid, to, text) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (proj) =>
          updKol(proj, kid, (k) => pushEvent({ ...k, status: to, review: null }, text, 'flow')))
      }));
    },

    // 开始 AI 审稿（云端大模型优先，失败自动回退本地）
    async runReview(pid, kid, stageKey) {
      return makeReviewFor(pid, kid, stageKey);
    },

    // 用户编辑批注后保存
    saveReviewAnnotations(pid, kid, anns) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (proj) =>
          updKol(proj, kid, (k) => ({ ...k, review: k.review ? { ...k.review, anns } : k.review, updatedAt: nowText() })))
      }));
    },

    // 用户确认批注 → 状态切到“达人修改中”
    confirmReview(pid, kid) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (proj) =>
          updKol(proj, kid, (k) => {
            const nextStatus = revisingOf(k.review.stageKey);
            return pushEvent({ ...k, status: nextStatus, review: { ...k.review, status: 'confirmed', confirmedAt: nowText() } },
              `您已确认批注，已通过飞书通知达人按 ${labelOf(k.review.stageKey)} 修改意见修改`, 'user');
          }))
      }));
    },

    // 发布计划
    setPublish(pid, kid, publish) {
      commit((s) => ({
        ...s,
        projects: updProject(s.projects, pid, (proj) =>
          updKol(proj, kid, (k) => pushEvent({ ...k, publish }, '已设定发布计划：' + (publish.platform || '') + ' · ' + (publish.publishAt || ''), 'flow')))
      }));
    },

    // 大模型选择（写入应用级状态并持久化；云端调用按此模型发起）
    setAiModel(model) {
      const m = (model || '').trim();
      commit((s) => ({ ...s, aiModel: m || DEFAULT_AI_MODEL }));
    },

    // 演示控制
    resetDemo() {
      const fresh = { projects: buildSeed(), bootedAt: nowText(), aiModel: stateRef.current.aiModel || DEFAULT_AI_MODEL };
      saveState(fresh);
      setState(fresh);
    },
    clearAll() {
      const fresh = { projects: [], bootedAt: nowText(), aiModel: stateRef.current.aiModel || DEFAULT_AI_MODEL };
      saveState(fresh);
      setState(fresh);
    }
    };
  }, [state]);

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>;
}

function labelOf(stageKey) {
  return { draft_pending: '大纲', script_pending: '脚本', video_pending: '视频' }[stageKey] || '内容';
}

function revisingOf(stageKey) {
  return { draft_pending: 'draft_revising', script_pending: 'script_revising', video_pending: 'video_revising' }[stageKey];
}

export function useApp() {
  return useContext(AppCtx);
}
