import React, { useRef, useState } from 'react';
import { useApp } from '../logic/store.jsx';
import { Modal, Icon, useToast } from './common.jsx';

export default function KolAddModal({ projectId, kol, onClose }) {
  const api = useApp();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [name, setName] = useState(kol?.name || '');
  const [link, setLink] = useState(kol?.docLink || '');
  const [content, setContent] = useState(kol?.drafts?.[kol.status] || '');
  const [err, setErr] = useState('');
  const stageLabel = { draft_pending: '大纲', script_pending: '脚本', video_pending: '视频初稿' }[kol?.status] || '稿件';

  const ok = () => {
    if (!name.trim()) { setErr('请填写达人昵称'); return; }
    if (!kol && !link.trim() && !content.trim()) { setErr('请填写飞书文档链接或粘贴稿件正文'); return; }
    if (link.trim() && !/feishu\.cn|larksuite/.test(link.trim())) { setErr('请填写有效的飞书文档链接'); return; }
    if (kol) {
      api.saveKolDraft(projectId, kol.id, kol.status, content);
      if (link.trim() !== (kol.docLink || '')) api.saveKolDocLink(projectId, kol.id, link);
      toast(`已保存达人「${name.trim()}」的稿件信息`);
    } else {
      api.addKol(projectId, { name: name.trim(), link: link.trim(), draftContent: content.trim() });
      toast(`已添加达人「${name.trim()}」稿件，状态：大纲待审核`);
    }
    onClose();
  };

  const loadTextFile = async (file) => {
    if (!file) return;
    try {
      setContent(await file.text());
      setErr('');
    } catch {
      setErr('读取文件失败，请粘贴稿件正文后重试');
    }
  };

  return (
    <Modal
      title={kol ? `录入达人${stageLabel}正文` : '新增达人稿件'}
      sub={kol ? `更新飞书文档链接或录入${stageLabel}正文；审稿时优先从飞书实时读取` : '添加飞书文档链接，审稿时将自动读取正文；也可直接录入大纲'}
      width={640}
      onClose={onClose}
      footer={
        <>
          {err && <span className="flex1" style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</span>}
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={ok}>{kol ? '保存稿件正文' : '提交并开始审稿流程'}</button>
        </>
      }
    >
      {!kol && (
        <div className="field">
          <label>达人昵称</label>
          <input className="input" placeholder="例：林小鹿 Lin" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
      )}
      <div className="field">
          <label>达人稿件 · 飞书新版文档链接 <span className="hint">需要应用已获得该文档阅读权限</span></label>
          <div className="row gap8">
            <div className="flex1 row gap8 link-prefix">
              <Icon name="link" size={15} style={{ color: 'var(--text-3)', flex: 'none' }} />
              <input className="input" placeholder="https://xxx.feishu.cn/docx/..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          </div>
          <div className="small muted mt8">目前支持 /docx/ 文档链接；首次使用需在飞书开放平台配置自建应用，并将应用添加到该文档。</div>
      </div>
      <div className="field">
        <label>{kol ? `${stageLabel}稿件正文` : '大纲正文'} <span className="hint">可粘贴正文，或上传 TXT / Markdown 文件</span></label>
        <input ref={fileRef} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" style={{ display: 'none' }}
          onChange={(e) => { loadTextFile(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="row gap8" style={{ marginBottom: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={13} /> 上传文本文件</button>
          {content && <span className="small muted">{content.length} 字符</span>}
        </div>
        <textarea className="textarea" rows={9} value={content} onChange={(e) => setContent(e.target.value)}
          placeholder={kol ? `粘贴达人${stageLabel}全文；分段或按镜头/时间轴换行，AI 会逐段定位问题…` : '粘贴达人真实大纲正文；分段换行可帮助 AI 精确定位批注…'} />
      </div>
      <div className="row gap8 flow-tip">
        <Icon name="spark" size={15} style={{ color: 'var(--brand)' }} />
        <span className="small muted">审稿时实时读取飞书文档正文；读取失败会提示原因，不会静默使用演示稿。飞书正文需要可用的云端 AI 才能生成真实审核建议。</span>
      </div>
    </Modal>
  );
}
