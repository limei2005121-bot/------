import React, { useRef, useState } from 'react';
import { uid } from '../logic/constants.js';
import { Icon, Seg, useToast } from './common.jsx';

/**
 * 品牌介绍 / 产品 Brief 等前置资料的文档化输入。
 * 支持两种资料形式：飞书文档链接、上传文件（txt/md 自动提取文本）。
 * docs: [{ id, kind: 'feishu'|'file', title?/name, url?/size?, parsed? }]
 * text: 解析文本（供 AI 审稿判据），用户可手动补充。
 */
const MODES = [
  { key: 'feishu', label: '飞书文档链接' },
  { key: 'file', label: '上传文件' }
];

const TEXT_EXTS = ['txt', 'md', 'markdown', 'text'];

function extractText(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (TEXT_EXTS.includes(ext) || (file.type || '').startsWith('text/')) {
    return file.text().then((t) => t.slice(0, 20000));
  }
  return Promise.resolve(null);
}

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export default function BriefDocInput({
  docs = [],
  onDocs,
  text = '',
  onText,
  rows = 3,
  fileHint = 'txt / md / docx / pdf',
  parseHint,
  parsePlaceholder,
  listTitle
}) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [mode, setMode] = useState('feishu');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');

  const addFeishu = () => {
    const raw = link.trim();
    if (!raw) { toast('请先粘贴飞书文档链接', 'err'); return; }
    const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    if (!/feishu\.cn|larksuite\.com/i.test(url)) { toast('仅支持飞书文档链接（feishu.cn / larksuite.com）', 'err'); return; }
    const doc = {
      id: uid('doc'),
      kind: 'feishu',
      title: title.trim() || '飞书文档',
      url
    };
    onDocs([...docs, doc]);
    setTitle('');
    setLink('');
    toast('已添加飞书文档，关键内容可在下方解析文本中补充');
  };

  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const added = [];
    const fragments = [];
    for (const file of files) {
      const doc = { id: uid('doc'), kind: 'file', name: file.name, size: fmtSize(file.size), parsed: false };
      try {
        const txt = await extractText(file);
        if (txt && txt.trim()) {
          doc.parsed = true;
          fragments.push(`〔${file.name}〕\n${txt.trim()}`);
        }
      } catch (err) { /* 保留文件信息即可 */ }
      added.push(doc);
    }
    onDocs([...docs, ...added]);
    if (fragments.length) onText([text, ...fragments].filter(Boolean).join('\n\n'));
    const ok = fragments.length;
    toast(added.length === 1 ? `已上传「${added[0].name}」${ok ? '，并自动提取文本' : ''}` : `已上传 ${added.length} 个文件，其中 ${ok} 个已提取文本`, ok ? 'ok' : '');
  };

  const removeDoc = (id) => onDocs(docs.filter((d) => d.id !== id));

  return (
    <div>
      <div className="row gap8 wrap">
        <Seg options={MODES} value={mode} onChange={setMode} />
        {docs.length > 0 && <span className="small muted">已添加 {docs.length} 份资料</span>}
      </div>

      {mode === 'feishu' && (
        <div className="mt8">
          <div className="row gap8 wrap">
            <input className="input" style={{ flex: '0 1 150px', minWidth: 120 }} placeholder="资料名称（可选）"
              value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex1 row gap8 link-prefix" style={{ minWidth: 220 }}>
              <Icon name="link" size={15} style={{ color: 'var(--text-3)', flex: 'none' }} />
              <input className="input" placeholder="https://xxx.feishu.cn/docx/…"
                value={link} onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeishu(); } }} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={addFeishu}>添加</button>
          </div>
          <div className="row gap8 mt8 small muted" style={{ lineHeight: 1.7 }}>
            <Icon name="bulb" size={13} style={{ color: 'var(--brand)', flex: 'none', marginTop: 1 }} />
            <span>演示环境不直接读取飞书内容，添加链接后请在下方“解析文本”粘贴该文档的关键信息，作为 AI 审稿判据。</span>
          </div>
        </div>
      )}

      {mode === 'file' && (
        <div className="mt8">
          <div className="upload-zone sm" onClick={() => fileRef.current && fileRef.current.click()}>
            <div className="row" style={{ justifyContent: 'center', gap: 8, color: 'var(--text-2)' }}>
              <Icon name="upload" size={16} />
              <span>点击选择 / 拖入文档（{fileHint}）</span>
            </div>
            <input ref={fileRef} type="file"
              accept=".txt,.md,.markdown,.doc,.docx,.pdf,text/*" multiple style={{ display: 'none' }} onChange={pick} />
          </div>
          <div className="small muted mt8">txt / md 自动提取文本到下方解析区；docx / pdf 仅保留文件，关键信息请在下方粘贴补充。</div>
        </div>
      )}

      {docs.length > 0 && (
        <div className="file-list">
          {docs.map((d) => (
            <div key={d.id} className="file-row">
              <Icon name={d.kind === 'file' ? 'doc' : 'link'} size={15} style={{ color: 'var(--brand)', flex: 'none' }} />
              <div className="flex1 row gap8" style={{ minWidth: 0 }}>
                <span className="ellipsis" style={{ fontWeight: 500 }}>{d.kind === 'file' ? d.name : d.title}</span>
                <span className="muted small ellipsis" style={{ flex: 'none', maxWidth: '46%' }}>
                  {d.kind === 'file' ? (d.size || '') + (d.parsed ? ' · 已提取文本' : '') : d.url}
                </span>
              </div>
              {d.kind === 'feishu' && (
                <a className="btn btn-ghost btn-sm" href={d.url} target="_blank" rel="noreferrer" title="打开飞书文档">
                  <Icon name="external" size={13} />
                </a>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => removeDoc(d.id)} title="移除">
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="docsrc-parse">
        <div className="docsrc-parse-head">
          <b>{listTitle || '解析文本 · AI 审稿判据'}</b>
          <span className="small muted">{parseHint || '上传 txt/md 自动提取，也可直接粘贴关键信息'}</span>
        </div>
        <textarea className="textarea" rows={rows}
          placeholder={parsePlaceholder || '可粘贴飞书文档 / docx / pdf 中的品牌定位、核心客群、卖点、投放要求等关键信息…'}
          value={text} onChange={(e) => onText(e.target.value)} />
      </div>
    </div>
  );
}
