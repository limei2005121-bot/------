import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../logic/store.jsx';
import { uid } from '../../logic/constants.js';
import { Icon, TagInput, Chip, useToast } from '../common.jsx';
import BriefDocInput from '../BriefDocInput.jsx';
import { getTrendServiceStatus, searchTrendNotes } from '../../logic/aiClient.js';

function Field({ label, hint, children, req }) {
  return (
    <div className="field">
      <label>{req && <span className="req">*</span>}{label}{hint && <span className="hint">{hint}</span>}</label>
      {children}
    </div>
  );
}

export default function BriefTab({ project }) {
  const api = useApp();
  const { toast } = useToast();
  const [b, setB] = useState(() => ({ ...(project.brief || {}) }));
  const fileRef = useRef(null);
  const dirty = JSON.stringify(b) !== JSON.stringify(project.brief || {});
  const [trendReady, setTrendReady] = useState(false);
  const [trendBusy, setTrendBusy] = useState(false);
  const [trendError, setTrendError] = useState('');
  const [trendQuery, setTrendQuery] = useState('');
  const [trendPlatform, setTrendPlatform] = useState('all');
  const [manualNote, setManualNote] = useState({ platform: 'xiaohongshu', competitor: '', title: '', content: '', url: '' });

  const set = (k, v) => setB((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let active = true;
    getTrendServiceStatus()
      .then((status) => { if (active) setTrendReady(Boolean(status?.configured)); })
      .catch(() => { if (active) setTrendReady(false); });
    return () => { active = false; };
  }, []);

  const addCompetitorNotes = (notes) => {
    const current = b.competitorNotes || [];
    set('competitorNotes', [...current, ...notes.map((note) => ({ id: uid('ref'), ...note }))]);
  };

  const searchTrends = async () => {
    if (!trendQuery.trim() && !(b.competitors || []).length) {
      setTrendError('请输入搜索词或先填写主要竞品名称');
      return;
    }
    setTrendBusy(true);
    setTrendError('');
    try {
      const results = await searchTrendNotes({
        platform: trendPlatform,
        keywords: trendQuery.trim(),
        competitors: b.competitors || [],
        limit: 10
      });
      addCompetitorNotes(results);
      toast(results.length ? `已找到 ${results.length} 条笔记，请保存项目信息` : '数据服务未返回匹配笔记');
    } catch (error) {
      setTrendError(error.message || '搜索失败，请检查数据服务配置后重试');
    } finally {
      setTrendBusy(false);
    }
  };

  const addManualNote = () => {
    if (!manualNote.title.trim() || !manualNote.content.trim()) {
      setTrendError('手动添加素材时，标题和笔记正文不能为空');
      return;
    }
    addCompetitorNotes([{
      ...manualNote,
      title: manualNote.title.trim(),
      content: manualNote.content.trim(),
      likes: 0,
      comments: 0,
      shares: 0
    }]);
    setManualNote({ ...manualNote, title: '', content: '', url: '' });
    setTrendError('');
    toast('已添加竞品笔记，请保存项目信息');
  };

  const addVideos = (files) => {
    const arr = Array.from(files || []).map((f) => ({
      id: uid('fv'), name: f.name, size: fmt(f.size), blob: URL.createObjectURL(f)
    }));
    set('benchmarkVideos', [...(b.benchmarkVideos || []), ...arr]);
  };

  const save = () => {
    api.patchBrief(project.id, b);
    toast('项目前置信息已保存，AI 审稿规则将即时生效');
  };

  const head = (
    <div className="card mt16">
      <div className="brief-head row-between">
        <div className="row gap8">
          <b>项目前置信息</b>
          <Chip color={dirty ? 'chip-orange' : 'chip-gray'}>{dirty ? '有未保存修改' : '已同步'}</Chip>
          <span className="muted small">这些信息将作为 AI 审稿的判据与卡审规则库</span>
        </div>
        <div className="row gap8">
          <button className="btn btn-secondary btn-sm" onClick={() => { api.generateInsight(project.id); toast('已用最新信息重新生成 AI 洞察'); }}>
            <Icon name="refresh" size={14} /> 重新生成洞察
          </button>
          <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={save}><Icon name="check" size={14} /> 保存修改</button>
        </div>
      </div>

      <div className="brief-cols">
        <div>
          <Field label="品牌介绍" hint="支持飞书文档链接 / 上传文件">
            <BriefDocInput
              docs={b.brandIntroDocs || []}
              onDocs={(v) => set('brandIntroDocs', v)}
              text={b.brandIntro || ''}
              onText={(v) => set('brandIntro', v)}
              rows={3}
            />
          </Field>
          <Field label="种草内容注意事项" hint="红线词、必须出现的话题、禁止表述">
            <textarea className="textarea" rows={6} value={b.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
        <div>
          <Field label="产品 Brief" hint="卖点 / 目标人群 / 数量排期，支持飞书文档链接 / 上传文件">
            <BriefDocInput
              docs={b.productBriefDocs || []}
              onDocs={(v) => set('productBriefDocs', v)}
              text={b.productBrief || ''}
              onText={(v) => set('productBrief', v)}
              rows={3}
            />
          </Field>
          <Field label="拍摄注意事项" hint="镜头 / 露出 / BGM / 素材要求">
            <textarea className="textarea" rows={6} value={b.shootNotes || ''} onChange={(e) => set('shootNotes', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="brief-sub">
        <div className="brief-sub-title">对标与竞品</div>
        <div className="brief-cols">
          <div>
            <Field label="对标种草视频">
              <div className="upload-zone sm" onClick={() => fileRef.current && fileRef.current.click()}>
                <Icon name="upload" size={18} />
                <div className="small">点击上传 / 拖拽视频</div>
                <input ref={fileRef} type="file" accept="video/*" multiple style={{ display: 'none' }}
                  onChange={(e) => { addVideos(e.target.files); e.target.value = ''; }} />
              </div>
              {(b.benchmarkVideos || []).length > 0 && (
                <div className="file-list">
                  {(b.benchmarkVideos || []).map((v) => (
                    <div key={v.id} className="file-row">
                      <Icon name="video" size={15} style={{ color: 'var(--brand)' }} />
                      <span className="flex1 ellipsis">{v.name}</span>
                      <span className="muted small">{v.size}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => set('benchmarkVideos', (b.benchmarkVideos || []).filter((x) => x.id !== v.id))}><Icon name="close" size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
            <Field label="对标视频 / 笔记链接" hint="每行一条">
              <textarea className="textarea" rows={3} value={(b.benchmarkLinks || []).join('\n')}
                onChange={(e) => set('benchmarkLinks', e.target.value.split('\n').filter((x) => x.trim()))} />
            </Field>
          </div>
          <div>
            <Field label="主要竞品" hint="AI 将检索其在小红书/抖音的爆款选题">
              <TagInput tags={b.competitors || []} onChange={(v) => set('competitors', v)} placeholder="输入竞品名回车添加" />
            </Field>
            <div className="field">
              <label>主推产品</label>
              <input className="input" value={b.product || ''} onChange={(e) => set('product', e.target.value)} placeholder="例：植愈修护精华 30ml" />
            </div>
            <div className="brief-ai-note">
              <Icon name="spark" size={15} style={{ color: 'var(--brand)', flex: 'none' }} />
              <div className="small">
                <b>AI 如何使用这些信息：</b>审稿时逐条对照「注意事项」中的红线词与硬性要求；对比环节基于竞品库找出差异化；批注依据卡审规则归类到 内容 / 合规 / 卖点 / 创意 / 技术 五类。
              </div>
            </div>
            <div className="brief-cols" style={{ marginTop: 16 }}>
              <div>
                <Field label="检索竞品高互动笔记" hint={trendReady ? '通过已配置的数据服务检索，不会直接抓取平台页面' : '尚未配置数据服务，可手动录入素材'}>
                  <div className="row gap8">
                    <select className="select" value={trendPlatform} onChange={(e) => setTrendPlatform(e.target.value)}>
                      <option value="all">小红书 + 抖音</option>
                      <option value="xiaohongshu">小红书</option>
                      <option value="douyin">抖音</option>
                    </select>
                    <input className="input flex1" value={trendQuery} onChange={(e) => setTrendQuery(e.target.value)} placeholder="搜索词（可选，默认使用竞品名称）" />
                    <button className="btn btn-primary btn-sm" disabled={trendBusy} onClick={searchTrends}>
                      {trendBusy ? <><span className="spin" /> 搜索中</> : <><Icon name="search" size={13} /> 搜索</>}
                    </button>
                  </div>
                  {!trendReady && <div className="small muted mt8">配置 server/.env 中的 TREND_API_URL / TREND_API_KEY 并重启代理服务后，可使用授权数据服务检索。</div>}
                </Field>
                <Field label="手动添加竞品爆款笔记">
                  <div className="row gap8">
                    <select className="select" value={manualNote.platform} onChange={(e) => setManualNote({ ...manualNote, platform: e.target.value })}>
                      <option value="xiaohongshu">小红书</option>
                      <option value="douyin">抖音</option>
                    </select>
                    <input className="input flex1" value={manualNote.competitor} onChange={(e) => setManualNote({ ...manualNote, competitor: e.target.value })} placeholder="竞品品牌" />
                    <input className="input flex1" value={manualNote.title} onChange={(e) => setManualNote({ ...manualNote, title: e.target.value })} placeholder="笔记标题" />
                  </div>
                  <input className="input mt8" value={manualNote.url} onChange={(e) => setManualNote({ ...manualNote, url: e.target.value })} placeholder="公开笔记链接（可选）" />
                  <textarea className="textarea mt8" rows={3} value={manualNote.content} onChange={(e) => setManualNote({ ...manualNote, content: e.target.value })} placeholder="粘贴公开笔记正文、口播或结构摘要；AI 会据此提炼可借鉴的结构，不会照搬原文" />
                  <button className="btn btn-secondary btn-sm mt8" onClick={addManualNote}><Icon name="plus" size={13} /> 添加素材</button>
                </Field>
              </div>
              <div>
                <Field label={`已收集的竞品素材 · ${(b.competitorNotes || []).length} 条`} hint="保存项目信息后，后续大纲 / 脚本 AI 审稿会引用这些素材">
                  {(b.competitorNotes || []).length ? (
                    <div className="file-list">
                      {(b.competitorNotes || []).map((note) => (
                        <div key={note.id} className="file-row" style={{ alignItems: 'flex-start' }}>
                          <Icon name="spark" size={14} style={{ color: 'var(--brand)', marginTop: 3 }} />
                          <div className="flex1" style={{ minWidth: 0 }}>
                            <div className="row gap8">
                              <Chip color="chip-blue">{note.platform === 'douyin' ? '抖音' : '小红书'}</Chip>
                              <b className="ellipsis">{note.title}</b>
                            </div>
                            <div className="small muted mt8">{note.competitor || '未标注竞品'}{note.likes ? ` · 赞 ${note.likes}` : ''}{note.url ? ` · ${note.url}` : ''}</div>
                            <div className="small mt8" style={{ whiteSpace: 'pre-wrap' }}>{(note.content || '').slice(0, 240)}{(note.content || '').length > 240 ? '…' : ''}</div>
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => set('competitorNotes', (b.competitorNotes || []).filter((x) => x.id !== note.id))} title="移除素材"><Icon name="close" size={13} /></button>
                        </div>
                      ))}
                    </div>
                  ) : <div className="muted small">还没有竞品内容素材。添加笔记正文后，AI 才能进行具体的结构和表达对照。</div>}
                  {trendError && <div className="small mt8" style={{ color: 'var(--danger)' }}>{trendError}</div>}
                </Field>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="brief-tab">
      <div className="detail-subhead">
        <b><Icon name="book" size={15} style={{ color: 'var(--brand)', verticalAlign: -2 }} /> 前置信息（Brief 库）</b>
        <span className="muted small">作为 AI 审稿判据 · 修改后需「保存修改」生效</span>
      </div>
      {head}
      <div className="card mt16 ai-glow" style={{ padding: 16 }}>
        <div className="row gap8">
          <Icon name="bolt" size={16} style={{ color: 'var(--brand)' }} />
          <b>AI 审稿判据已加载</b>
        </div>
        <div className="row gap16 wrap mt8 small muted" style={{ lineHeight: 1.9 }}>
          <span><b style={{ color: 'var(--text-1)' }}>红线规则</b>：{countLines(b.notes)} 条内容注意 · {countLines(b.shootNotes)} 条拍摄注意</span>
          <span><b style={{ color: 'var(--text-1)' }}>竞品基准</b>：{(b.competitors || []).length || 0} 个竞品</span>
          <span><b style={{ color: 'var(--text-1)' }}>对标素材</b>：{(b.benchmarkVideos || []).length} 条视频 · {(b.benchmarkLinks || []).length} 条链接 · {(b.competitorNotes || []).length} 条笔记正文</span>
          <span><b style={{ color: 'var(--text-1)' }}>品类识别</b>：{project.insights?.cat || '待生成洞察后识别'}</span>
        </div>
      </div>
    </div>
  );
}

function fmt(bytes) {
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}
function countLines(s) { return (s || '').split('\n').filter((x) => x.trim()).length; }
