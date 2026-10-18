import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../logic/store.jsx';
import { getEngine, getTrendServiceStatus, searchTrendNotes, cloudMarketingStrategy } from '../logic/aiClient.js';
import { uid } from '../logic/constants.js';
import { Modal, Icon, TagInput, Chip } from './common.jsx';
import BriefDocInput from './BriefDocInput.jsx';

const CHANNELS = [
  { key: 'douyin', label: '抖音' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'bilibili', label: 'B站' },
  { key: 'weibo', label: '微博' }
];

function Field({ label, req, hint, children }) {
  return (
    <div className="field">
      <label>{req && <span className="req">*</span>}{label}{hint && <span className="hint">{hint}</span>}</label>
      {children}
    </div>
  );
}

export default function NewProjectModal({ onClose, onCreate }) {
  const { state } = useApp();
  const [form, setForm] = useState({
    name: '', brandName: '', brandIntro: '', brandIntroDocs: [], product: '', productBrief: '',
    productBriefDocs: [], channels: ['douyin', 'xiaohongshu'], campaignGoal: '',
    targetAudience: '', budget: '', plannedQuantity: '', campaignPeriod: '',
    notes: '', shootNotes: '', competitors: [], benchmarkLinks: [], benchmarkVideos: []
  });
  const [phase, setPhase] = useState('brief');
  const [strategy, setStrategy] = useState(null);
  const [researchNotes, setResearchNotes] = useState([]);
  const [researchMessage, setResearchMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const fileRef = useRef(null);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const channelNames = useMemo(
    () => form.channels.map((key) => CHANNELS.find((channel) => channel.key === key)?.label).filter(Boolean),
    [form.channels]
  );

  const addVideos = (files) => {
    const videos = Array.from(files || []).map((file) => ({
      id: uid('fv'), name: file.name, size: formatSize(file.size), blob: URL.createObjectURL(file)
    }));
    set('benchmarkVideos', [...form.benchmarkVideos, ...videos]);
  };

  const validate = () => {
    if (!form.name.trim()) return '请填写项目名称';
    if (!form.brandName.trim()) return '请填写品牌名称';
    if (!form.product.trim()) return '请填写主推产品';
    if (!form.campaignGoal.trim()) return '请明确本次投放目标';
    if (!form.budget || Number(form.budget) <= 0) return '请填写大于 0 的总预算';
    if (!form.channels.length) return '请至少选择一个投放平台';
    return '';
  };

  const generate = async (revise = false) => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setPhase('brief');
      return;
    }
    if (revise && !feedback.trim()) {
      setError('请先写下希望调整的方向或意见');
      return;
    }
    setBusy(true);
    setError('');
    setResearchMessage('正在检查授权趋势数据服务…');
    try {
      const engine = await getEngine(true);
      if (engine.mode !== 'cloud') {
        throw new Error('当前未连接云端大模型。请启动 AI 代理并配置 AI_API_KEY 后重试；为避免把模拟内容当成真实策略，系统不会用本地模板代替。');
      }

      let notes = researchNotes;
      let statusMessage = '未配置授权趋势数据服务，本次策略仅依据您填写的 Brief 与模型知识生成，不包含实时平台检索。';
      try {
        const trendStatus = await getTrendServiceStatus();
        if (trendStatus?.configured) {
          setResearchMessage('正在通过授权趋势数据服务检索所选平台的公开内容…');
          const platforms = form.channels.filter((channel) => ['douyin', 'xiaohongshu'].includes(channel));
          const queries = platforms.length ? platforms : ['all'];
          const results = await Promise.all(queries.map(async (platform) => {
            try {
              return await searchTrendNotes({
                platform,
                keywords: `${form.brandName} ${form.product} ${form.campaignGoal}`.trim(),
                competitors: form.competitors,
                limit: 10
              });
            } catch (searchError) {
              return { error: searchError.message || '检索失败', platform };
            }
          }));
          const failures = results.filter((result) => !Array.isArray(result));
          notes = results.filter(Array.isArray).flat();
          statusMessage = failures.length
            ? `已检索到 ${notes.length} 条参考内容；部分平台检索失败：${failures.map((item) => CHANNELS.find((channel) => channel.key === item.platform)?.label || item.platform).join('、')}。`
            : `授权趋势服务已返回 ${notes.length} 条参考内容${notes.length ? '，模型将结合这些内容分析' : '，本次没有匹配内容'}。`;
        }
      } catch (trendError) {
        statusMessage = `趋势数据服务检查失败：${trendError.message || '未知错误'}。策略将不包含实时平台检索。`;
      }

      setResearchMessage(`${statusMessage} 正在生成整合营销策略…`);
      const brief = {
        ...form,
        name: form.name.trim(),
        brandName: form.brandName.trim(),
        product: form.product.trim(),
        channels: channelNames
      };
      const nextStrategy = await cloudMarketingStrategy({
        brief,
        researchNotes: notes,
        previousStrategy: revise ? strategy : null,
        feedback: revise ? feedback.trim() : '',
        model: state.aiModel || ''
      });
      setResearchNotes(notes);
      setResearchMessage(statusMessage);
      setStrategy(nextStrategy);
      setFeedback('');
      if (revise) setRevision((count) => count + 1);
      setPhase('strategy');
    } catch (generationError) {
      setError(generationError.message || '策略生成失败，请检查模型与数据服务后重试');
    } finally {
      setBusy(false);
    }
  };

  const confirmStrategy = () => {
    if (!strategy) return;
    onCreate({
      ...form,
      name: form.name.trim(),
      brandName: form.brandName.trim(),
      channel: channelNames.join(' + '),
      channels: undefined,
      category: strategy.category || '',
      strategy,
      researchNotes,
      researchMessage,
      genInsight: true
    });
  };

  return (
    <Modal
      title={phase === 'brief' ? '新建整合营销项目' : '整合营销策略确认'}
      sub={phase === 'brief'
        ? '先填写目标、预算与项目 Brief；AI 调研和策略确认完成后，才会创建达人执行项目。'
        : '您可以提出修改意见让 AI 继续优化；确认后才会创建项目并进入达人执行看板。'}
      width={1040}
      onClose={onClose}
      footer={phase === 'brief' ? (
        <>
          <span className="flex1 muted small" style={{ textAlign: 'left' }}>
            <Icon name="shield" size={13} style={{ color: 'var(--brand)', verticalAlign: -2 }} /> 此阶段不会创建项目或执行看板
          </span>
          {error && <span className="campaign-error">{error}</span>}
          <button className="btn btn-secondary" disabled={busy} onClick={onClose}>取消</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => generate(false)}>
            {busy ? <><span className="spin" /> AI 调研与生成中…</> : <><Icon name="spark" size={14} /> AI 调研并制定策略</>}
          </button>
        </>
      ) : (
        <>
          <span className="flex1 muted small" style={{ textAlign: 'left' }}>当前版本已优化 {revision} 次；确认后将保存此方案。</span>
          {error && <span className="campaign-error">{error}</span>}
          <button className="btn btn-secondary" disabled={busy} onClick={() => { setPhase('brief'); setError(''); }}>返回修改 Brief</button>
          <button className="btn btn-brand-ghost" disabled={busy} onClick={() => generate(true)}>
            {busy ? <><span className="spin" /> 正在优化…</> : <><Icon name="refresh" size={14} /> 按意见优化</>}
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={confirmStrategy}><Icon name="check" size={14} /> 确认方案并创建项目</button>
        </>
      )}
    >
      {phase === 'brief' ? (
        <div className="campaign-setup">
          <div className="campaign-steps">
            <span className="active"><b>1</b> 项目信息与目标</span><i />
            <span><b>2</b> AI 调研与策略</span><i />
            <span><b>3</b> 用户确认后创建执行项目</span>
          </div>
          <section className="campaign-form-section">
            <h4>项目信息与目标</h4>
            <div className="campaign-form-grid">
              <Field label="项目名称" req><input className="input" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="例如：秋季新品抖音种草" /></Field>
              <Field label="品牌名称" req><input className="input" value={form.brandName} onChange={(event) => set('brandName', event.target.value)} placeholder="品牌 / 商家名称" /></Field>
              <Field label="主推产品" req><input className="input" value={form.product} onChange={(event) => set('product', event.target.value)} placeholder="产品名称、型号或服务" /></Field>
              <Field label="总预算（元）" req><input className="input" type="number" min="1" value={form.budget} onChange={(event) => set('budget', event.target.value)} placeholder="例如：200000" /></Field>
              <Field label="计划达人 / 内容数量" hint="可暂不确定"><input className="input" type="number" min="1" value={form.plannedQuantity} onChange={(event) => set('plannedQuantity', event.target.value)} placeholder="例如：20 位达人 / 30 条内容" /></Field>
              <Field label="投放周期" hint="可填写期望档期"><input className="input" value={form.campaignPeriod} onChange={(event) => set('campaignPeriod', event.target.value)} placeholder="例如：11 月上旬，持续 3 周" /></Field>
            </div>
            <Field label="本次投放目标" req hint="例如新品认知、种草引流、直播间转化、搜索占位">
              <textarea className="textarea compact" rows={2} value={form.campaignGoal} onChange={(event) => set('campaignGoal', event.target.value)} placeholder="描述业务目标、核心转化行为或希望达成的结果" />
            </Field>
            <Field label="目标人群" hint="年龄、地域、兴趣、消费特征或待解决的问题">
              <textarea className="textarea compact" rows={2} value={form.targetAudience} onChange={(event) => set('targetAudience', event.target.value)} placeholder="写明核心人群；留空时请 AI 根据产品信息提出假设" />
            </Field>
            <Field label="投放平台" hint="AI 将按所选渠道规划内容与预算">
              <div className="channel-pick">{CHANNELS.map((channel) => (
                <button key={channel.key} type="button" className={`chan ${form.channels.includes(channel.key) ? 'on' : ''}`}
                  onClick={() => set('channels', form.channels.includes(channel.key)
                    ? form.channels.filter((key) => key !== channel.key) : [...form.channels, channel.key])}>{channel.label}</button>
              ))}</div>
            </Field>
          </section>

          <section className="campaign-form-section">
            <h4>品牌 / 产品前置资料</h4>
            <Field label="品牌介绍" hint="品牌定位、品牌调性、目标市场及可用资产">
              <BriefDocInput docs={form.brandIntroDocs} onDocs={(value) => set('brandIntroDocs', value)}
                text={form.brandIntro} onText={(value) => set('brandIntro', value)} rows={3}
                parsePlaceholder="介绍品牌定位、核心优势、品牌调性、历史活动或必须遵守的表达…" />
            </Field>
            <Field label="产品 Brief" hint="核心卖点、价格、差异化、产品证明材料等">
              <BriefDocInput docs={form.productBriefDocs} onDocs={(value) => set('productBriefDocs', value)}
                text={form.productBrief} onText={(value) => set('productBrief', value)} rows={3}
                parsePlaceholder={'核心卖点：\n建议零售价 / 活动价格：\n产品差异点与依据：\n其他要求：'} />
            </Field>
          </section>

          <section className="campaign-form-section">
            <h4>竞品、内容参考与执行约束</h4>
            <Field label="竞品 / 对标品牌"><TagInput tags={form.competitors} onChange={(value) => set('competitors', value)} placeholder="输入竞品名称后回车添加" /></Field>
            <Field label="抖音 / 小红书对标链接" hint="每行一个公开链接，策略将结合链接信息与可用的授权检索结果">
              <textarea className="textarea compact" rows={2} value={form.benchmarkLinks.join('\n')}
                onChange={(event) => set('benchmarkLinks', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} placeholder="https://…" />
            </Field>
            <Field label="种草内容注意事项" hint="红线词、必须出现的话题、平台合规要求">
              <textarea className="textarea compact" rows={2} value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="填写禁用表述、必带话题、促销规则等" />
            </Field>
            <div className="campaign-form-grid">
              <Field label="拍摄注意事项"><textarea className="textarea compact" rows={2} value={form.shootNotes} onChange={(event) => set('shootNotes', event.target.value)} placeholder="镜头、露出、素材、BGM 等硬性要求" /></Field>
              <Field label="对标视频素材" hint="仅在本浏览器会话预览">
                <div className="row gap8">
                  <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={13} /> 上传视频</button>
                  <span className="small muted">{form.benchmarkVideos.length} 个文件</span>
                  <input ref={fileRef} type="file" accept="video/*" multiple hidden onChange={(event) => { addVideos(event.target.files); event.target.value = ''; }} />
                </div>
                {form.benchmarkVideos.map((video) => <div key={video.id} className="campaign-file">{video.name}
                  <button className="btn btn-ghost btn-sm" onClick={() => set('benchmarkVideos', form.benchmarkVideos.filter((item) => item.id !== video.id))}><Icon name="close" size={12} /></button>
                </div>)}
              </Field>
            </div>
          </section>
        </div>
      ) : (
        <div className="campaign-strategy">
          <div className="campaign-steps">
            <span className="done"><b>1</b> 项目信息与目标</span><i />
            <span className="active"><b>2</b> AI 调研与策略</span><i />
            <span><b>3</b> 用户确认后创建执行项目</span>
          </div>
          <div className="campaign-research">
            <div className="row gap8"><Icon name="search" size={15} /><b>调研来源与状态</b></div>
            <div className="small muted">{researchMessage}</div>
            <div className="row gap8 campaign-source-chips">
              <Chip color={researchNotes.length ? 'chip-green' : 'chip-orange'}>{researchNotes.length ? `平台参考内容 ${researchNotes.length} 条` : '无实时平台检索数据'}</Chip>
              <Chip color="chip-blue">策略模型：{state.aiModel || '当前默认模型'}</Chip>
              <Chip color="chip-gray">人工提供的 Brief / 竞品 / 对标链接</Chip>
            </div>
            {researchNotes.length > 0 && <div className="campaign-research-list">{researchNotes.slice(0, 8).map((note, index) => (
              <div key={`${note.url}-${index}`} className="campaign-research-item">
                <Chip color={note.platform === 'douyin' ? 'chip-blue' : 'chip-red'}>{note.platform === 'douyin' ? '抖音' : '小红书'}</Chip>
                <span className="flex1">{note.title || note.content?.slice(0, 100) || '平台内容参考'}</span>
                {note.url && <a href={note.url} target="_blank" rel="noreferrer">查看来源</a>}
                <span className="muted small">赞 {note.likes || 0} · 评 {note.comments || 0}</span>
              </div>
            ))}</div>}
          </div>
          {strategy && <StrategyPreview strategy={strategy} />}
          <section className="campaign-feedback">
            <label htmlFor="campaign-feedback">您希望如何调整这份方案？</label>
            <textarea id="campaign-feedback" className="textarea" rows={3} value={feedback} onChange={(event) => setFeedback(event.target.value)}
              placeholder="例如：预算重点放在抖音转化、增加腰部达人、把档期提前一周；AI 会基于当前方案和意见重新优化。" />
          </section>
          {busy && <div className="campaign-progress"><span className="spin" /> {researchMessage}</div>}
          {error && <div className="campaign-inline-error">{error}</div>}
        </div>
      )}
    </Modal>
  );
}

function StrategyPreview({ strategy }) {
  return (
    <div className="campaign-plan">
      <div className="campaign-plan-head">
        <div><div className="campaign-kicker">AI INTEGRATED MARKETING PLAN</div><h3>整合营销策略建议</h3></div>
        <Chip color="chip-green">待您确认</Chip>
      </div>
      <div className="campaign-summary">{strategy.executiveSummary}</div>
      <div className="campaign-plan-grid">
        <section><h4>传播定位</h4><p>{strategy.positioning || '—'}</p></section>
        <section><h4>目标人群</h4><p>{strategy.audience || '—'}</p></section>
        <section className="wide"><h4>达人策略</h4><p>{strategy.creatorPlan || '—'}</p></section>
      </div>
      <section className="campaign-plan-section">
        <h4>渠道策略</h4>
        {strategy.channelStrategies.map((item, index) => <article key={`${item.platform}-${index}`} className="campaign-plan-row">
          <b>{item.platform || '渠道'}</b><span>{item.role}</span><p>{item.content}</p><small>预算：{item.budget || '待细化'}　·　指标：{item.kpi || '待设定'}</small>
        </article>)}
      </section>
      <div className="campaign-plan-grid">
        <section><h4>内容支柱</h4><ul>{strategy.contentPillars.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
        <section><h4>预算建议</h4><ul>{strategy.budgetPlan.map((item, index) => <li key={index}><b>{item.item}</b>：{item.amount} — {item.reason}</li>)}</ul></section>
        <section className="wide"><h4>执行节奏</h4><div className="campaign-timeline">{strategy.timeline.map((item, index) => <article key={index}><b>{item.phase} · {item.timing}</b><p>{item.actions}</p></article>)}</div></section>
        <section><h4>衡量与复盘</h4><ul>{strategy.measurement.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
        <section><h4>风险与应对</h4><ul>{strategy.risks.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
      </div>
      <div className="campaign-generated-at">生成于 {new Date(strategy.generatedAt).toLocaleString()}</div>
    </div>
  );
}

function formatSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}
