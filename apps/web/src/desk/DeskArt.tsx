import { useEffect, useId, useState } from 'react';
import './DeskArt.css';
import { DeskPropArt } from './DeskPropArt';
import { DeskUnderdesk } from './DeskUnderdesk';
import { DeskCableArt } from './DeskCableArt';

export interface DeskArtProps {
  mobile?: boolean;
  lit?: boolean;
  onLightning?: () => void;
  rocketLaunched?: boolean;
  plantBloom?: boolean;
  steam?: boolean;
  visitorVisible?: boolean;
  windowGift?: boolean;
  keyboardEvolved?: boolean;
  zacAwake?: boolean;
  backdrop?: { x: number; y: number; width: number; height: number };
}

const ink = '#182128';
const cream = '#e0d6b2';

/** Original pixel illustration. All coordinates share the parent's 1600 × 1100 world. */
export function DeskArt({ mobile = false, onLightning, lit = true, rocketLaunched = false, plantBloom = false, steam = false, visitorVisible = false, windowGift = false, keyboardEvolved = false, zacAwake = false, backdrop = { x: 0, y: 0, width: 1600, height: 1100 } }: DeskArtProps) {
  const id = useId().replace(/:/g, '');
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  // Even-odd holes leave the night sky and monitor status light emissive.
  const roomShade = `M${backdrop.x} ${backdrop.y}h${backdrop.width}v${backdrop.height}h${-backdrop.width}z M1308 96h224v366h-224z M1178 621h8v4h-8z`;
  const keyboardPort=keyboardEvolved?560:710;

  return (
    <svg className={`desk-art${lit ? ' desk-art--lit' : ''}${rocketLaunched ? ' desk-art--launched' : ''}${plantBloom ? ' desk-art--bloom' : ''}${steam ? ' desk-art--steam' : ''}`} data-hidden={hidden} viewBox="0 0 1600 1100" width="1600" height="1100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-lamp-warmth`}>
          <stop offset="0" stopColor="#bc934c" stopOpacity="1" />
          <stop offset=".5" stopColor="#bc934c" stopOpacity=".45" />
          <stop offset="1" stopColor="#bc934c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-lamp-pool`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8b76e" stopOpacity=".8" />
          <stop offset="1" stopColor="#d8b76e" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-window-glass`}><rect x="1308" y="96" width="224" height="366" /></clipPath>
        <pattern id={`${id}-wall`} width="80" height="64" patternUnits="userSpaceOnUse">
          <rect width="80" height="64" fill="#29353d" />
          <path d="M8 12h4v4H8z M52 44h8v4h-8z M28 60h4v4h-4z" fill="#334149" />
          <path d="M64 20h4v4h-4z" fill="#202c34" />
        </pattern>
        <pattern id={`${id}-wood`} width="320" height="104" patternUnits="userSpaceOnUse">
          <rect width="320" height="104" fill="#a47a50" />
          <path d="M0 4h320M0 100h320" stroke="#72523c" strokeWidth="4" />
          <path d="M12 24h92m12 0h68m40 0h84M0 72h40m24 0h112m20 0h100M40 44h36m96 8h88M12 88h92m144-52h52" stroke="#b58a59" strokeWidth="4" />
          <path d="M76 80h24v4H76zM248 60h36v4h-36zM144 20h16v4h-16z" fill="#906945" />
        </pattern>
        <pattern id={`${id}-mat`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#394442" /><rect width="4" height="4" fill="#45514a" />
        </pattern>
      </defs>

      {/* A quiet wall: deliberately hand-placed flecks, not photographic noise. */}
      <rect {...backdrop} fill={ink} />
      <rect x={backdrop.x} y={backdrop.y} width={backdrop.width} height={748 - backdrop.y} fill={`url(#${id}-wall)`} />
      <ellipse className="desk-art-wall-warmth" cx="200" cy="492" rx="420" ry="400" fill={`url(#${id}-lamp-warmth)`} />
      <rect x={backdrop.x} y="704" width={backdrop.width} height="12" fill="#1d2b31" />
      <rect x={backdrop.x} y="716" width={backdrop.width} height="12" fill="#47504a" />

      {/* Observatory window, stepped constellations, distant apartment lights. */}
      <path d="M1300 80h240v8h12v390h-12v12h-240v-12h-12V88h12z" fill="#1a242c" />
      <rect x="1308" y="96" width="224" height="366" fill="#131f2c" />
      <path d="M1316 104h208v156h-208z" fill="#1c2b39" />
      <g clipPath={`url(#${id}-window-glass)`}>
        <g className="desk-art-moon">
          <path d="M1464 132h28v8h8v28h-8v8h-28v-8h-8v-28h8z" fill="#d3ceb0" />
          <path d="M1480 132h12v8h8v28h-8v8h-12v-8h-8v-28h8z" fill="#1c2b39" />
        </g>
        {[ [1332, 128], [1388, 164], [1356, 224], [1500, 220], [1452, 288], [1336, 302], [1480, 340], [1396, 118] ].map(([x,y], i) => <path className="desk-art-star" style={{animationDuration:`${6+i%4}s`,animationDelay:`${-i*.7}s`}} key={i} d={`M${x} ${y}h4v-4h4v4h4v4h-4v4h-4v-4h-4z`} fill={i % 3 ? '#82979a' : cream} />)}
      </g>
      <path d="M1360 184h28v4h28v24h20" stroke="#667f88" strokeWidth="2" fill="none" />

      <path d="M1312 420h24v-52h40v24h32v-64h40v36h24v-16h36v64h20v50h-216z" fill="#24323a" />
      {[1344,1360,1416,1432,1484,1500].map((x,i) => <g className="desk-art-apartment-light" style={{animationDuration:`${14+i*3}s`,animationDelay:`${-i*2.3}s`}} key={x} fill={i % 2 ? '#8b7c55' : '#4d6161'}><rect x={x} y={i % 2 ? 408 : 380} width="8" height="12" /><rect x={x} y="436" width="8" height="8" /></g>)}
      <g clipPath={`url(#${id}-window-glass)`}>
        <g className="desk-art-storm">
          <rect x="1308" y="96" width="224" height="366" fill="#0c1722" opacity=".6" />
          {/* Distant, forked bolt stays outside, behind the rain and window frame. */}
          <g className="desk-art-lightning-bolt" fill="none" strokeLinejoin="bevel"
            onAnimationStart={event => { if (event.animationName === 'desk-storm-bolt' && !lit && !hidden) onLightning?.(); }}
            onAnimationIteration={event => { if (event.animationName === 'desk-storm-bolt' && !lit && !hidden) onLightning?.(); }}>
            <path d="M1384 92l-28 54 24-6-36 66 24-8-32 72 20-6-16 66" stroke="#829eaf" strokeWidth="8" opacity=".35" />
            <path d="M1384 92l-28 54 24-6-36 66 24-8-32 72 20-6-16 66M1360 178l-24 10 8 24-24 26" stroke="#c6d8df" strokeWidth="3" />
          </g>
          <g className="desk-art-rain" stroke="#738c99" strokeWidth="2" opacity=".45">
            {/* Each drop wraps above/below the clip, never while visible. Negative
                phases keep the window populated without a shared sheet seam. */}
            {Array.from({length: 40}, (_, i) => <path className="desk-art-rain-drop" key={i}
              style={{animationDuration:`${1200 + i % 7 * 170}ms`,animationDelay:`${-(i * 397 % 2310)}ms`,opacity:.45 + i % 4 * .14}}
              d={`M${1328 + i * 37 % 220} 60l-2 ${12 + i % 5 * 3}`} />)}
          </g>
        </g>
        {windowGift && <path className="desk-art-window-gift" d="m1370 344 8-20 8 20 22 2-16 14 5 22-19-12-19 12 5-22-16-14z" fill="none" stroke="#e0c591" strokeWidth="4" opacity=".85" />}
        <g className="desk-art-visitor" data-visible={visitorVisible}>
          <g className="desk-art-visitor-friendly"><DeskPropArt object="window" /></g>
          <g className="desk-art-visitor-silhouette"><DeskPropArt object="window" lit={false} /></g>
        </g>
      </g>
      <path d="M1300 264h240v12h-240zM1412 96h12v366h-12z" fill="#46514e" />
      <path d="M1280 474h280v12h-280zM1296 486h248v12h-248z" fill="#697065" />
      <path d="M1312 100v356M1428 100v356" stroke="#59635a" strokeWidth="4" />
      <path d="M1268 80h20v406h-20zM1552 80h24v406h-24z" fill="#444951" />
      <path d="M1276 84v388M1560 84v392" stroke="#5a5960" strokeWidth="4" />

      {/* An original Mars survey print, with a tiny orbital diagram. */}
      <DeskPropArt object="poster" />

      {/* Pinned physics page: handwritten ideas, not a UI panel. */}
      <DeskPropArt object="physics" />

      <rect className="desk-art-mobile-floor" x={backdrop.x} y="1908" width={backdrop.width} height={Math.max(0,backdrop.y+backdrop.height-1908)} fill="#19252a" />
      <DeskUnderdesk />
      {/* Desktop and edge. The live device's exact region stays undecorated. */}
      <path className="desk-art-desktop" d="M28 724h1544v12h16v320h-16v16H28v-16H12V736h16z" fill="#513e32" />
      <rect x="28" y="736" width="1544" height="320" fill={`url(#${id}-wood)`} />
      <path d="M28 736h1544v8H28z" fill="#c7a372" />
      <path d="M28 1056h1544v16H28z" fill="#624631" />
      <path d="M44 1072h1512v16H44z" fill="#352c29" />
      <path d="M84 1088h64v12H84zM1444 1088h64v12h-64z" fill="#172229" />
      <path d="M636 752h302v16H636z" fill="#76553c" />

      {/* USB hub connections tuck behind the monitor; loose stepped bends stay on the desk. */}
      <path d="M404 792h656v8h12v158h-12v8H404v-8h-12V800h12z" fill="#6c634b" />
      <rect x="400" y="800" width="664" height="158" fill={`url(#${id}-mat)`} />
      <path d="M416 810h624M416 946h624" stroke="#77806b" strokeWidth="2" strokeDasharray="4 8" />
      <DeskCableArt mobile={mobile} keyboardPort={keyboardPort} />

      {/* Heavy physical monitor; aperture is EXACTLY 362,125 → 1208,607. */}
      <path d="M720 644h144v76H720z" fill="#18232b" />
      <path d="M736 650h108v60H736z" fill="#4d5958" />
      <path d="M752 654h76v52h-76z" fill="#69726a" />
      <path d="M688 713h208v8h16v39H672v-39h16z" fill="#263238" />
      <path d="M692 717h196v8h16v19H680v-19h12z" fill="#57615a" />
      <path d="M680 744h224v8H680z" fill="#748074" />
      <path d="M348 95h874v8h16v16h8v506h-8v16h-16v9H348v-9h-16v-16h-8V119h8v-16h16z" fill="#152027" />
      <path d="M348 103h874v8h12v514h-12v16H348v-16h-12V111h12z" fill="#586460" />
      <path d="M348 111h874v8H348zM340 119h8v502h-8z" fill="#859083" />
      <path d="M350 117h870v498H350z" fill="#202c31" />
      <rect x="362" y="125" width="846" height="482" fill="#111b22" />
      <path d="M350 615h870v18H350z" fill="#48534f" />
      <text x="766" y="630" fontSize="9" letterSpacing="3" fill="#a6b2a0">CORRAL</text>
      <rect x="1178" y="621" width="8" height="4" fill="#a9bd80" />
      <path d="M364 621h24m8 0h24m8 0h24" stroke="#2b383a" strokeWidth="3" />

      {/* Lamp: angular shade, articulated arm, warm stepped pool. */}
      <path className="desk-art-lamp-halo" d="M160 492h80v40h32v64h24v64h24v64H80v-64h24v-64h24v-64h32z" fill={`url(#${id}-lamp-pool)`} />
      <DeskPropArt object="lamp" />

      {/* Books lean into the room's character without borrowed covers. */}
      <DeskPropArt object="books" />

      {/* Woven desk mat, mechanical keyboard and wired mouse. */}
      <DeskPropArt object="keyboard" keyboardEvolved={keyboardEvolved} />
      <rect x={keyboardPort-6} y="809" width="12" height="8" fill="#222e30" /><rect x={keyboardPort-3} y="811" width="6" height="3" fill="#748078" />
      <path d="M1004 854h24v8h8v40h-8v8h-24v-8h-8v-40h8z" fill="#b7b499" />
      <path d="M1016 856v22M1000 878h32" stroke="#6f786b" strokeWidth="3" />
      <rect x="1012" y="862" width="8" height="10" fill="#46574e" />

      {/* Yerba mate with steel bombilla; its steam is a separate effect. */}
      <DeskPropArt object="coffee" />

      {/* A duck-shaped rubber confidant, not a mascot. */}
      <DeskPropArt object="duck" />

      {/* A home-made rocket sits to the RIGHT of the live device. */}
      <DeskPropArt object="rocket" />

      {/* Leaf by leaf, a scrappy plant in a repaired terracotta pot. */}
      <DeskPropArt object="plant" />

      {/* Late-night ephemera, each placed inside its agreed hit region. */}
      <DeskPropArt object="floppy" />
      <DeskPropArt object="cassette" />
      <DeskPropArt object="controller" />
      <DeskPropArt object="zac" zacAwake={zacAwake} />
      {/* Pencil, folded list and a couple of honest coffee rings. */}
      <path d="M282 854h48v4h8v4h-64z" fill="#d2ac62" /><path d="M274 854h8v8h-8z" fill="#26363a" />
      <path d="M280 892h56v72h-56z" fill="#c9bc96" />
      <path d="M286 904h32m-32 12h40m-40 12h24m-24 12h36" stroke="#8a8f75" strokeWidth="3" />
      <path d="M306 980h28v4h8v20h-8v4h-28v-4h-8v-20h8zM1188 1032h32v4h8v20h-8v4h-32v-4h-8v-20h8z" fill="none" stroke="#815d40" strokeWidth="3" opacity=".65" />
      <path d="M552 980h116v4H552zM584 988h52v4h-52z" fill="#b9915e" />
      {/* Room-only ambience: live monitor, device and all controls are separate siblings. */}
      <path className="desk-art-room-darkness" d={roomShade} fill="#081322" fillRule="evenodd" />
      <rect className="desk-art-lightning" {...backdrop} fill="#b1c9dc" />
    </svg>
  );
}
