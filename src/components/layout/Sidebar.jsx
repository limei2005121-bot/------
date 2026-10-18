import React from 'react';
import { Icon, Chip } from '../common.jsx';
import { timeAgo } from '../../logic/constants.js';

const STAGE_COLOR_DOT = {
  draft_revising: '#722ed1', script_revising: '#722ed1', video_revising: '#722ed1',
  draft_pending: '#165dff', script_pending: '#165dff', video_pending: '#165dff',
  done: '#0a9c52', shooting: '#5c6470', script_creating: '#5c6470'
};

export default function Sidebar({ projects, activeId, view = 'home', onSelect, onHome, onCalendar, onNew }) {
  const pendingCount = (p) => p.kols.filter((k) => ['draft_pending', 'script_pending', 'video_pending'].includes(k.status)).length;
  const scheduledCount = (list) => list.reduce((n, p) => n + (p.kols || []).filter((k) => k.publish && k.publish.publishAt).length, 0);

  return (
    <aside className="sidebar">
      <div className="side-group-label">工作台</div>
      <div className={'side-item' + (view === 'home' ? ' active' : '')} onClick={onHome}>
        <Icon name="grid" size={16} />
        <span>全部项目</span>
        <em className="side-count">{projects.length}</em>
      </div>
      <div className={'side-item' + (view === 'calendar' ? ' active' : '')} onClick={onCalendar}>
        <Icon name="calendar" size={16} />
        <span>发布日历</span>
        {scheduledCount(projects) > 0 && <em className="side-count side-count-brand">{scheduledCount(projects)}</em>}
      </div>

      <div className="side-group-label side-group-title">项目列表</div>
      <div className="side-projects">
        {projects.map((p) => {
          const active = p.id === activeId;
          const pending = pendingCount(p);
          return (
            <div key={p.id} className={`side-item side-project ${active ? 'active' : ''}`} onClick={() => onSelect(p.id)}>
              <span className="side-proj-name">
                <span className="proj-square" style={{ background: 'linear-gradient(135deg,#3370ff,#7aa8ff)' }}>
                  {p.name.slice(0, 1)}
                </span>
                <span className="flex1 ellipsis" title={p.name}>{p.name}</span>
              </span>
              <span className="side-sub">
                <span className="muted ellipsis" style={{ fontSize: 11 }}>{p.brandName || '未填写品牌'}</span>
                {pending > 0 && <Chip color="chip-orange">{pending} 待复核</Chip>}
              </span>
              <span className="muted" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                {p.kols.length} 位达人 · 更新于 {timeAgo(p.updatedAt) || '今天'}
              </span>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="empty" style={{ padding: '20px 8px' }}>
            <div className="empty-sub">还没有项目</div>
          </div>
        )}
        <div className="side-item side-new" onClick={onNew}>
          <Icon name="plus" size={14} stroke={2.2} />
          <span>新建项目</span>
        </div>
      </div>
    </aside>
  );
}
