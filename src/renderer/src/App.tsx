import React, { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import { useSessionWatcher } from './hooks/useSessionWatcher'
import { useClaudeManager } from './hooks/useClaudeManager'

export type TabType = 'conversation' | 'terminal'

export default function App() {
  const sessionState = useSessionWatcher()
  const claudeState = useClaudeManager()
  const [activeTab, setActiveTab] = useState<TabType>('conversation')

  // New session: spawn claude, switch to terminal (no JSONL history yet)
  const handleNewSession = useCallback((project: string) => {
    claudeState.spawn(project)
    setActiveTab('terminal')
  }, [claudeState])

  // Select session in sidebar: resume PTY + show conversation view
  const handleSelectSession = useCallback((project: string, sessionId: string) => {
    sessionState.selectSession(project, sessionId)
    claudeState.resume(project, sessionId)
    setActiveTab('conversation')
  }, [sessionState, claudeState])

  // Resume button: same as select — resume PTY + conversation view
  const handleResumeSession = useCallback((project: string, sessionId: string) => {
    sessionState.selectSession(project, sessionId)
    claudeState.resume(project, sessionId)
    setActiveTab('conversation')
  }, [sessionState, claudeState])

  return (
    <div className="app-layout">
      <Sidebar
        projects={sessionState.projects}
        selectedProject={sessionState.selectedProject}
        selectedSession={sessionState.selectedSession}
        activeProcesses={claudeState.activeProcesses}
        onSelectProject={sessionState.selectProject}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onResumeSession={handleResumeSession}
      />
      <MainContent
        sessionState={sessionState}
        claudeState={claudeState}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
