import {useEffect,useId,useState} from 'react';
import './DeskKeyboard.css';

function FlatKeyboard() {
  return <>
    <path d="M8 10h514v8h8v78h-8v8H8v-8H0V18h8z" fill="#16262b" />
    <rect x="8" y="16" width="514" height="76" fill="#768076" />
    {[0,1,2,3].map(row=><g key={row}>{Array.from({length:19},(_,col)=><g key={col}><rect x={16+col*26} y={22+row*16} width="22" height="13" fill={col===0||col>16?'#b6aa88':'#d0c7a8'} /><rect x={18+col*26} y={22+row*16} width="18" height="2" fill="#e3dbc0" /><rect x={20+col*26} y={26+row*16} width="4" height="3" fill="#7d8375" /></g>)}</g>)}
    <rect x="143" y="70" width="180" height="13" fill="#bfb699" /><rect x="18" y="22" width="22" height="13" fill="#be7e5b" />
  </>;
}

/** Original pixel interpretation: contoured wells, inward thumb keys, palm rests. */
function ErgoHalf() {
  return <>
    <path d="M12 10h176v8h24v12h16v98h-16v12H12v-8H0V18h12z" fill="#131d22" />
    <path d="M16 8h168v8h24v16h12v88h-12v12H16v-8H8V16h8z" fill="#66706b" />
    <path d="M16 14h168v8h20v12h8v80h-12v12H16z" fill="#3d4849" />
    <path d="M24 22h144v8h12v68h-12v12H24V98H16V34h8z" fill="#202c32" />
    <path d="M32 30h128v8h8v52h-8v12H32V90H24V38h8z" fill="#121e25" />
    {[0,1,2,3].map(row=><g key={row}>{Array.from({length:6},(_,col)=>{
      const curve=[0,5,9,9,5,0][col]; const x=28+col*24; const y=26+row*17+curve;
      return <g key={col}><rect x={x} y={y+2} width="20" height="14" fill="#172128" /><rect x={x} y={y} width="20" height="12" fill={col===0||row===3?'#89918a':'#b9bdb1'} /><rect x={x+2} y={y} width="16" height="2" fill="#d5d5c3" /><rect x={x+7} y={y+4} width="4" height="2" fill="#596760" /></g>;
    })}</g>)}
    <path d="M176 74h32v42h-32z" fill="#1c292d" />
    <rect x="177" y="76" width="13" height="11" fill="#9fa891" /><rect x="194" y="77" width="13" height="11" fill="#d0ad78" />
    <rect x="177" y="91" width="13" height="25" fill="#b9bba8" /><rect x="194" y="92" width="13" height="24" fill="#8b9a90" />
    <rect x="177" y="91" width="13" height="2" fill="#dedcc5" /><rect x="194" y="92" width="13" height="2" fill="#b5c2af" />
    <path d="M24 112h132v8h12v10H24z" fill="#293538" /><path d="M32 114h112v3H32z" fill="#55615d" />
    <rect x="176" y="26" width="6" height="3" fill="#d7b576" /><rect x="188" y="26" width="6" height="3" fill="#90af9c" />
  </>;
}

export function DeskKeyboard({evolved=false}:{evolved?:boolean}) {
  const id=useId().replace(/:/g,'');
  const [hasEvolved,setHasEvolved]=useState(evolved);
  useEffect(()=>{if(evolved) setHasEvolved(true);},[evolved]);
  return <g className="desk-keyboard" data-evolved={evolved} data-rejoining={!evolved && hasEvolved} transform="translate(445 805)">
    <defs><clipPath id={`${id}-left`}><rect x="0" y="0" width="265" height="145" /></clipPath><clipPath id={`${id}-right`}><rect x="265" y="0" width="265" height="145" /></clipPath></defs>
    <g className="desk-keyboard-flat-left"><g clipPath={`url(#${id}-left)`}><FlatKeyboard /></g></g>
    <g className="desk-keyboard-flat-right"><g clipPath={`url(#${id}-right)`}><FlatKeyboard /></g></g>
    <g className="desk-keyboard-split">
      <path d="M204 21h28v-9h60v9h32" stroke="#83918c" strokeWidth="3" fill="none" />
      <g transform="rotate(-4 114 72)"><ErgoHalf /></g>
      <g transform="translate(530 0) scale(-1 1)"><g transform="rotate(-4 114 72)"><ErgoHalf /></g></g>
      <text x="265" y="108" textAnchor="middle" fontSize="8" letterSpacing="2" fill="#b3a077">360</text>
    </g>
    <g className="desk-keyboard-evolution" fill="#f4dc9d">
      <path d="M262 5h6v20h-6zM250 34h30v6h-30zM262 48h6v25h-6z" />
      {[[-6,24],[535,42],[235,-4],[306,112],[94,140],[420,140]].map(([x,y],index)=><path key={index} d={`M${x} ${y}h4v-4h4v4h4v4h-4v4h-4v-4h-4z`} />)}
    </g>
  </g>;
}
