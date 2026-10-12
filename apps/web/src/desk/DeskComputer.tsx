import { AgentTerminal } from './AgentTerminal';
import { DeskFieldNotes } from './DeskFieldNotes';
import { DeskArcade } from './DeskArcade';
import type { DeskSound } from './desk-sfx';
import type { DemoStatus } from './desk-demo';
import type { DeskBrowserPage } from './desk-contract';
import { ArtCredits, GITHUB, InstallCommands, SetupNotes } from './shared';
import './DeskComputer.css';

type Props = {
  app: 'terminal' | 'browser' | 'arcade'; page: DeskBrowserPage;
  arcadeActive?: boolean;
  onSound?: (cue:DeskSound) => void;
  focused: number; statuses: DemoStatus[]; progress?: 'editing' | 'testing';
  completed?:number[];
  onFocus: (index: number) => void; onAnswer: () => void;
  onApp: (app: 'terminal' | 'browser' | 'arcade') => void; onPage: (page: DeskBrowserPage) => void;
  suggestPreview?:boolean;
};


export function DeskComputer({ app, page, focused, statuses, progress, onFocus, onAnswer, onApp, onPage, suggestPreview=false, arcadeActive=false, onSound,completed=[] }: Props) {
  return <section className="desk-computer" aria-label="Desk monitor" data-app={app}>
    <div className="desk-computer-menubar"><span>corral desktop <small>INTERACTIVE DEMO</small></span><span>your agents keep working</span></div>
    <div className="desk-app-content"><div className="desk-app-window" hidden={app!=='terminal'}><AgentTerminal completed={completed.includes(focused)} focused={focused} statuses={statuses} progress={progress} onFocus={onFocus} onAnswer={onAnswer} /></div><section className="desk-browser" aria-label="Demo browser" hidden={app!=='browser'}>
      <div className="desk-browser-tabs">{(['preview', 'install', 'source', 'about'] as const).map(tab => <button type="button" key={tab} aria-pressed={page === tab} onClick={() => onPage(tab)}>{tab === 'preview' ? 'Field notes' : tab === 'install' ? 'Install Corral' : tab === 'source' ? 'Source' : 'Desk notes'}</button>)}</div>
      <div className="desk-address"><span aria-hidden="true">◇</span><span>demo://corral/{page}</span><span>SIMULATED BROWSER</span></div>
      <div className="desk-browser-document" tabIndex={0}><div hidden={page!=='preview'}><DeskFieldNotes /></div>{page === 'preview' ? null : page === 'install' ? <div className="desk-guide"><span className="desk-browser-eyebrow">MAKE YOUR OWN DESK A LITTLE MORE ALIVE</span><h2>Install Corral</h2><p>A pixel-art home for your coding agents on a <strong>Stream Deck +</strong>. Tap a character to bring its agent forward in herdr and Ghostty.</p><SetupNotes /><InstallCommands /><p>Run these in your own terminal. This browser demo never executes commands.</p></div> : page === 'source' ? <div className="desk-guide"><span className="desk-browser-eyebrow">THE FLOPPY STILL HAS ROOM</span><h2>Small plugin. Open source.</h2><p>The real source, installation details and theme documentation live here.</p><a className="desk-browser-link" href={GITHUB} target="_blank" rel="noreferrer">github.com/fedeya/corral ↗</a><p>Build a theme. Change a character. Make it yours.</p><a href={`${GITHUB}/blob/main/docs/adding-a-theme.md`} target="_blank" rel="noreferrer">Read the theme guide ↗</a></div> : <div className="desk-guide"><span className="desk-browser-eyebrow">MARGINALIA / A FEW THINGS ON THE DESK</span><h2>Tools can have a little soul.</h2><p>A rubber duck for the bug you can’t explain. A rocket for the things you haven’t built yet. A book that makes the world a little stranger. Mate for the next thought.</p><p>Corral starts with a practical idea: you shouldn’t have to keep checking every coding-agent terminal. The ones who need you can come to you.</p><p>The room is an original illustration. The agent conversations, changes and test output are simulated. Nothing on this page runs a coding agent.</p><button type="button" className="desk-browser-link" onClick={() => onPage('install')}>Make this your real desk →</button></div>}</div>
      {page === 'about' && <div className="desk-browser-credits"><ArtCredits /></div>}
    </section><div className="desk-app-window" hidden={app!=='arcade'}><DeskArcade active={app==='arcade' && arcadeActive} onExit={()=>onApp('terminal')} onSound={onSound} /></div></div>
    <nav className="desk-dock" aria-label="Monitor applications"><button type="button" aria-label="Open terminal" aria-pressed={app === 'terminal'} onClick={() => onApp('terminal')}><span aria-hidden="true">❯_</span> Terminal</button><button type="button" aria-label="Open browser" data-invited={suggestPreview} aria-pressed={app === 'browser'} onClick={() => { onApp('browser'); onPage('preview'); }}><span aria-hidden="true">◎</span> Browser</button><button type="button" aria-label="Open arcade" aria-pressed={app==='arcade'} onClick={()=>onApp('arcade')}><span aria-hidden="true">✚</span> Arcade</button><button type="button" aria-label="Install from the monitor" onClick={() => { onApp('browser'); onPage('install'); }}><span aria-hidden="true">↓</span> Install</button></nav>
  </section>;
}
