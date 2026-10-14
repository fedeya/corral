import type { CSSProperties } from 'react';
import { TitleWorld } from './TitleWorld';
import { DEMO_AGENTS } from './desk-demo';
import type { DemoStatus } from './desk-demo';
import type { ThemeId } from './shared';
import './DeskDevice.css';

type Props = { active: boolean; celebrating?: boolean; statuses: DemoStatus[]; focused: number; theme: ThemeId; closeup: boolean; interactive: boolean; scale: number; onFocus: (index: number) => void; onUrgent: () => void; onTheme: () => void; onZoom?:()=>void };
export function DeskDevice({ active, celebrating=false, statuses, focused, theme, closeup, interactive, scale, onFocus, onUrgent, onTheme, onZoom }: Props) {
  return <section className="desk-device" inert={!interactive} aria-label="Corral on the illustrated Stream Deck Plus" style={{ '--desk-key-hit': `${Math.max(52, 44 / scale)}px` } as CSSProperties}>
    <div className="desk-device-wordmark"><strong>CORRAL</strong><span>STREAM DECK +</span></div>
    {onZoom && <button type="button" className="desk-device-zoom" aria-label="Zoom in on the Stream Deck" onClick={onZoom}><span aria-hidden="true">↗</span></button>}
    <div className="desk-device-keys">{DEMO_AGENTS.map((agent, index) => <button type="button" key={agent.id} disabled={!interactive || closeup && index !== 0} onClick={() => onFocus(index)} aria-label={`${closeup && index === 0 ? 'Help agent api' : `Desk key ${agent.id}`} — ${statuses[index]}; open ${agent.cli} agent`} aria-pressed={focused === index && !closeup} data-celebrating={celebrating && index===0} data-status={statuses[index]} className="desk-key">
      <TitleWorld active={active} variant={index} theme={theme} needsHelp={statuses[index] === 'blocked'} resting={statuses[index] === 'idle' || statuses[index] === 'done'} />
      <span className="desk-key-name">{agent.id}</span><span className="desk-key-status" aria-hidden="true">{statuses[index]}</span>{statuses[index] === 'blocked' && <span className="desk-key-alert" aria-hidden="true">!</span>}{statuses[index] === 'done' && <span className="desk-key-check" aria-hidden="true">✓</span>}
    </button>)}</div>
    <div className="desk-device-strip" aria-hidden="true">{statuses.map((status, index) => <span key={index} data-status={status}><i />{index < 2 ? DEMO_AGENTS[index].id : ''}</span>)}</div>
    <div className="desk-device-dials">{[0,1,2,3].map(index => <button key={index} type="button" disabled={!interactive || closeup} aria-label={index === 3 ? 'Switch device theme' : `Push Corral dial ${index + 1}`} onClick={index === 3 ? onTheme : onUrgent}><span aria-hidden="true" /></button>)}</div>

  </section>;
}
