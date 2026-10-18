import React from 'react';
import { Modal, Icon, StageChip } from './common.jsx';
import { STAGE_MAP } from '../logic/constants.js';

const KIND_ICON = { upload: 'upload', ai: 'spark', user: 'edit', flow: 'check', sys: 'clock' };

export default function TimelineModal({ kol, onClose }) {
  const events = [...(kol.events || [])].reverse();
  return (
    <Modal title="稿件动态" sub={`达人：${kol.name}`} width={560} onClose={onClose}
      footer={<button className="btn btn-secondary" onClick={onClose}>关闭</button>}>
      <div className="row gap8 mb12">
        <StageChip status={kol.status} />
        <span className="small muted row gap4" style={{ overflow: 'hidden' }}>
          <Icon name="link" size={11} />
          <a href={kol.docLink} target="_blank" rel="noopener noreferrer" className="link ellipsis" title="打开达人稿件飞书文档"
            style={{ color: 'var(--brand)' }}>{kol.docLink}</a>
        </span>
      </div>
      <div className="timeline">
        {events.map((e, i) => (
          <div key={i} className="tl-item">
            <span className={`tl-icon ic-${e.kind}`}><Icon name={KIND_ICON[e.kind] || 'clock'} size={13} /></span>
            <div className="tl-body">
              <div>{e.text}</div>
              <div className="small muted">{e.ts}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
