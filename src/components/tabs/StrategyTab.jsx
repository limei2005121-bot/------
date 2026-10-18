import React from 'react';
import { Icon, Chip } from '../common.jsx';

export default function StrategyTab({ project }) {
  const strategy = project.strategy;
  if (!strategy) {
    return (
      <div className="campaign-strategy-empty card mt16">
        <Icon name="spark" size={30} />
        <b>该项目尚无已确认的整合营销策略</b>
        <span className="muted small">新建项目时先完成 AI 调研、策略修改与确认；已创建项目的达人执行看板不受影响。</span>
      </div>
    );
  }

  return (
    <div className="campaign-saved-strategy">
      <div className="campaign-plan card">
        <div className="campaign-plan-head">
          <div>
            <div className="campaign-kicker">CONFIRMED MARKETING PLAN</div>
            <h3>已确认的整合营销策略</h3>
            <div className="small muted">{project.researchMessage || '策略已随项目创建保存'}</div>
          </div>
          <Chip color="chip-green"><Icon name="check" size={12} /> 已确认</Chip>
        </div>
        <div className="campaign-summary">{strategy.executiveSummary}</div>
        <div className="campaign-plan-grid">
          <section><h4>传播定位</h4><p>{strategy.positioning || '—'}</p></section>
          <section><h4>目标人群</h4><p>{strategy.audience || project.brief?.targetAudience || '—'}</p></section>
          <section className="wide"><h4>达人策略</h4><p>{strategy.creatorPlan || '—'}</p></section>
        </div>
        <section className="campaign-plan-section">
          <h4>渠道策略</h4>
          {strategy.channelStrategies?.map((item, index) => <article key={`${item.platform}-${index}`} className="campaign-plan-row">
            <b>{item.platform || '渠道'}</b><span>{item.role}</span><p>{item.content}</p>
            <small>预算：{item.budget || '待细化'}　·　指标：{item.kpi || '待设定'}</small>
          </article>)}
        </section>
        <div className="campaign-plan-grid">
          <section><h4>内容支柱</h4><ul>{strategy.contentPillars?.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
          <section><h4>预算建议</h4><ul>{strategy.budgetPlan?.map((item, index) => <li key={index}><b>{item.item}</b>：{item.amount} — {item.reason}</li>)}</ul></section>
          <section className="wide"><h4>执行节奏</h4><div className="campaign-timeline">{strategy.timeline?.map((item, index) => <article key={index}><b>{item.phase} · {item.timing}</b><p>{item.actions}</p></article>)}</div></section>
          <section><h4>衡量与复盘</h4><ul>{strategy.measurement?.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
          <section><h4>风险与应对</h4><ul>{strategy.risks?.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
        </div>
        <div className="campaign-saved-foot">
          <span>项目预算：{project.brief?.budget ? `¥${Number(project.brief.budget).toLocaleString()}` : '未记录'}</span>
          <span>平台：{project.channel || '—'}</span>
          <span>策略确认后创建项目，以下达人流程可按看板执行。</span>
        </div>
      </div>
      {project.researchNotes?.length > 0 && (
        <div className="card campaign-saved-research">
          <h4><Icon name="search" size={15} /> 关联的调研参考（{project.researchNotes.length}）</h4>
          {project.researchNotes.map((note, index) => <div className="campaign-research-item" key={`${note.url}-${index}`}>
            <Chip color={note.platform === 'douyin' ? 'chip-blue' : 'chip-red'}>{note.platform === 'douyin' ? '抖音' : '小红书'}</Chip>
            <span className="flex1">{note.title || note.content?.slice(0, 100) || '平台内容参考'}</span>
            {note.url && <a href={note.url} target="_blank" rel="noreferrer">查看来源</a>}
            <span className="muted small">赞 {note.likes || 0} · 评 {note.comments || 0}</span>
          </div>)}
        </div>
      )}
    </div>
  );
}
