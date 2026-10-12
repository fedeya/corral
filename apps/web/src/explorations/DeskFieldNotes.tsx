import {useRef,useState} from 'react';
import './DeskFieldNotes.css';

const notes=[
  {id:'orbit',topic:'SPACE / 01',title:'Falling sideways',symbol:'◌',summary:'An orbit is a very patient fall.',body:'Throw a stone and it falls back to Earth. Throw it fast enough sideways, and the ground curves away as quickly as the stone falls. That is an orbit: not escaping gravity, but continuously missing the ground.',aside:'A small desk. A very large sky.'},
  {id:'gravity',topic:'PHYSICS / 02',title:'The elevator experiment',symbol:'↧',summary:'Gravity, acceleration, and a closed door.',body:'Inside a sealed elevator, the pull you feel while accelerating upward can resemble the pull of gravity. In free fall, you and a dropped pencil fall together. The pencil seems to float beside you. This thought experiment is one way into Einstein’s equivalence principle.',aside:'Good questions need less equipment than you think.'},
  {id:'roots',topic:'LIVING THINGS / 03',title:'Roots before branches',symbol:'⌁',summary:'Most of the work is out of sight.',body:'A plant is doing something even when nothing obvious changes. Roots explore the soil and leaves turn light into chemical energy. The visible growth is only part of the story. Water it, give it light, and resist the urge to check every minute.',aside:'Let things work. Come back when they need you.'},
  {id:'moon',topic:'SPACE / 04',title:'The same side of the Moon',symbol:'◐',summary:'Turning once while going around once.',body:'The Moon rotates once during each orbit around Earth. That is why we mostly see the same face, rather than because it never turns. Try walking around a coffee cup while keeping your face toward it. By the end, you have turned around too.',aside:'A little motion can change your whole perspective.'},
] as const;

export function DeskFieldNotes(){
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<string>('orbit');
  const [saved,setSaved]=useState<string[]>([]);
  const buttons=useRef<Array<HTMLButtonElement|null>>([]);
  const matches=notes.filter(note=>`${note.title} ${note.topic} ${note.body}`.toLowerCase().includes(query.toLowerCase()));
  const current=matches.find(note=>note.id===selected)??matches[0];
  return <section className="desk-field-notes" aria-label="Field notes reading corner">
    <header><span className="desk-browser-eyebrow">A SMALL READING CORNER</span><h2>Field notes</h2><p>Something to get lost in while your agents work.</p></header>
    <label className="desk-search">Search field notes<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Try gravity, roots, Moon…" /></label>
    <div className="desk-notes-layout">
      <nav aria-label="Browse field notes">{matches.map((note,index)=><button type="button" key={note.id} ref={button=>{buttons.current[index]=button;}} aria-label={`Read ${note.title}`} aria-pressed={current?.id===note.id} onClick={()=>setSelected(note.id)} onKeyDown={event=>{
        const direction=event.key==='ArrowDown'||event.key==='j'?1:event.key==='ArrowUp'||event.key==='k'?-1:0;
        if(direction){event.preventDefault();const next=(index+direction+matches.length)%matches.length;setSelected(matches[next].id);buttons.current[next]?.focus();}
      }}><span className="desk-note-glyph" aria-hidden="true">{note.symbol}</span><span><small>{note.topic}</small>{note.title}</span>{saved.includes(note.id)&&<span aria-label="Saved">◆</span>}</button>)}</nav>
      {current?<article><span className="desk-note-topic">{current.topic}</span><h3>{current.title}</h3><p className="desk-note-summary">{current.summary}</p><p>{current.body}</p><footer><em>{current.aside}</em><button type="button" aria-label={saved.includes(current.id)?'Unsave this note':'Save this note'} aria-pressed={saved.includes(current.id)} onClick={()=>setSaved(items=>items.includes(current.id)?items.filter(id=>id!==current.id):[...items,current.id])}>{saved.includes(current.id)?'◆ Saved':'◇ Save note'}</button></footer></article>:<div className="desk-notes-empty"><p>No notes in this corner of the universe.</p><button type="button" onClick={()=>setQuery('')}>Clear search</button></div>}
    </div><p className="desk-browser-note">A little demo browser. No external tabs, no live agents.</p>
  </section>;
}
