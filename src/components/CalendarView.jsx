import React, { useMemo, useState } from 'react';
import { Icon } from './common.jsx';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dayKey(y, mo, d) { return `${y}-${pad2(mo + 1)}-${pad2(d)}`; }

function parseDate(str) {
  if (!str) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(str));
  if (!m) return null;
  return { y: +m[1], mo: +m[2] - 1, d: +m[3] };
}

function platformColor(platform = '') {
  if (platform.includes('小红书')) return '#ff2e4d';
  if (platform.includes('抖音')) return '#161823';
  if (platform.includes('视频号')) return '#07c160';
  if (platform.includes('快手')) return '#ff7700';
  return '#3370ff';
}
const platformShort = (p) => String(p || '').split('·')[0].trim() || '发布';
const isPast = (key, todayKey) => key < todayKey;

export default function CalendarView({ projects, onOpen, onNew }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());
  const [sel, setSel] = useState(todayKey);
  const [tab, setTab] = useState('day'); // day | all

  /* 聚合所有项目里已设定发布计划的达人稿件 */
  const { map, list } = useMemo(() => {
    const map = {};
    const list = [];
    for (const p of projects) {
      for (const k of p.kols || []) {
        const pb = k.publish;
        if (!pb || !pb.publishAt) continue;
        const t = parseDate(pb.publishAt);
        if (!t) continue;
        const key = dayKey(t.y, t.mo, t.d);
        const ev = { key, project: p, kol: k, platform: pb.platform || '', note: pb.note || '' };
        (map[key] = map[key] || []).push(ev);
        list.push(ev);
      }
    }
    for (const arr of Object.values(map)) arr.sort((a, b) => a.project.name.localeCompare(b.project.name, 'zh'));
    list.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    return { map, list };
  }, [projects]);

  const monthPrefix = `${ym.y}-${pad2(ym.m + 1)}`;
  const selEvents = map[sel] || [];
  const monthEvents = list.filter((e) => e.key.startsWith(monthPrefix));

  /* 构建当月格子（周一开头） */
  const weeks = useMemo(() => {
    const y = ym.y, m = ym.m;
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // 周一 = 0
    const nDays = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= nDays; d++) cells.push({ key: dayKey(y, m, d), y, m, d });
    const ws = [];
    for (let i = 0; i < cells.length; i += 7) ws.push(cells.slice(i, i + 7));
    return ws;
  }, [ym]);

  const changeMonth = (dm) => {
    let y = ym.y, m = ym.m + dm;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    let key;
    if (y === now.getFullYear() && m === now.getMonth()) key = todayKey;
    else {
      const ks = Object.keys(map).filter((k) => k.startsWith(`${y}-${pad2(m + 1)}`)).sort();
      key = ks[0] || dayKey(y, m, 1);
    }
    setYm({ y, m });
    setSel(key);
    setTab('day');
  };

  const fmtDate = (key) => {
    const [yy, mm, dd] = key.split('-');
    return `${+yy} 年 ${+mm} 月 ${+dd} 日`;
  };

  return (
    <div className="cal-page">
      <div className="cal-top">
        <div>
          <h2 className="cal-h2">发布日历</h2>
          <p className="muted" style={{ marginTop: 3, fontSize: 12 }}>
            汇聚所有项目已排期的达人发布计划，共 {list.length} 条排期
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card cal-empty-card">
          <Icon name="calendar" size={30} style={{ color: 'var(--text-4)' }} />
          <div className="empty-sub" style={{ marginTop: 6 }}>还没有项目与排期</div>
          <button className="btn btn-primary" onClick={onNew}>
            <Icon name="plus" size={14} stroke={2.2} /> 新建项目
          </button>
        </div>
      ) : (
        <div className="cal-layout">
          {/* 左：月历网格 */}
          <div className="card cal-card">
            <div className="cal-head">
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)}>
                <Icon name="chevron-down" size={14} className="cal-nav-prev" />
              </button>
              <div className="cal-title">{ym.y} 年 {ym.m + 1} 月</div>
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)}>
                <Icon name="chevron-down" size={14} className="cal-nav-next" />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }} onClick={() => changeMonth(0)}>
                回到本月
              </button>
              <span className="flex1" />
              <span className="muted" style={{ fontSize: 12 }}>本月 {monthEvents.length} 条排期</span>
            </div>

            <div className="cal-weekdays">
              {WEEKDAYS.map((w) => <div key={w}>周{w}</div>)}
            </div>
            <div className="cal-grid">
              {weeks.flatMap((wk, wi) =>
                wk.map((cell, ci) => {
                  if (!cell) return <div key={`b${wi}-${ci}`} className="cal-cell is-blank" />;
                  const evs = map[cell.key] || [];
                  const isSel = sel === cell.key;
                  const isToday = cell.key === todayKey;
                  return (
                    <div
                      key={cell.key}
                      className={'cal-cell' + (isSel ? ' is-sel' : '') + (isToday ? ' is-today' : '')}
                      onClick={() => { setSel(cell.key); setTab('day'); }}
                    >
                      <span className="cal-date">{cell.d}</span>
                      <div className="cal-evs">
                        {evs.slice(0, 3).map((e) => (
                          <button
                            key={e.project.id + '-' + e.kol.id}
                            title={`${e.project.name} · ${e.kol.name} 于 ${e.key} 发布`}
                            className={'cal-chip' + (isPast(cell.key, todayKey) ? ' is-past' : '')}
                            style={{
                              borderColor: platformColor(e.platform) + '55',
                              background: platformColor(e.platform) + '14'
                            }}
                            onClick={(ev) => { ev.stopPropagation(); onOpen(e.project.id); }}
                          >
                            <i style={{ color: platformColor(e.platform) }}>{platformShort(e.platform)}</i>
                            <span>{e.kol.name}</span>
                          </button>
                        ))}
                        {evs.length > 3 && <div className="cal-more">还有 {evs.length - 3} 条…</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 右：排期清单 */}
          <div className="cal-aside">
            <div className="card cal-panel">
              <div className="cal-tabs">
                <button className={'cal-tab' + (tab === 'day' ? ' on' : '')} onClick={() => setTab('day')}>
                  {selEvents.length ? fmtDate(sel) : '选择日期'}
                  {tab === 'day' && <em>{selEvents.length}</em>}
                </button>
                <button className={'cal-tab' + (tab === 'all' ? ' on' : '')} onClick={() => setTab('all')}>
                  全部排期
                  {tab === 'all' && <em>{list.length}</em>}
                </button>
              </div>

              <div className="cal-list">
                {(tab === 'day' ? selEvents : list.slice(0, 120)).length === 0 && (
                  <div className="cal-list-empty">
                    <div className="empty-sub">暂无排期</div>
                    <div className="small muted" style={{ lineHeight: 1.6, marginTop: 4 }}>
                      {tab === 'day'
                        ? '当天没有达人稿件排期。'
                        : '还没有设定发布计划：进入项目详情，点击达人「设定发布时间」后，即可在此统一跟进。'}
                    </div>
                  </div>
                )}
                {(tab === 'day' ? selEvents : list.slice(0, 120)).map((e) => (
                  <div key={e.project.id + '-' + e.kol.id} className="cal-row" onClick={() => onOpen(e.project.id)}>
                    <span
                      className="cal-badge"
                      style={{ background: platformColor(e.platform) }}
                      title={e.platform}
                    >
                      {platformShort(e.platform)}
                    </span>
                    <div className="cal-row-main">
                      <div className="cal-row-l1">
                        <b>{e.kol.name}</b>
                        {tab === 'all' && <span className="cal-row-date mono">{e.key.slice(5)}</span>}
                      </div>
                      <div className="small muted ellipsis" title={e.project.name + (e.note ? ' · ' + e.note : '')}>
                        {e.project.name}
                        {e.note ? ' · ' + e.note : ''}
                      </div>
                    </div>
                    <span className="cal-row-go">›</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cal-tip small muted">
              <Icon name="spark" size={13} style={{ color: 'var(--brand)' }} />
              日历仅展示已「设定发布计划」的稿件；点击排期可直达对应项目。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
