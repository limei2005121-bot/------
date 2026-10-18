import React from 'react';
import { Icon } from '../common.jsx';
import ModelPicker from './ModelPicker.jsx';

export default function TopBar({ aiModel, onModelChange, onNew, onIntro, onResetDemo }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="logo-mark">
          <Icon name="bolt" size={17} stroke={2} />
        </div>
        <div className="logo-text">
          <b>达人种草执行平台</b>
          <span>KOL Execution Console · AI 审稿工作台</span>
        </div>
      </div>

      <div className="topbar-right">
        <ModelPicker value={aiModel} onChange={onModelChange} />
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          <Icon name="plus" size={14} stroke={2.2} /> 新建项目
        </button>
        <span className="topbar-divider" />
        <button className="btn btn-ghost btn-sm" onClick={onIntro}>
          <Icon name="bulb" size={15} /> 使用引导
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onResetDemo} title="恢复内置示例数据">
          <Icon name="refresh" size={15} /> 重置演示
        </button>
      </div>
    </header>
  );
}
