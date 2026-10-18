import React, { useState } from 'react';
import { AppProvider, useApp } from './logic/store.jsx';
import { ToastProvider, Confirm } from './components/common.jsx';
import TopBar from './components/layout/TopBar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import HomeView from './components/HomeView.jsx';
import ProjectDetailView from './components/ProjectDetailView.jsx';
import CalendarView from './components/CalendarView.jsx';
import NewProjectModal from './components/NewProjectModal.jsx';
import IntroModal from './components/IntroModal.jsx';

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AppProvider>
  );
}

function Shell() {
  const { state, resetDemo, clearAll, setAiModel, createProject } = useApp();
  const [route, setRoute] = useState({ view: 'home' });
  const [showNew, setShowNew] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [askReset, setAskReset] = useState(false);

  const handleCreate = (form) => {
    const pid = createProject(form); // 先真正写入新项目
    setShowNew(false);
    goProject(pid); // 再跳转到新项目详情
  };

  const project = route.view === 'project' ? state.projects.find((p) => p.id === route.id) : null;

  const goProject = (id) => setRoute({ view: 'project', id });
  const goHome = () => setRoute({ view: 'home' });
  const goCalendar = () => setRoute({ view: 'calendar' });

  return (
    <div className="app">
      <TopBar
        aiModel={state.aiModel || 'qwen3.8-max'}
        onModelChange={(m) => setAiModel(m)}
        onNew={() => setShowNew(true)}
        onIntro={() => setShowIntro(true)}
        onResetDemo={() => setAskReset(true)}
      />
      <div className="app-body">
        <Sidebar
          projects={state.projects}
          activeId={project?.id}
          view={route.view}
          onSelect={(id) => goProject(id)}
          onHome={goHome}
          onCalendar={goCalendar}
          onNew={() => setShowNew(true)}
        />
        <main className="main">
          {route.view === 'calendar' ? (
            <CalendarView projects={state.projects} onOpen={goProject} onNew={() => setShowNew(true)} />
          ) : project ? (
            <ProjectDetailView key={project.id} project={project} onBack={goHome} />
          ) : (
            <HomeView onOpen={goProject} onNew={() => setShowNew(true)} />
          )}
        </main>
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
      {showIntro && <IntroModal onClose={() => setShowIntro(false)} />}
      {askReset && (
        <Confirm
          danger
          title="重置为演示数据"
          text="将清空当前所有修改，恢复为内置示例项目。示例项目内置 8 位达人、多种进行中的状态，方便你快速体验完整流程。"
          onOk={() => { resetDemo(); setAskReset(false); }}
          onClose={() => setAskReset(false)}
        />
      )}
    </div>
  );
}
