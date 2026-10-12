import { DEMO_AGENTS } from './desk-demo';
import type { DemoStatus } from './desk-demo';
import './AgentTerminal.css';

// Symbol mode in Herdr's shell renderer; conversations and code below remain demo data.
const MARKS: Record<DemoStatus, string> = { blocked: '×', working: '◐', done: '✓', idle: '○' };

type Props = { focused: number; statuses: DemoStatus[]; progress?: 'editing' | 'testing'; onFocus: (index: number) => void; onAnswer: () => void };

/** Browser simulation using Herdr's spaces / grouped agents / focused terminal structure. */
export function AgentTerminal({ focused, statuses, progress, onFocus, onAnswer }: Props) {
  const agent = DEMO_AGENTS[focused];
  const status = statuses[focused];
  return <section className="reveal-terminal reveal-coding-terminal" aria-label="Coding agent demo terminal" data-focused={agent.id} data-status={status}>
    <div className="agent-window-bar"><span className="agent-window-dots" aria-hidden="true"><i /><i /><i /></span><span>Ghostty — herdr</span><span className="agent-simulation">SIMULATED</span></div>
    <div className="agent-herdr-frame"><aside className="agent-sidebar" aria-label="herdr demo agents"><a className="agent-herdr-wordmark" href="https://herdr.dev">herdr <span>↗</span></a><p className="agent-sidebar-label">spaces</p>{['corral', 'dashboard', 'api'].map(workspace => <div className={`agent-workspace ${workspace === agent.workspace ? 'agent-workspace-selected' : ''}`} key={workspace}><span>▣</span>{workspace}</div>)}<p className="agent-sidebar-label agent-group-label">agents <span>grouped</span></p>{DEMO_AGENTS.map((item, index) => <button key={item.id} type="button" aria-label={`Focus ${item.id} in herdr demo`} aria-pressed={focused === index} onClick={() => onFocus(index)} className={`agent-sidebar-entry agent-status-${statuses[index]}`}><span className="agent-status-mark" aria-hidden="true">{MARKS[statuses[index]]}</span><span>{item.id}<small>{statuses[index]} · {item.cli === 'Claude Code' ? 'claude' : item.cli.toLowerCase()}</small></span></button>)}</aside>
      <div className="agent-focused-pane"><div className="agent-pane-bar"><span><i />{agent.workspace} / {agent.id}</span><span>{agent.branch}</span></div><div className="agent-terminal-session" aria-live="polite">
        <div className="agent-cli-heading"><h2>{agent.cli}</h2><span>~/Projects/{agent.workspace}</span></div>
        <p className="agent-user-prompt"><span aria-hidden="true">❯</span>{agent.task}</p>
        {agent.diff.length > 0 ? <><p className="agent-read-line"><span aria-hidden="true">●</span> {status === 'blocked' ? 'Proposed edit' : 'Update'} <strong>{agent.file}</strong></p><pre className="agent-code-diff" aria-label="Proposed code change">{agent.diff.map((line, index) => <code key={index} className={`agent-diff-${line.kind}`}><span aria-hidden="true">{line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}</span>{line.text}</code>)}</pre></> : <p className="agent-background-log"><span className="agent-log-mark" aria-hidden="true">●</span><span className="agent-log-text">{status === 'idle' ? 'Ready for the next task.' : 'Working in this example session. No action needed.'}</span></p>}
        {status === 'blocked' ? <div className="agent-decision"><p>One decision before I continue.</p><h3>{agent.question}</h3><button type="button" onClick={onAnswer}>Yes, keep it <span aria-hidden="true">↵</span></button></div> : status === 'done' ? <div className="agent-run-output agent-run-complete"><p><span aria-hidden="true">❯</span> {agent.testCommand}</p><p className="agent-test-result">✓ {agent.testResult}</p><p>Done. Ready for your review.</p></div> : progress ? <div className="agent-run-output"><p className="agent-back-to-work">Back to work.</p><p><span aria-hidden="true">●</span> {progress === 'editing' ? `Updating ${agent.file}…` : focused === 0 ? 'Running keyboard navigation tests…' : 'Running offline agent tests…'}</p><p className="agent-run-command">{progress === 'testing' ? `❯ ${agent.testCommand}` : 'Decision received. Applying the change.'}<span className="agent-run-cursor" aria-hidden="true">▌</span></p></div> : <div className="agent-run-output"><p>{status === 'idle' ? 'Standing by.' : 'Agent working. You can stay in your flow.'}</p></div>}
      </div><div className="agent-pane-status"><span>~/Projects/{agent.workspace}</span><span className={`agent-focus-status agent-status-${status}`}><span aria-hidden="true">{MARKS[status]}</span><span>{status}</span></span></div></div>
    </div><div className="agent-demo-disclaimer">Browser demo · sample code and test output · no commands executed.</div>
  </section>;
}
