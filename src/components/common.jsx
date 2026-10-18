import React, { createContext, useContext, useState } from 'react';
import { STAGE_MAP } from '../logic/constants.js';

/* ================= Icon 图标 ================= */
export function Icon({ name, size = 16, stroke = 1.7, className = '', style }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    className, style
  };
  const P = {
    plus: <path d="M12 5v14M5 12h14" />,
    close: <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>,
    check: <path d="M20 6L9 17l-5-5" />,
    'check-circle': <><circle cx="12" cy="12" r="10" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" /></>,
    send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
    trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6M14 11v6" /></>,
    'chevron-down': <path d="M6 9l6 6 6-6" />,
    'chevron-right': <path d="M9 18l6-6-6-6" />,
    'chevron-left': <path d="M15 18l-6-6 6-6" />,
    'arrow-left': <><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    eyeoff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></>,
    bolt: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
    'spark': <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
    refresh: <><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" /><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
    doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></>,
    layers: <><path d="M12 2l10 6-10 6L2 8z" /><path d="M2 17l10 6 10-6" /><path d="M2 12l10 6 10-6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    more: <><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></>,
    bulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-3.9 12.8c.6.4 1.1 1.3 1.1 2.2h5.6c0-.9.5-1.8 1.1-2.2A7 7 0 0 0 12 2z" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    video: <><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></>,
    play: <path d="M5 3l14 9-14 9z" />,
    smile: <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 3" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>
  };
  return <svg {...common}>{P[name] || P.spark}</svg>;
}

/* ================= Toast ================= */
const ToastCtx = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = (text, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((its) => [...its, { id, text, kind }]);
    setTimeout(() => setItems((its) => its.filter((i) => i.id !== id)), 2800);
  };
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toast-host">
        {items.map((i) => (
          <div key={i.id} className={`toast ${i.kind}`}>
            <Icon name={i.kind === 'ok' ? 'check-circle' : 'alert'} size={16}
              style={{ color: i.kind === 'ok' ? 'var(--ok)' : 'var(--danger)' }} />
            <span>{i.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ================= Modal / Drawer ================= */
export function Modal({ title, sub, width = 640, onClose, children, footer }) {
  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal" style={{ maxWidth: width }}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {sub && <div className="small muted" style={{ marginTop: 3 }}>{sub}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" /></button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, sub, width = 1080, onClose, children, footer }) {
  return (
    <div className="drawer-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="drawer" style={{ width: `min(${width}px, 96vw)` }}>
        <div className="drawer-head">
          <div className="row gap8" style={{ minWidth: 0 }}>
            <span className="row gap8 flex1" style={{ minWidth: 0 }}>
              <Icon name={sub === '大纲' ? 'doc' : sub === '脚本' ? 'list' : 'video'} size={18} style={{ color: 'var(--brand)' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }} className="ellipsis">{title}</div>
                <div className="small muted">{sub}</div>
              </div>
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ================= 基础小部件 ================= */
export function Chip({ color = 'chip-gray', children, icon }) {
  return <span className={`chip ${color}`}>{icon === 'dot' && <span className="dot" />}{children}</span>;
}

export function StageChip({ status }) {
  const s = STAGE_MAP[status];
  if (!s) return null;
  return <Chip color={s.chip} icon="dot">{s.name}</Chip>;
}

export function Tag({ children, color = 'var(--brand)', onRemove }) {
  return (
    <span className="tag">
      <span style={{ color: 'var(--brand)' }}>{children}</span>
      {onRemove && <b onClick={onRemove}>×</b>}
    </span>
  );
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.key} className={o.key === value ? 'active' : ''} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ================= 标签输入 ================= */
export function TagInput({ tags, onChange, placeholder = '回车添加，逗号分隔' }) {
  const [val, setVal] = useState('');
  const flush = () => {
    const parts = val.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length) {
      onChange([...new Set([...tags, ...parts])]);
    }
    setVal('');
  };
  return (
    <div className="tag-input-wrap">
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
          <b onClick={() => onChange(tags.filter((x) => x !== t))}>×</b>
        </span>
      ))}
      <input
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); flush(); }
        }}
        onBlur={flush}
      />
    </div>
  );
}

/* 确认对话框 */
export function Confirm({ title, text, danger, onOk, onClose }) {
  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-body" style={{ padding: '22px 24px' }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <div className="confirm-icon">
              <Icon name={danger ? 'alert' : 'bulb'} size={22} />
            </div>
            <div className="flex1">
              <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
              {text && <div className="small" style={{ color: 'var(--text-2)', marginTop: 6, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</div>}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className={danger ? 'btn btn-danger-solid' : 'btn btn-primary'} onClick={() => { onOk(); onClose(); }}>确定</button>
        </div>
      </div>
    </div>
  );
}

/* 加载遮罩文案 */
export function AiLoading({ text }) {
  return (
    <div className="ai-loading">
      <span className="spin-lg" />
      <div>{text || 'AI 正在审稿…'}</div>
      <div className="small muted">基于项目前置信息与卡审规则引擎生成，预计 5-10 秒</div>
    </div>
  );
}
