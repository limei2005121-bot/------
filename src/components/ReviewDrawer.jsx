import React, { useState } from 'react';
import { useApp } from '../logic/store.jsx';
import { REVIEW_TYPES, REVIEW_TYPE_MAP, uid } from '../logic/constants.js';
import { buildNotifyMessage } from '../logic/mockAI.js';
import { Icon, Chip, Modal, useToast } from './common.jsx';

const SEVERITY = {
  suggest: { label: '建议', chip: 'chip-blue' },
  must: { label: '重要', chip: 'chip-orange' },
  block: { label: '必须修改', chip: 'chip-red' }
};

const STAGE_NAME = { draft_pending: '大纲审稿', script_pending: '脚本审稿', video_pending: '视频审稿' };

export default function ReviewDrawer({ project, kol, onClose }) {
  const api = useApp();
  const { toast } = useToast();
  const review = kol.review;
  const [anns, setAnns] = useState((review?.anns || []).map((a) => ({ ...a })));
  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ name: '', type: 'content', severity: 'must', where: '', suggestion: '' });
  const [showNotify, setShowNotify] = useState(null); // message string
  const [busy, setBusy] = useState(false);

  const stageName = STAGE_NAME[review?.stageKey] || '审稿';

  const setAnn = (i, patch) => setAnns((arr) => arr.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const removeAnn = (i) => setAnns((arr) => arr.filter((_, idx) => idx !== i));

  const pushNew = () => {
    if (!nf.suggestion.trim()) { toast('请填写批注意见内容', 'err'); return; }
    setAnns((arr) => [...arr, {
      id: uid('an'), type: nf.type, blockId: review.doc.blocks[0]?.id,
      where: nf.where || '整体', original: '（用户补充批注）',
      suggestion: nf.suggestion.trim(), reason: '由品牌方人工补充', severity: nf.severity,
      status: 'open', createdAt: new Date().toISOString(), user: true
    }]);
    setNf({ name: '', type: 'content', severity: 'must', where: '', suggestion: '' });
    setAdding(false);
    toast('已补充批注');
  };

  const save = () => {
    api.saveReviewAnnotations(project.id, kol.id, anns);
    toast('批注草稿已保存');
  };

  const confirm = () => {
    if (!anns.length) { toast('暂无批注，请先补充', 'err'); return; }
    setBusy(true);
    setTimeout(() => {
      api.saveReviewAnnotations(project.id, kol.id, anns);
      const msg = buildNotifyMessage(project, kol, review.stageKey, anns);
      setBusy(false);
      setShowNotify(msg);
    }, 500);
  };

  const doNotify = () => {
    api.confirmReview(project.id, kol.id);
    setShowNotify(null);
    onClose();
    toast('已通过飞书 @ 通知达人，按批注修改');
  };

  const activeCount = anns.filter((a) => a.status !== 'removed').length;
  const blockMap = {};
  (review?.doc?.blocks || []).forEach((b) => { blockMap[b.id] = b; });

  const byBlock = {};
  anns.forEach((a) => { (byBlock[a.blockId] = byBlock[a.blockId] || []).push(a); });

  return (
    <>
      <div className="drawer-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="drawer" style={{ width: 'min(1180px, 97vw)' }}>
          <div className="drawer-head">
            <div className="row gap8" style={{ minWidth: 0 }}>
              <Icon name="spark" size={18} style={{ color: 'var(--brand)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{stageName} · 修订式批注复核</div>
                <div className="small muted">达人：{kol.name} · 左侧{review?.doc?.source === 'feishu' ? `为飞书实时读取的稿件正文（${review.doc.fetchedAt}）` : review?.doc?.source === 'submitted' ? '为达人录入的稿件正文' : <>为项目方参考稿（<b style={{ color: 'var(--danger)' }}>非达人原文</b>），批注仅供演示</>} · 您可编辑、补充或删除批注后确认</div>
              </div>
            </div>
            <div className="row gap8">
              <Chip color="chip-orange">{activeCount} 条批注</Chip>
              <a className="btn btn-secondary btn-sm" href={kol.docLink} target="_blank" rel="noopener noreferrer" title="打开达人飞书文档原文，对照后回来编辑 / 补充批注">
                <Icon name="external" size={13} /> 打开飞书原文
              </a>
              <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" /></button>
            </div>
          </div>

          <div className="drawer-body review-body">
            {/* 左侧：文档（修订视图） */}
            <div className="review-left">
              <div className="review-pane-title">
                <Icon name="doc" size={15} style={{ color: 'var(--text-3)' }} />
                {review?.doc?.source === 'feishu' || review?.doc?.source === 'submitted' ? '达人稿件原文' : '项目方参考稿'} · {review?.doc?.name || '文档内容'}
                <Chip color={review?.doc?.source === 'feishu' || review?.doc?.source === 'submitted' ? 'chip-green' : 'chip-orange'}>
                  {review?.doc?.source === 'feishu' ? '飞书实时读取' : review?.doc?.source === 'submitted' ? '已录入原文' : '非达人原文'}
                </Chip>
                <span className="muted small">高亮处为 AI 建议修订位置</span>
              </div>
              {review?.doc?.source === 'demo' && <div className="review-origin-note">
                <Icon name="bulb" size={13} style={{ color: 'var(--danger)' }} />
                <span>本次使用的是演示参考稿，不代表真实稿件审核。配置有效的飞书链接或录入真实正文后再启动审核。</span>
              </div>}
              <div className="doc-area">
                {(review?.doc?.blocks || []).map((b, i) => {
                  const hits = byBlock[b.id] || [];
                  return (
                    <div key={b.id} className={`doc-block ${hits.length ? 'marked' : ''}`}>
                      <div className="doc-block-head">
                        <span className="doc-block-no">{i + 1}</span>
                        <Chip color="chip-gray">{b.tag}</Chip>
                        {hits.length > 0 && (
                          <span className="doc-mark-cnt">
                            {hits.map((h) => <span key={h.id} title={SEVERITY[h.severity]?.label} style={{ background: h.severity === 'block' ? '#d9382c' : h.severity === 'must' ? '#ff8800' : '#165dff' }} />)}
                          </span>
                        )}
                      </div>
                      <p className={hits.length ? 'doc-marked-text' : ''}>{b.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧：批注编辑 */}
            <div className="review-right">
              <div className="review-pane-title">
                <Icon name="edit" size={15} style={{ color: 'var(--text-3)' }} />
                修订批注清单
                <span className="muted small">可修改措辞 / 严重级别，或删除不合适的批注</span>
              </div>

              <div className="ann-list">
                {anns.map((a, i) => {
                  const T = REVIEW_TYPE_MAP[a.type];
                  return (
                    <div key={a.id} className={`ann-card sev-${a.severity}`}>
                      <div className="ann-head">
                        <div className="row gap4">
                          <span className="ann-type" style={{ color: T?.color, background: (T?.color || '#666') + '1a' }}>{T?.name || '批注'}</span>
                          <Chip color={SEVERITY[a.severity]?.chip}>{SEVERITY[a.severity]?.label}</Chip>
                          {a.user && <Chip color="chip-cyan">人工补充</Chip>}
                        </div>
                        <div className="row gap4">
                          <button className="btn btn-ghost btn-sm" onClick={() => removeAnn(i)} title="删除批注"><Icon name="trash" size={14} style={{ color: 'var(--danger)' }} /></button>
                          <span className="small muted">{a.where}</span>
                        </div>
                      </div>
                      <div className="ann-original">
                        <span>原文</span>
                        <p>{a.original}</p>
                      </div>
                      <div className="field" style={{ marginBottom: 8 }}>
                        <label>修订建议（将作为达人修改依据）</label>
                        <textarea className="textarea compact" rows={3} value={a.suggestion}
                          onChange={(e) => setAnn(i, { suggestion: e.target.value })} />
                      </div>
                      <div className="row gap8">
                        <label className="small" style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>判断依据</label>
                        <input className="input" style={{ flex: 1 }} value={a.reason} onChange={(e) => setAnn(i, { reason: e.target.value })} />
                        <select className="select" style={{ width: 104 }} value={a.severity} onChange={(e) => setAnn(i, { severity: e.target.value })}>
                          <option value="suggest">建议</option>
                          <option value="must">重要</option>
                          <option value="block">必须修改</option>
                        </select>
                      </div>
                    </div>
                  );
                })}

                {!adding ? (
                  <button className="btn btn-secondary add-ann-btn" onClick={() => setAdding(true)}>
                    <Icon name="plus" size={14} /> 补充一条人工批注
                  </button>
                ) : (
                  <div className="ann-add">
                    <div className="row gap8" style={{ flexWrap: 'wrap' }}>
                      <select className="select" style={{ width: 130 }} value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })}>
                        {REVIEW_TYPES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                      </select>
                      <select className="select" style={{ width: 110 }} value={nf.severity} onChange={(e) => setNf({ ...nf, severity: e.target.value })}>
                        <option value="suggest">建议</option><option value="must">重要</option><option value="block">必须修改</option>
                      </select>
                      <input className="input flex1" placeholder="定位（如：00:16 口播 / 大纲第二节）" value={nf.where} onChange={(e) => setNf({ ...nf, where: e.target.value })} />
                    </div>
                    <textarea className="textarea" rows={2} placeholder="批注意见内容…" value={nf.suggestion} onChange={(e) => setNf({ ...nf, suggestion: e.target.value })} />
                    <div className="row gap8">
                      <span className="flex1" />
                      <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>取消</button>
                      <button className="btn btn-primary btn-sm" onClick={pushNew}>加入批注</button>
                    </div>
                  </div>
                )}

                <div className="review-note">
                  <Icon name="bulb" size={14} style={{ color: 'var(--brand)' }} />
                  确认后系统将把以上批注意见整理成消息，通过飞书 @ 达人并按格式提醒修改，同时稿件状态更新为「达人修改中」。
                </div>
              </div>
            </div>
          </div>

          <div className="modal-foot review-foot">
            <span className="flex1 muted small">第 {review?.stageKey === 'draft_pending' ? '1' : review?.stageKey === 'script_pending' ? '2' : '3'} 阶段 · 共 3 次审稿节点</span>
            <button className="btn btn-secondary" onClick={onClose}>稍后处理</button>
            <button className="btn btn-secondary" onClick={save}><Icon name="doc" size={14} /> 保存草稿</button>
            <button className="btn btn-primary" disabled={busy} onClick={confirm}>
              {busy ? <><span className="spin" /> 整理中…</> : <><Icon name="check" size={14} /> 确认批注，准备通知达人</>}
            </button>
          </div>
        </div>
      </div>

      {showNotify && (
        <Modal
          title="确认通知达人 · 飞书消息预览"
          sub="该消息将 @ 达人到稿件对应的飞书文档，请确认无误后发送"
          width={620}
          onClose={() => setShowNotify(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowNotify(null)}>返回修改</button>
              <button className="btn btn-primary" onClick={doNotify}><Icon name="send" size={14} /> 发送并更新状态</button>
            </>
          }
        >
          <div className="notify-preview">
            <div className="notify-kol">
              <Icon name="user" size={14} />
              <b>{kol.name}</b>
              <span className="muted small"> · 通过飞书 @ 发送至「{project.name}」项目组</span>
            </div>
            <pre>{showNotify}</pre>
            <div className="muted small mt8">
              <Icon name="spark" size={12} style={{ color: 'var(--brand)' }} /> 发送后达人将按批注修改，完成后您在「执行看板」点击对应按钮即可流转到下一阶段。
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
