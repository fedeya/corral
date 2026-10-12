import { useEffect, useReducer } from 'react';

export type DemoStatus = 'blocked' | 'working' | 'done' | 'idle';
export type DemoAgent = {
  id: string; workspace: string; branch: string; cli: string; task: string;
  file: string; question: string; testCommand: string; testResult: string;
  diff: { kind: 'context' | 'add' | 'remove'; text: string }[];
};
export const DEMO_AGENTS: DemoAgent[] = [
  {
    id: 'api', workspace: 'corral', branch: 'feat/keyboard-nav', cli: 'Claude Code',
    task: 'Add keyboard navigation to the agent picker.', file: 'src/AgentPicker.tsx',
    question: 'Keep j/k alongside the arrow keys?', testCommand: 'bun test keyboard-navigation', testResult: '6 passed · 0 failed',
    diff: [
      { kind: 'context', text: 'function navigate(key: string) {' },
      { kind: 'remove', text: '  if (key === "ArrowDown") move(1);' },
      { kind: 'add', text: '  if (["ArrowDown", "j"].includes(key)) move(1);' },
      { kind: 'add', text: '  if (["ArrowUp", "k"].includes(key)) move(-1);' },
      { kind: 'context', text: '}' },
    ],
  },
  {
    id: 'web', workspace: 'dashboard', branch: 'feat/offline-agents', cli: 'Codex',
    task: 'Keep the agent list useful when the connection drops.', file: 'src/AgentList.tsx',
    question: 'Keep the last-known agents visible?', testCommand: 'bun test offline-agents', testResult: '4 passed · 0 failed',
    diff: [
      { kind: 'context', text: 'const visibleAgents = isOnline' },
      { kind: 'context', text: '  ? agents' },
      { kind: 'remove', text: '  : [];' },
      { kind: 'add', text: '  : lastKnownAgents;' },
    ],
  },
  ...[
    ['auth', 'api', 'OpenCode', 'Reviewing session handling.'],
    ['docs', 'corral', 'Claude Code', 'Writing the setup guide.'],
    ['search', 'dashboard', 'Codex', 'Improving search results.'],
    ['infra', 'api', 'OpenCode', 'Checking the build configuration.'],
    ['tests', 'corral', 'Codex', 'Reviewing regression coverage.'],
    ['billing', 'dashboard', 'Claude Code', 'Waiting for the next task.'],
  ].map(([id, workspace, cli, task]) => ({ id, workspace, cli, task, branch: 'main', file: '', question: '', testCommand: '', testResult: '', diff: [] })),
];

type Running = { startedAt: number; step: 'editing' | 'testing' };
export type DemoState = { revealed: boolean; focused: number; statuses: DemoStatus[]; running: Record<number, Running> };
export type DemoTiming = { testingAfterMs:number; finishAfterMs:number };
type Event = { type: 'reveal' | 'reset' | 'urgent' } | { type: 'focus'; index: number } | { type:'answer'; now:number } | { type:'advance'; now:number; timing?:DemoTiming };
export function initialDemoState(): DemoState {
  return { revealed: false, focused: 0, statuses: ['blocked', 'working', 'working', 'working', 'working', 'working', 'working', 'idle'], running: {} };
}
export function demoReducer(state: DemoState, event: Event): DemoState {
  switch (event.type) {
    case 'reset': return initialDemoState();
    case 'reveal': return { ...state, revealed: true, focused: 0 };
    case 'focus': return event.index >= 0 && event.index < DEMO_AGENTS.length ? { ...state, revealed: true, focused: event.index } : state;
    case 'urgent': {
      const index = state.statuses.findIndex(status => status === 'blocked');
      return index < 0 ? state : { ...state, revealed: true, focused: index };
    }
    case 'answer': {
      if (state.statuses[state.focused] !== 'blocked') return state;
      const statuses = [...state.statuses];
      statuses[state.focused] = 'working';
      return { ...state, statuses, running: { ...state.running, [state.focused]: { startedAt: event.now, step: 'editing' } } };
    }
    case 'advance': {
      let changed = false;
      const statuses = [...state.statuses];
      const running = { ...state.running };
      for (const [key, progress] of Object.entries(state.running)) {
        const index = Number(key);
        const elapsed = event.now - progress.startedAt;
        if (elapsed >= (event.timing?.finishAfterMs ?? 3200)) {
          statuses[index] = 'done'; delete running[index]; changed = true;
          if (index === 0 && statuses[1] === 'working' && !running[1]) statuses[1] = 'blocked';
        } else if (elapsed >= (event.timing?.testingAfterMs ?? 1300) && progress.step !== 'testing') {
          running[index] = { ...progress, step: 'testing' }; changed = true;
        }
      }
      return changed ? { ...state, statuses, running } : state;
    }
  }
}

export function useDeskDemo(timing:DemoTiming = { testingAfterMs:6500, finishAfterMs:11000 }) {
  const [state, dispatch] = useReducer(demoReducer, undefined, initialDemoState);
  const hasRunningDemo = Object.keys(state.running).length > 0;
  useEffect(() => {
    if (!hasRunningDemo) return;
    const timer = window.setInterval(() => dispatch({ type: 'advance', now: performance.now(), timing }), 100);
    return () => clearInterval(timer);
  }, [hasRunningDemo,timing.testingAfterMs,timing.finishAfterMs]);
  const status = state.statuses[state.focused];
  const phase = !state.revealed ? 'world' : status === 'blocked' ? 'question' : status === 'done' ? 'done' : 'working';
  return {
    ...state, phase, status, agent: DEMO_AGENTS[state.focused], progress: state.running[state.focused]?.step,
    reveal: () => dispatch({ type: 'reveal' }),
    focus: (index: number) => dispatch({ type: 'focus', index }),
    urgent: () => dispatch({ type: 'urgent' }),
    answer: () => dispatch({ type: 'answer', now: performance.now() }),
    replay: () => dispatch({ type: 'reset' }),
  };
}
