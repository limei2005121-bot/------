import React from 'react';
import { Modal, Icon } from './common.jsx';

const STEPS = [
  { n: 1, t: '新建项目', d: '录入品牌介绍、产品 Brief、对标视频、内容/拍摄注意事项与竞品，勾选后 AI 自动生成选题库与卡审清单。' },
  { n: 2, t: '上传达人稿件（飞书链接）', d: '新增达人并粘贴其飞书文档链接，稿件进入「大纲待审核」。' },
  { n: 3, t: 'AI 审稿 → 修订式批注', d: '点击「AI 审大纲 / 审脚本 / 审视频」，AI 依据前置信息在文档对应位置生成修订批注。' },
  { n: 4, t: '您复核批注', d: '可逐条编辑、补充或删除批注；确认后系统 @ 通知达人按批注修改。' },
  { n: 5, t: '状态流转', d: '达人改完由您手动确认，依次经历：大纲 → 脚本 → 拍摄 → 视频 → 定稿 · 定时发布。' }
];

export default function IntroModal({ onClose }) {
  return (
    <Modal title="使用引导" sub="达人种草执行平台 · 一次完整的 AI 审稿如何运作" width={680} onClose={onClose}
      footer={
        <>
          <span className="flex1 small muted">内置示例项目已准备好 8 位达人、不同阶段的稿件，可直接体验「复核批注」「状态流转」。</span>
          <button className="btn btn-primary" onClick={onClose}>我知道了</button>
        </>
      }>
      <div className="intro-steps">
        {STEPS.map((s) => (
          <div key={s.n} className="intro-step">
            <span className="wizard-no">{s.n}</span>
            <div>
              <b>{s.t}</b>
              <div className="muted small" style={{ marginTop: 3, lineHeight: 1.7 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="divider" />
      <div className="intro-note row gap8">
        <Icon name="bolt" size={15} style={{ color: 'var(--brand)' }} />
        <div className="small" style={{ lineHeight: 1.7 }}>
          <b>试用建议：</b>打开示例项目「植愈精华 · 618」→ 在「执行看板」中找到「大纲待审核 / 脚本待审核」的达人 → 点击<b>「复核批注」</b>进入修订视图，编辑任意批注后点击<b>「确认批注，准备通知达人」</b>即可看到飞书消息预览。
        </div>
      </div>
      <div className="intro-note row gap8" style={{ marginTop: 8 }}>
        <Icon name="settings" size={15} style={{ color: 'var(--text-3)' }} />
        <div className="small muted" style={{ lineHeight: 1.7 }}>
          <b>扩展说明：</b>默认由「本地模拟引擎」驱动以保证演示可用；如需接入云端大模型，复制 <code className="code">server/.env.example</code> 为 <code className="code">server/.env</code> 填入 <code className="code">AI_API_KEY</code> 并运行 <code className="code">npm run server</code>，即可自动切换为云端大模型（兼容 Kimi / GLM / 通义 / DeepSeek / 豆包等 OpenAI 兼容接口），联网失败时自动回退本地引擎；接入飞书开放平台后还可真读文档 / 真写修订批注 / 真发 @ 通知。
        </div>
      </div>
    </Modal>
  );
}
