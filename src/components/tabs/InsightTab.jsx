import React from 'react';
import { useApp } from '../../logic/store.jsx';
import { Icon, Chip } from '../common.jsx';

export default function InsightTab({ project, onGen, busy }) {
  const api = useApp();
  const ins = project.insights;

  if (!ins) {
    return (
      <div className="insight-empty">
        <div className="insight-empty-icon"><Icon name="spark" size={40} stroke={1.3} /></div>
        <div className="empty-title">还没有 AI 选题洞察</div>
        <div className="empty-sub">基于品牌信息与竞品，AI 将检索小红书 / 抖音爆款笔记选题、平台热点并输出卡审注意事项</div>
        <button className="btn btn-primary btn-lg mt16" disabled={busy} onClick={() => { onGen(); }}>
          {busy ? <><span className="spin" /> AI 生成中…</> : <><Icon name="bolt" size={16} /> 生成选题库与卡审清单</>}
        </button>
      </div>
    );
  }

  const star = (tid) => {
    api.patchProject(project.id, {
      insights: { ...ins, topics: ins.topics.map((t) => (t.id === tid ? { ...t, liked: !t.liked } : t)) }
    });
  };

  return (
    <div className="insight-tab">
      <div className="detail-subhead">
        <b><Icon name="spark" size={15} style={{ color: 'var(--brand)', verticalAlign: -2 }} /> AI 选题洞察</b>
        <div className="row gap8">
          <span className="muted small">品类识别：{ins.cat} · 生成时间 {fmtTime(ins.generatedAt)}</span>
          <button className="btn btn-brand-ghost btn-sm" disabled={busy} onClick={() => onGen()}>
            {busy ? <><span className="spin" /> AI 生成中…</> : <><Icon name="refresh" size={13} /> 重新生成</>}
          </button>
        </div>
      </div>

      <div className="insight-hero ai-glow">
        <div className="ih-item">
          <div className="ih-num">{ins.topics.length}</div>
          <div>竞品爆款选题</div>
        </div>
        <div className="ih-item">
          <div className="ih-num">{ins.hotspots.length}</div>
          <div>平台热点</div>
        </div>
        <div className="ih-item">
          <div className="ih-num">{ins.compliance.length}</div>
          <div>卡审注意事项</div>
        </div>
        <div className="ih-text">
          <Icon name="bolt" size={16} style={{ color: 'var(--brand)' }} />
          <span>审稿时会以选题库/卡审清单为「标尺」，凡稿件命中卡审规则即产出修订批注 —— 例如：提到「效果因人而异」缺失、贬损竞品、限定促销话术与活动不符等。</span>
        </div>
      </div>

      <div className="insight-sec">
        <div className="insight-sec-head">
          <b>① 竞品爆款 · 选题库</b>
          <span className="muted small">基于竞品 {project.brief?.competitors?.join('、') || ''} 在小红书 / 抖音的爆款选题提炼，已按预估热度排序</span>
        </div>
        <div className="topic-grid">
          {ins.topics.map((t) => (
            <div key={t.id} className={`topic-card card ${t.liked ? 'liked' : ''}`}>
              <div className="topic-head">
                <span className="topic-score">{t.score}<small>分</small></span>
                <div className="row gap4">
                  <Chip color={t.platform.includes('小红书') ? 'chip-red' : 'chip-blue'}>{t.platform}</Chip>
                  <Chip color="chip-gray">{t.type}</Chip>
                </div>
                <button className={`btn btn-ghost btn-sm star ${t.liked ? 'on' : ''}`} onClick={() => star(t.id)}>
                  <Icon name={t.liked ? 'check-circle' : 'grid'} size={15} style={{ color: t.liked ? 'var(--ok)' : 'var(--text-3)' }} />
                </button>
              </div>
              <div className="topic-title">{t.title}</div>
              <div className="row gap8 small">
                <span className="topic-angle"><Icon name="bulb" size={12} /> {t.angle}</span>
              </div>
              <div className="topic-hook">钩子：{t.hook}</div>
              <div className="topic-meta">
                <div><span className="muted">为什么好</span>{t.why}</div>
                <div><span className="muted">风险提示</span>{t.risk}</div>
                <div><span className="muted">对标</span>{t.refComp}：{t.refNote}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="insight-cols">
        <div className="card insight-panel">
          <div className="insight-panel-head"><Icon name="target" size={15} style={{ color: 'var(--warn)' }} /> ② 平台热点与内容风向</div>
          <div className="hot-list">
            {ins.hotspots.map((h, i) => (
              <div key={i} className="hot-item">
                <span className="hot-no">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <b>{h.title}</b>
                  <div className="muted small" style={{ marginTop: 3 }}>{h.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card insight-panel">
          <div className="insight-panel-head"><Icon name="shield" size={15} style={{ color: 'var(--danger)' }} /> ③ 卡审注意事项（审稿红线）</div>
          <div className="comp-list">
            {ins.compliance.map((c, i) => (
              <div key={i} className="comp-item">
                <Icon name="alert" size={14} style={{ color: 'var(--danger)', flex: 'none', marginTop: 2 }} />
                <div>
                  <b>{c.title}</b>
                  <div className="muted small" style={{ marginTop: 3 }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
