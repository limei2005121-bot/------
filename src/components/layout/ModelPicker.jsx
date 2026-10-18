import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../common.jsx';
import { getEngine } from '../../logic/aiClient.js';

/* 预设模型（默认接入阿里云百炼 · DashScope 兼容通道；可在 server/.env 调整服务端默认） */
const PRESETS = [
  { value: 'qwen3.8-max', vendor: '通义千问 · DashScope', badge: '默认' },
  { value: 'qwen-max', vendor: '通义千问 · DashScope' },
  { value: 'qwen-plus', vendor: '通义千问 · DashScope' },
  { value: 'qwen-turbo', vendor: '通义千问 · DashScope' }
];

export default function ModelPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('');           // '' 探测中 | 'cloud' 云端 | 'local' 本地模拟
  const [custom, setCustom] = useState(false);    // 自定义模型输入态
  const [draft, setDraft] = useState('');
  const rootRef = useRef(null);

  // 菜单打开时探测当前引擎（云端 Key 是否已配置）
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getEngine()
      .then((e) => { if (alive) setMode(e && e.mode === 'cloud' ? 'cloud' : 'local'); })
      .catch(() => { if (alive) setMode('local'); });
    return () => { alive = false; };
  }, [open]);

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (ev) => { if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false); };
    const onKey = (ev) => { if (ev.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = String(value || 'qwen3.8-max').trim() || 'qwen3.8-max';
  const inPresets = PRESETS.some((m) => m.value === current);
  const isCloud = mode === 'cloud';
  const isLocal = mode === 'local';

  const pick = (v) => { onChange(v); setOpen(false); setCustom(false); };
  const startCustom = () => { setDraft(inPresets ? '' : current); setCustom(true); };
  const applyCustom = () => {
    const v = draft.trim();
    if (v) onChange(v);
    setOpen(false);
    setCustom(false);
  };

  return (
    <div className="model-picker" ref={rootRef}>
      <button
        className="btn btn-ghost btn-sm mp-trigger"
        onClick={() => setOpen((o) => !o)}
        title={isCloud
          ? '云端大模型已连接：洞察生成与 AI 审稿将调用所选模型'
          : '未连接云端 Key（server/.env），当前由本地模拟引擎生成'}
      >
        <i className={'mp-dot ' + (mode === 'cloud' ? 'mp-dot-cloud' : mode === 'local' ? 'mp-dot-local' : 'mp-dot-na')} />
        <span className="mp-name mono">{current}</span>
        <Icon name="chevron-down" size={13} className={'mp-chev' + (open ? ' mp-chev-open' : '')} />
      </button>

      {open && (
        <div className="mp-menu">
          <div className="mp-head">
            <b>AI 大模型</b>
            <em className={isCloud ? 'mp-badge mp-badge-ok' : 'mp-badge'}>
              {mode === '' ? '连接中…' : isCloud ? '云端已启用' : '本地模拟'}
            </em>
          </div>
          <p className="mp-sub">新建洞察 / 触发审稿时，将调用左侧选择的模型发起云端请求。</p>

          <div className="mp-list">
            {PRESETS.map((m) => (
              <button
                key={m.value}
                className={'mp-item' + (current === m.value ? ' mp-item-active' : '')}
                onClick={() => pick(m.value)}
              >
                <span className="mp-item-l">
                  <span className="mp-model mono">{m.value}</span>
                  <span className="mp-vendor">{m.vendor}</span>
                </span>
                {m.badge && <em className="mp-flag">{m.badge}</em>}
                {current === m.value && <Icon name="check" size={15} className="mp-check" />}
              </button>
            ))}
          </div>

          {custom ? (
            <div className="mp-edit">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyCustom(); }}
                placeholder="输入模型名，如 qwen-max、glm-4-flash"
                className="mp-input mono"
              />
              <button className="btn btn-primary btn-sm" onClick={applyCustom}>应用</button>
            </div>
          ) : (
            <button
              className={'mp-item mp-custom' + (!inPresets ? ' mp-item-active' : '')}
              onClick={startCustom}
            >
              <span className="mp-item-l">
                <span className="mp-model">{!inPresets ? current : '自定义其它模型…'}</span>
                <span className="mp-vendor">{!inPresets ? '当前生效' : '按需输入兼容的 OpenAI 模型名'}</span>
              </span>
              {!inPresets && <Icon name="check" size={15} className="mp-check" />}
              <Icon name="edit" size={13} className="mp-edit-ico" />
            </button>
          )}

          <div className="mp-foot">
            未启用云端时模型不影响演示，仅本地模拟引擎生效。
            <span className="mp-foot-note">更多模型可改 server/.env</span>
          </div>
        </div>
      )}
    </div>
  );
}
