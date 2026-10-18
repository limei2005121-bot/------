import React, { useMemo, useState } from 'react';
import { useApp } from '../logic/store.jsx';
import { STAGE_MAP } from '../logic/constants.js';
import { Icon, Chip } from './common.jsx';

export default function HomeView({ onOpen, onNew }) {
  const { state } = useApp();
  const { projects } = state;
  const [kw, setKw] = useState('');

  const filtered = useMemo(() => {
    const q = kw.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.name + (p.brandName || '') + (p.category || '')).toLowerCase().includes(q));
  }, [projects, kw]);

  const summary = useMemo(() => {
    let kolTotal = 0, pending = 0, revising = 0, done = 0;
    projects.forEach((p) => p.kols.forEach((k) => {
      kolTotal++;
      const s = STAGE_MAP[k.status];
      if (!s) return;
      if (s.kind === 'review') pending++;
      else if (s.kind === 'revising') revising++;
      else if (s.kind === 'done') done++;
    }));
    return { projects: projects.length, kolTotal, pending, revising, done };
  }, [projects]);

  const Stat = ({ label, value, color }) => (
    <div className="stat-card">
      <div className="stat-num" style={{ color }}>{value}</div>
      <div className="muted small">{label}</div>
    </div>
  );

  return (
    <div className="h-page">
      <div className="page-head">
        <div>
          <h1>项目总览</h1>
          <div className="muted small" style={{ marginTop: 4 }}>管理品牌种草项目，AI 贯穿「选题 → 审稿 → 定稿发布」全流程</div>
        </div>
        <div className="row gap8">
          <div className="search-box">
            <Icon name="search" size={15} style={{ color: 'var(--text-3)' }} />
            <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索项目 / 品牌 / 品类" />
          </div>
          <button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={15} stroke={2.2} /> 新建种草项目</button>
        </div>
      </div>

      <div className="stats-strip">
        <Stat label="进行中项目" value={summary.projects} color="var(--brand)" />
        <Stat label="达人稿件" value={summary.kolTotal} color="#5c6470" />
        <Stat label="待审稿件" value={summary.pending} color="var(--warn)" />
        <Stat label="达人修改中" value={summary.revising} color="#722ed1" />
        <Stat label="已定稿" value={summary.done} color="var(--ok)" />
      </div>

      {projects.length === 0 ? (
        <div className="card empty" style={{ marginTop: 24, padding: '70px 16px' }}>
          <Icon name="layers" size={44} stroke={1.2} style={{ color: '#c9cdd4' }} />
          <div className="empty-title">还没有任何项目</div>
          <div className="empty-sub">创建一个种草项目，AI 将帮你生成选题库并全程协助审稿</div>
          <div className="row gap8" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary btn-lg" onClick={onNew}><Icon name="plus" size={16} /> 新建项目</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty" style={{ marginTop: 24 }}>未找到匹配的项目</div>
      ) : (
        <div className="proj-grid">
          {filtered.map((p) => {
            const pn = p.kols.filter((k) => ['draft_pending', 'script_pending', 'video_pending'].includes(k.status)).length;
            const rv = p.kols.filter((k) => ['draft_revising', 'script_revising', 'video_revising'].includes(k.status)).length;
            const dn = p.kols.filter((k) => k.status === 'done').length;
            return (
              <div key={p.id} className="card card-hover proj-card" onClick={() => onOpen(p.id)}>
                <div className="proj-card-top">
                  <span className="proj-badge" style={{ background: p.color || 'linear-gradient(135deg,#3370ff,#7aa8ff)' }}>
                    {p.name.slice(0, 1)}
                  </span>
                  <div className="flex1" style={{ minWidth: 0 }}>
                    <div className="proj-card-name ellipsis">{p.name}</div>
                    <div className="small muted ellipsis">{p.brandName || '未填写品牌'}{p.category ? ` · ${p.category}` : ''}</div>
                  </div>
                  <Icon name="chevron-right" size={16} style={{ color: 'var(--text-3)' }} />
                </div>
                <div className="proj-card-tags">
                  {pn > 0 && <Chip color="chip-orange">{pn} 待复核</Chip>}
                  {rv > 0 && <Chip color="chip-purple">{rv} 修改中</Chip>}
                  {dn > 0 && <Chip color="chip-green">{dn} 定稿</Chip>}
                  {p.insights && <Chip color="chip-blue"><Icon name="spark" size={12} /> AI 洞察已生成</Chip>}
                </div>
                <div className="proj-card-foot">
                  <span>{p.kols.length} 位达人</span>
                  <span>更新于 {p.updatedAt || '-'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
