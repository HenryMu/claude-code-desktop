import React, { useState, useRef, useEffect } from 'react'
import type { SessionMeta, ActiveProcess, JsonlLine, SessionDetailsPayload } from '../../../shared/types'
import type { TabType } from '../App'

interface ProjectData {
  sanitizedName: string
  realPath: string
  sessions: SessionMeta[]
}

interface SessionState {
  projects: ProjectData[]
  selectedProject: string | null
  selectedSession: string | null
  selectProject: (name: string) => void
  selectSession: (project: string, sessionId: string) => void
  sessionDetails: SessionDetailsPayload | null
}

interface ClaudeState {
  activeProcesses: ActiveProcess[]
  spawn: (project: string) => void
  resume: (project: string, sessionId: string) => void
  kill: (project: string) => void
  isRunning: (project: string) => boolean
  activeTerminalProject: string | null
  setActiveTerminalProject: (project: string | null) => void
}

interface MainContentProps {
  sessionState: SessionState
  claudeState: ClaudeState
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function MainContent({ sessionState, claudeState, activeTab, onTabChange }: MainContentProps) {
  const { selectedProject, selectedSession, sessionDetails, projects } = sessionState
  const project = projects.find((p) => p.sanitizedName === selectedProject)
  const hasTerminal = claudeState.activeProcesses.some((p) => p.projectSanitizedName === selectedProject)

  if (!selectedProject || !project) {
    return (
      <div className="main-content">
        <div className="empty-state">Select a project to view sessions</div>
      </div>
    )
  }

  return (
    <div className="main-content">
      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'conversation' ? 'active' : ''}`}
          onClick={() => onTabChange('conversation')}
        >
          Conversation
        </button>
        <button
          className={`tab-item ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => onTabChange('terminal')}
        >
          Terminal
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'conversation' ? (
          <ConversationTab
            project={selectedProject}
            realPath={project.realPath}
            selectedSession={selectedSession}
            sessionDetails={sessionDetails}
            hasTerminal={hasTerminal}
            onNewSession={() => claudeState.spawn(selectedProject)}
          />
        ) : (
          <TerminalTab
            project={selectedProject}
            realPath={project.realPath}
            hasTerminal={hasTerminal}
            onNewSession={() => claudeState.spawn(selectedProject)}
          />
        )}
      </div>
    </div>
  )
}

// ===== Conversation Tab =====

function ConversationTab({ project, realPath, selectedSession, sessionDetails, hasTerminal, onNewSession }: {
  project: string
  realPath: string
  selectedSession: string | null
  sessionDetails: SessionDetailsPayload | null
  hasTerminal: boolean
  onNewSession: () => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [permissionPrompt, setPermissionPrompt] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const ptyBufferRef = useRef('')

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessionDetails])

  // Listen to PTY data for permission prompts
  useEffect(() => {
    const unsub = window.electronAPI.onPtyData((payload) => {
      if (payload.projectSanitizedName !== project) return
      // Accumulate PTY output, check for permission patterns
      ptyBufferRef.current += payload.data
      // Strip ANSI escape codes for pattern matching
      const stripped = ptyBufferRef.current.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')

      // Claude Code permission patterns
      const patterns = [
        /Allow(?:ing)?\s+(\w+)\s+(?:tool|command|operation|access)[\s\S]{0,80}\?/i,
        /Do you want to (?:allow|proceed|continue)[\s\S]{0,80}\?/i,
        /\[Y\/n\]/i,
        /\[y\/N\]/i,
        /\(yes\/no\)/i,
        /\(y\/n\)/i,
        /Claude wants to (?:run|execute|use|access|write|edit|delete)[\s\S]{0,80}\?/i,
        /Allow this action\?/i,
        /Press Enter to (?:allow|accept|confirm)[\s\S]{0,80}/i,
        /(?:(?:Always|Never|Once)\s+)?\(.*[Yy].*[Nn].*\)/,
      ]

      for (const pattern of patterns) {
        const match = stripped.match(pattern)
        if (match) {
          // Extract the last ~200 chars around the match for display
          const idx = match.index || 0
          const start = Math.max(0, idx - 20)
          const end = Math.min(stripped.length, idx + match[0].length + 100)
          setPermissionPrompt(stripped.slice(start, end).trim())
          // Clear buffer after detecting prompt
          ptyBufferRef.current = ''
          break
        }
      }

      // Keep buffer bounded
      if (ptyBufferRef.current.length > 5000) {
        ptyBufferRef.current = ptyBufferRef.current.slice(-2000)
      }
    })
    return unsub
  }, [project])

  // Claude Code uses raw mode for permission — single char, no Enter
  const handlePermissionResponse = (response: string) => {
    console.log('[ClaudeDesk] Permission response:', response, 'project:', project)
    window.electronAPI.ptyWrite(project, response)
    setPermissionPrompt(null)
    ptyBufferRef.current = ''
  }

  // Clear permission when user sends a message
  useEffect(() => {
    if (inputValue) setPermissionPrompt(null)
  }, [inputValue])

  if (!selectedSession) {
    return (
      <div className="tab-pane">
        <div className="empty-state">Select a session to start a conversation</div>
      </div>
    )
  }

  // Filter messages: skip user messages that only contain tool_result (no visible text)
  const allMessages = (sessionDetails?.lines || []).filter(
    (line) => line.type === 'user' || line.type === 'assistant'
  )
  const messages = allMessages.filter((msg) => {
    if (msg.type === 'user') {
      const content = msg.message?.content
      if (typeof content === 'string') return content.trim().length > 0
      if (Array.isArray(content)) {
        // Check if there's any text content beyond tool_result
        const hasText = content.some((b: any) => b.type === 'text' && b.text?.trim())
        return hasText
      }
      return false
    }
    return true
  })

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return
    console.log('[ClaudeDesk] Sending:', text, 'to project:', project)
    window.electronAPI.ptyWrite(project, text + '\r')
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="tab-pane history-pane">
      <div className="history-messages">
        {messages.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p style={{ color: 'var(--text-muted)' }}>No messages yet</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageItem key={msg.uuid || i} line={msg} project={project} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Permission prompt bar */}
      {permissionPrompt && (
        <div className="permission-bar">
          <span className="permission-text">{permissionPrompt}</span>
          <div className="permission-actions">
            <button className="btn btn-allow" onClick={() => handlePermissionResponse('y')}>Allow (y)</button>
            <button className="btn btn-allow" onClick={() => handlePermissionResponse('a')}>Always (a)</button>
            <button className="btn btn-deny" onClick={() => handlePermissionResponse('n')}>Deny (n)</button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder={hasTerminal ? "Type a message and press Enter..." : "Waiting for session to connect..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!hasTerminal}
        />
        <button className="btn" onClick={handleSend} disabled={!inputValue.trim() || !hasTerminal}>
          Send
        </button>
      </div>
    </div>
  )
}

// ===== Terminal Tab =====

function TerminalTab({ project, realPath, hasTerminal, onNewSession }: {
  project: string
  realPath: string
  hasTerminal: boolean
  onNewSession: () => void
}) {
  if (!hasTerminal) {
    return (
      <div className="tab-pane">
        <div className="empty-state">
          <div>
            <p style={{ marginBottom: 16 }}>No active terminal session</p>
            <button className="btn" onClick={onNewSession}>Start New Session</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tab-pane">
      <TerminalPane project={project} realPath={realPath} />
    </div>
  )
}

// ===== xterm.js Terminal Pane =====

function TerminalPane({ project, realPath }: { project: string; realPath: string }) {
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let term: any = null
    let fitAddon: any = null
    let cleanupData: (() => void) | null = null
    let cleanupExited: (() => void) | null = null

    const init = async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      await import('@xterm/xterm/css/xterm.css')

      term = new Terminal({
        theme: {
          background: '#11111b',
          foreground: '#cdd6f4',
          cursor: '#f5e0dc',
          selectionBackground: '#45475a'
        },
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        cursorBlink: true
      })

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      if (terminalRef.current) {
        term.open(terminalRef.current)
        fitAddon.fit()
      }

      cleanupData = window.electronAPI.onPtyData((payload) => {
        if (payload.projectSanitizedName === project) {
          term?.write(payload.data)
        }
      })

      cleanupExited = window.electronAPI.onPtyExited((payload) => {
        if (payload.projectSanitizedName === project) {
          term?.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n')
        }
      })

      term.onData((data: string) => {
        window.electronAPI.ptyWrite(project, data)
      })

      const observer = new ResizeObserver(() => {
        if (fitAddon) {
          try { fitAddon.fit() } catch {}
          const cols = term?.cols || 80
          const rows = term?.rows || 24
          window.electronAPI.ptyResize(project, cols, rows)
        }
      })
      if (terminalRef.current) {
        observer.observe(terminalRef.current)
      }
    }

    init()

    return () => {
      cleanupData?.()
      cleanupExited?.()
      term?.dispose()
    }
  }, [project])

  return (
    <div className="terminal-pane">
      <div className="terminal-container" ref={terminalRef} />
    </div>
  )
}

// ===== Message rendering =====

function extractToolPairs(content: any[]): { toolUse: any; toolResult?: any }[] {
  const toolUseBlocks = content.filter((b: any) => b.type === 'tool_use')
  const toolResultBlocks = content.filter((b: any) => b.type === 'tool_result')
  const resultMap = new Map<string, any>()
  for (const r of toolResultBlocks) {
    resultMap.set(r.tool_use_id, r)
  }
  return toolUseBlocks.map((tu: any) => ({
    toolUse: tu,
    toolResult: resultMap.get(tu.id)
  }))
}

function getToolSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Bash':
      return `$ ${input.command || ''}`
    case 'Read':
      return `${input.file_path || ''}${input.offset ? `:${input.offset}-${input.limit ? Number(input.offset) + Number(input.limit) : ''}` : ''}`
    case 'Write':
      return `${input.file_path || ''}`
    case 'Edit':
      return `${input.file_path || ''}`
    case 'Glob':
      return `${input.pattern || ''}`
    case 'Grep':
      return `"${input.pattern || ''}" in ${input.glob || 'all files'}`
    case 'Agent':
      return `${input.description || ''}`
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskGet':
    case 'TaskList':
      return `${input.subject || input.taskId || ''}`
    default:
      return ''
  }
}

function getToolResultText(result: any): string {
  if (!result) return ''
  const content = result.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
  }
  return ''
}

function getToolIcon(name: string): string {
  switch (name) {
    case 'Bash': return '⌨'
    case 'Read': return '📄'
    case 'Write': return '✏'
    case 'Edit': return '✎'
    case 'Glob': return '🔍'
    case 'Grep': return '🔍'
    case 'Agent': return '⚙'
    default: return '▸'
  }
}

function MessageItem({ line, project }: { line: JsonlLine; project: string }) {
  const role = line.message?.role || line.type
  const content = line.message?.content

  let textContent: string = ''
  if (typeof content === 'string') {
    textContent = content
  } else if (Array.isArray(content)) {
    textContent = content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
  }

  const toolPairs = Array.isArray(content) ? extractToolPairs(content) : []
  const thinkingBlocks = Array.isArray(content)
    ? content.filter((b: any) => b.type === 'thinking')
    : []

  // Skip if nothing to render
  if (!textContent.trim() && toolPairs.length === 0 && thinkingBlocks.length === 0) {
    return null
  }

  return (
    <div className={`message message-${role}`}>
      <div className={`message-role ${role === 'user' ? 'role-user' : 'role-assistant'}`}>
        {role === 'user' ? 'You' : 'Claude'}
      </div>
      <div className="message-content">
        {textContent.trim() && (
          <pre className="message-text">{textContent}</pre>
        )}

        {thinkingBlocks.map((block: any, i: number) => (
          <details key={`think-${i}`} className="thinking-block">
            <summary className="thinking-header">Thinking...</summary>
            <div className="thinking-content">{block.thinking}</div>
          </details>
        ))}

        {toolPairs.map((pair, i) => (
          <ToolCall
            key={`tool-${i}`}
            name={pair.toolUse.name}
            input={pair.toolUse.input}
            result={pair.toolResult}
            project={project}
          />
        ))}
      </div>
    </div>
  )
}

function ToolCall({ name, input, result, project }: {
  name: string
  input: Record<string, unknown>
  result?: any
  project: string
}) {
  const [expanded, setExpanded] = useState(false)
  const summary = getToolSummary(name, input)
  const resultText = getToolResultText(result)
  const icon = getToolIcon(name)
  const hasResult = resultText.length > 0
  const isError = result?.is_error

  return (
    <div className={`tool-call ${isError ? 'tool-error' : ''}`}>
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-icon">{icon}</span>
        <span className="tool-name">{name}</span>
        <span className="tool-summary">{summary}</span>
        <span className="tool-expand">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="tool-call-detail">
          {name === 'Bash' && input.command && (
            <pre className="tool-command">{input.command as string}</pre>
          )}
          {name === 'Edit' && input.old_string && (
            <div className="tool-edit">
              <div className="tool-edit-label">Replace:</div>
              <pre className="tool-code">{(input.old_string as string).slice(0, 500)}</pre>
              <div className="tool-edit-label">With:</div>
              <pre className="tool-code">{(input.new_string as string).slice(0, 500)}</pre>
            </div>
          )}
          {name === 'Write' && input.content && (
            <pre className="tool-code">{(input.content as string).slice(0, 500)}</pre>
          )}
        </div>
      )}

      {hasResult && (
        <div className={`tool-result ${expanded ? '' : 'tool-result-collapsed'}`}>
          <pre>{resultText.slice(0, expanded ? Infinity : 200)}</pre>
        </div>
      )}
    </div>
  )
}
