import React, { useState } from 'react';
import { useApp } from '../logic/store.jsx';
import { Modal, Icon, useToast } from './common.jsx';

const PLATS = ['小红书 · 图文', '小红书 · 视频', '抖音 · 视频', 'B站 · 视频', '微博'];

export default function PublishModal({ projectId, kol, onClose }) {
  const api = useApp();
  const { toast } = useToast();
  const [platform, setPlatform] = useState(kol.publish?.platform || '小红书 · 图文');
  const [publishAt, setPublishAt] = useState(kol.publish?.publishAt || '');
  const [note, setNote] = useState(kol.publish?.note || '');

  const ok = () => {
    if (!platform || !publishAt) { toast('请选择平台与发布时间', 'err'); return; }
    api.setPublish(projectId, kol.id, { platform, publishAt, note });
    toast('发布计划已设定，稿件进入「定稿」排期');
    onClose();
  };

  return (
    <Modal title="定稿 · 设定发布时间" sub={`达人：${kol.name}`} width={520} onClose={onClose}
      footer={
        <>
          <span className="flex1 muted small"><Icon name="spark" size={13} style={{ color: 'var(--brand)' }} /> 可在发布日历中统一跟进</span>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={ok}><Icon name="check" size={14} /> 保存发布计划</button>
        </>
      }>
      <div className="field">
        <label>发布平台</label>
        <div className="channel-pick">
          {PLATS.map((p) => (
            <button key={p} className={`chan ${platform === p ? 'on' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>目标发布时间</label>
        <input className="input" type="date" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
      </div>
      <div className="field">
        <label>备注 <span className="hint">可选：话题、置顶评论、发布规范</span></label>
        <textarea className="textarea compact" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="例：发布后 1 小时将 #植愈焕活季 话题置顶" />
      </div>
    </Modal>
  );
}
