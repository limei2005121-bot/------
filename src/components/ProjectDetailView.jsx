import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../logic/store.jsx';
import { getEngine } from '../logic/aiClient.js';
import { STAGE_MAP, STAGES, REVIEW_ITEM } from '../logic/constants.js';
import { Icon, Chip, StageChip, Confirm, useToast } from './common.jsx';
import BriefTab from './tabs/BriefTab.jsx';
import InsightTab from './tabs/InsightTab.jsx';
import StrategyTab from './tabs/StrategyTab.jsx';
import ReviewDrawer from './ReviewDrawer.jsx';
import KolAddModal from './KolAddModal.jsx';
import PublishModal from './PublishModal.jsx';
import TimelineModal from './TimelineModal.jsx';

const ADVANCE = {
  draft_revising: {
    to: 'script_creating', label: '达人已完成大纲修改',
    confirm: '确认达人已按批注完成大纲修改？确认后进入「脚本中」阶段，达人开始撰写脚本。'
  },
  script_revising: {
    to: 'shooting', label: '达人已完成脚本修改',
    confirm: '确认达人已按批注完成脚本修改？确认后进入「拍摄中」阶段，达人开始拍摄。'
  },
  video_revising: {
    to: 'done', label: '达人已完成视频修改',
    confirm: '确认视频已修改到位？确认后稿件进入「定稿 · 定时发布」。'
  }
};

const MARK_PENDING = {
  script_creating: { to: 'script_pending', label: '脚本已产出，进入「脚本待审核」' },
  shooting: { to: 'video_pending', label: '拍摄完成，进入「视频待审核」' }
};

export default function ProjectDetailView({ project, onBack }) {
  const api = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState('board');
  const [reviewKol, setReviewKol] = useState(null);
  const [addKol, setAddKol] = useState(false);
  const [draftKol, setDraftKol] = useState(null);
  const [confirmAct, setConfirmAct] = useState(null);   // {kol, type:'advance'|'mark'|'del'|'publish'}
  const [publishKol, setPublishKol] = useState(null);
  const [timelineKol, setTimelineKol] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [engine, setEngine] = useState(null);

  useEffect(() => {
    let alive = true;
    getEngine().then((e) => { if (alive) setEngine(e); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const engineCloud = !!engine && engine.mode === 'cloud';
  const engineLabel = !engine ? 'AI 引擎检测中…' : engineCloud ? '云端大模型' + (engine.model ? ` · ${engine.model}` : '') : '本地模拟引擎';

  async function handleGenInsight() {
    setAiBusy(true);
    try {
      const used = await api.generateInsight(project.id);
      toast(used === 'cloud' ? 'AI 洞察已由云端大模型更新' : 'AI 洞察已更新（本地模拟引擎）');
    } catch (e) {
      toast('AI 洞察生成失败，请稍后重试', 'err');
    } finally {
      setAiBusy(false);
    }
  }

  const counts = useMemo(() => {
    const c = { review: 0, revising: 0, work: 0, done: 0 };
    project.kols.forEach((k) => {
      const s = STAGE_MAP[k.status];
      if (s) c[s.kind] = (c[s.kind] || 0) + 1;
    });
    return c;
  }, [project.kols]);

  const awaitingCount = project.kols.filter((k) => k.review && k.review.status === 'awaiting').length;

  const boardTab = (
    <>
      <div className="board-head">
        <div className="row gap8">
          <button className="btn btn-secondary btn-sm" onClick={onBack}><Icon name="arrow-left" size={14} /> 返回项目</button>
          <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
          <b style={{ fontSize: 15 }}>{project.name}</b>
          {project.category && <Chip color="chip-blue">{project.category}</Chip>}
          {project.channel && <Chip color="chip-cyan">{project.channel}</Chip>}
          <Chip color="chip-gray">{project.kols.length} 位达人</Chip>
          <Chip color={engineCloud ? 'chip-green' : 'chip-gray'}>{engineLabel}</Chip>
        </div>
        <div className="row gap8">
          <button className="btn btn-brand-ghost btn-sm" disabled={aiBusy} onClick={handleGenInsight}>
            {aiBusy ? <><span className="spin" /> AI 生成中…</> : <><Icon name="spark" size={14} /> 更新 AI 洞察</>}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setAddKol(true)}><Icon name="plus" size={14} stroke={2.2} /> 新增达人</button>
        </div>
      </div>

      <div className="flow-strip">
        <div className="flow-panel">
          <div className="flow-panel-head row-between">
            <b><Icon name="history" size={15} style={{ color: 'var(--brand)', verticalAlign: -2 }} /> 执行流水线</b>
            <span className="small muted">大纲 → 脚本 → 视频 → 定稿 · 每步 AI 审稿 + 人工复核</span>
          </div>
          <div className="flow-steps">
            {STAGES.map((s, i) => {
              const n = project.kols.filter((k) => k.status === s.key).length;
              const done = n > 0;
              return (
                <div key={s.key} className={`fstep ${done ? 'done' : ''}`}>
                  <span className="fstep-dot" style={{ background: s.dot }} />
                  <span className="fstep-name">{s.name}</span>
                  {n > 0 ? <span className="fstep-cnt">{n}</span> : <span className="fstep-cnt zero">0</span>}
                  {i < STAGES.length - 1 && <span className="fstep-line" />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="count-cards">
          <div className="ccard warn"><div>{counts.review || 0}</div><span>待审核</span></div>
          <div className="ccard purple"><div>{counts.revising || 0}</div><span>达人修改中</span></div>
          <div className="ccard blue"><div>{counts.work || 0}</div><span>创作 / 拍摄中</span></div>
          <div className="ccard ok"><div>{counts.done || 0}</div><span>已定稿</span></div>
        </div>
      </div>

      <div className="card mt16" style={{ overflow: 'hidden' }}>
        <div className="board-toolbar row-between">
          <div className="row gap8">
            <b>达人稿件</b>
            {awaitingCount > 0 && <Chip color="chip-orange"><Icon name="alert" size={12} /> {awaitingCount} 份 AI 批注待您复核</Chip>}
          </div>
          <span className="small muted">单击行首「动态」可查看审稿记录 · 单击「复核批注」进入修订式审阅</span>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th style={{ minWidth: 170 }}>达人 / 飞书文档</th>
              <th style={{ minWidth: 200 }}>当前环节</th>
              <th style={{ minWidth: 230 }}>审稿任务</th>
              <th style={{ minWidth: 250 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {project.kols.length === 0 && (
              <tr><td colSpan={5}><div className="empty"><div className="empty-title">暂无达人稿件</div>
                <div className="empty-sub">点击右上角「新增达人」，录入飞书文档链接后进入 AI 审稿流程</div>
                <button className="btn btn-primary mt12" onClick={() => setAddKol(true)}><Icon name="plus" size={14} /> 新增达人</button></div></td></tr>
            )}
            {project.kols.map((kol) => (
              <KolRow
                key={kol.id} project={project} kol={kol} busy={busyId === kol.id}
                onBusy={(v) => setBusyId(v ? kol.id : null)}
                onEditDraft={() => setDraftKol(kol)}
                onOpenReview={() => setReviewKol(kol)}
                onAdvance={() => setConfirmAct({ kol, type: 'advance' })}
                onMark={() => setConfirmAct({ kol, type: 'mark' })}
                onAskDel={() => setConfirmAct({ kol, type: 'del' })}
                onPublish={() => setPublishKol(kol)}
                onTimeline={() => setTimelineKol(kol)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const tabs = [
    { key: 'board', label: '执行看板' },
    { key: 'strategy', label: '整合营销策略' },
    { key: 'brief', label: '项目信息与前置' },
    { key: 'insight', label: 'AI 选题洞察' }
  ];

  return (
    <div className="h-page detail-page">
      <div className="detail-tabs">
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'insight' && <span className="cnt">{project.insights ? project.insights.topics.length : 0}</span>}
            </button>
          ))}
          {tab !== 'board' && (
            <span className="flex1" />
          )}
        </div>
      </div>

      <div className="tab-content">
        {tab === 'board' && boardTab}
        {tab === 'strategy' && <StrategyTab project={project} />}
        {tab === 'brief' && <BriefTab project={project} />}
        {tab === 'insight' && <InsightTab project={project} busy={aiBusy} onGen={() => { handleGenInsight(); }} />}
      </div>

      {/* 复核批注抽屉 */}
      {reviewKol && (
        <ReviewDrawer
          project={project} kol={project.kols.find((k) => k.id === reviewKol.id) || reviewKol}
          onClose={() => setReviewKol(null)}
        />
      )}
      {addKol && <KolAddModal projectId={project.id} onClose={() => setAddKol(false)} />}
      {draftKol && <KolAddModal projectId={project.id} kol={project.kols.find((k) => k.id === draftKol.id) || draftKol} onClose={() => setDraftKol(null)} />}
      {publishKol && <PublishModal projectId={project.id} kol={publishKol} onClose={() => setPublishKol(null)} />}
      {timelineKol && <TimelineModal kol={timelineKol} onClose={() => setTimelineKol(null)} />}

      {confirmAct && <Confirm
        danger={confirmAct.type === 'del'}
        title={confirmAct.type === 'del' ? '移除该达人稿件' : '确认阶段流转'}
        text={confirmAct.type === 'del' ? `确认移除达人「${confirmAct.kol.name}」及其全部审稿记录？此操作不可撤销。` : detailConfirmText(confirmAct)}
        onOk={() => handleConfirm(confirmAct)}
        onClose={() => setConfirmAct(null)}
      />}
    </div>
  );

  function handleConfirm(c) {
    const { kol } = c;
    if (c.type === 'del') { api.removeKol(project.id, kol.id); toast('已移除稿件'); return; }
    if (c.type === 'advance') {
      const cfg = ADVANCE[kol.status];
      api.advanceStage(project.id, kol.id, cfg.to, cfg.label);
      toast('已进入「' + STAGE_MAP[cfg.to].name + '」');
      return;
    }
    if (c.type === 'mark') {
      const cfg = MARK_PENDING[kol.status];
      api.advanceStage(project.id, kol.id, cfg.to, cfg.label);
      toast('已标记为「' + STAGE_MAP[cfg.to].name + '」');
    }
  }

  function detailConfirmText(c) {
    if (c.type === 'advance') return ADVANCE[c.kol.status].confirm;
    if (c.type === 'mark') {
      const stage = STAGE_MAP[MARK_PENDING[c.kol.status].to];
      return `确认达人已完成本阶段产出？标记后稿件进入「${stage.name}」，可启动 AI 审核。`;
    }
    return '';
  }
}

/* =============== 达人稿件行 =============== */
function KolRow({ project, kol, busy, onBusy, onEditDraft, onOpenReview, onAdvance, onMark, onAskDel, onPublish, onTimeline }) {
  const api = useApp();
  const { toast } = useToast();
  const stage = STAGE_MAP[kol.status];
  const item = REVIEW_ITEM[kol.status];
  const review = kol.review;

  const actives = review ? review.anns.filter((a) => a.status !== 'removed').length : 0;
  const stageIdx = STAGES.findIndex((s) => s.key === kol.status);

  const hasAwaiting = review && review.status === 'awaiting';

  const run = async (key) => {
    if (key === 'run_review') {
      onBusy(true);
      try {
        // 本地引擎保留一点“AI 思考”节奏；云端引擎按真实响应等待
        const eng = await getEngine();
        if (eng.mode !== 'cloud') await new Promise((r) => setTimeout(r, 1200));
        const used = await api.runReview(project.id, kol.id, kol.status);
        toast(`AI（${used === 'cloud' ? '云端大模型' : '本地模拟引擎'}）已完成${item.stageLabel}审稿，请复核批注`);
      } catch (e) {
        toast(e.message || 'AI 审稿失败，请重试', 'err');
      } finally {
        onBusy(false);
      }
    } else if (key === 'open_review') {
      onOpenReview();
    } else if (key === 'advance') {
      onAdvance();
    } else if (key === 'mark') {
      onMark();
    }
  };

  return (
    <tr>
      <td>
        <button className="btn btn-ghost btn-sm" title="查看审稿动态" onClick={onTimeline}><Icon name="history" size={15} /></button>
      </td>
      <td>
        <div className="row gap8">
          <span className="avatar">{kol.name.slice(0, 1)}</span>
          <div style={{ minWidth: 0 }}>
            <div className="ellipsis" style={{ fontWeight: 600 }}>{kol.name}</div>
            {kol.docLink ? (
              <a className="small link row gap4" style={{ color: 'var(--brand)' }} href={kol.docLink} target="_blank" rel="noopener noreferrer" title="打开达人稿件飞书文档">
                <Icon name="link" size={12} /> 飞书文档 <Icon name="external" size={11} />
              </a>
            ) : <span className="small muted">{kol.drafts?.[kol.status] ? '稿件正文已录入' : '尚未录入稿件正文'}</span>}
          </div>
        </div>
      </td>
      <td>
        <div className="row gap8" style={{ alignItems: 'center' }}>
          <StageChip status={kol.status} />
          <span className="small muted">步骤 {stage.seq}/9</span>
        </div>
        <div className="mini-progress mt8">
          {STAGES.map((s, i) => (
            <span key={s.key} className={i <= stageIdx ? 'done' : ''} style={{ background: i <= stageIdx ? s.dot : '' }} />
          ))}
        </div>
      </td>
      <td>
        {stage.kind === 'review' && (
          !hasAwaiting ? (
            <div className="row gap8">
              <span className="muted small row gap4"><Icon name="clock" size={13} /> {review && review.status === 'confirmed' ? 'AI 批注已确认' : '尚未开始 AI 审稿'}</span>
              {onEditDraft && <button className="btn btn-secondary btn-sm" onClick={onEditDraft}>{kol.drafts?.[kol.status] ? '更新稿件正文' : '录入稿件正文'}</button>}
            </div>
          ) : (
            <div className="row gap8">
              <Chip color="chip-orange"><Icon name="spark" size={12} /> AI 批注就绪</Chip>
              <span className="small muted">{actives} 条待复核</span>
            </div>
          )
        )}
        {stage.kind === 'revising' && <Chip color="chip-purple">已通知达人修改</Chip>}
        {stage.kind === 'work' && <span className="muted small">{stage.name}中，等待达人产出</span>}
        {stage.kind === 'done' && (
          <div className="row gap8">
            <Chip color="chip-green">已定稿</Chip>
            {kol.publish ? <span className="small muted">@{kol.publish.publishAt} · {kol.publish.platform}</span> : <span className="small muted">未设定发布</span>}
          </div>
        )}
      </td>
      <td>
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {stage.kind === 'review' && !hasAwaiting && (
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run('run_review')}>
              {busy ? <><span className="spin" /> AI 审稿中</> : <><Icon name="spark" size={13} /> AI 审{item && item.stageLabel}</>}
            </button>
          )}
          {hasAwaiting && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => run('open_review')} style={{ borderColor: 'var(--warn)', background: 'var(--warn)' }}>
                <Icon name="edit" size={13} /> 复核批注 {actives > 0 && `(${actives})`}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onEditDraft}>更新稿件正文</button>
            </>
          )}
          {stage.kind === 'revising' && ADVANCE[kol.status] && (
            <button className="btn btn-primary btn-sm" onClick={() => run('advance')}>
              <Icon name="check" size={13} /> {ADVANCE[kol.status].label}
            </button>
          )}
          {stage.kind === 'work' && MARK_PENDING[kol.status] && (
            <button className="btn btn-secondary btn-sm" onClick={() => run('mark')}>
              标记为「{STAGE_MAP[MARK_PENDING[kol.status].to].name}」
            </button>
          )}
          {stage.kind === 'done' && (
            <button className="btn btn-secondary btn-sm" onClick={onPublish}>
              <Icon name="calendar" size={13} /> {kol.publish ? '修改发布计划' : '设定发布时间'}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" title="移除达人" onClick={onAskDel}><Icon name="trash" size={14} style={{ color: 'var(--text-3)' }} /></button>
        </div>
      </td>
    </tr>
  );
}
