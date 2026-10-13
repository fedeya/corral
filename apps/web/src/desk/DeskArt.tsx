import { useEffect, useId, useState } from 'react';
import { DeskKeyboard } from './DeskKeyboard';
import './DeskArt.css';

export interface DeskArtProps {
  lit?: boolean;
  onLightning?: () => void;
  rocketLaunched?: boolean;
  plantBloom?: boolean;
  steam?: boolean;
  visitorVisible?: boolean;
  windowGift?: boolean;
  keyboardEvolved?: boolean;
  backdrop?: { x: number; y: number; width: number; height: number };
}

const ink = '#182128';
const cream = '#e0d6b2';
const olive = '#77926b';

/** Original pixel illustration. All coordinates share the parent's 1600 × 1100 world. */
export function DeskArt({ onLightning, lit = true, rocketLaunched = false, plantBloom = false, steam = false, visitorVisible = false, windowGift = false, keyboardEvolved = false, backdrop = { x: 0, y: 0, width: 1600, height: 1100 } }: DeskArtProps) {
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
  const cables=[
    {id:'keyboard',d:`M1030 620v64l-8 8h-60l-8 8v64l-8 8H${keyboardPort+8}l-8 8v33`},
    {id:'mouse',d:'M1050 620v76l-8 8h-48l-8 8v64l8 8h14l8 8v62'},
    {id:'device',d:'M1070 620v86l8 8h62l8 8v22l8 8h206l8 8v24'},
  ];
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
          <g className="desk-art-visitor-friendly">
          <path d="M1440 460v-48h16v-20h48v20h16v48z" fill="#3e525d" />
          <path d="M1452 356h12v-16h8v16h20v-16h8v16h12v40h-12v12h-48v-12h-8v-32h8z" fill="#8caa9f" />
          <path d="M1452 368h52v28h-52z" fill="#b9c2a9" />
          <rect x="1460" y="374" width="12" height="10" fill="#26353a" /><rect x="1484" y="374" width="12" height="10" fill="#26353a" />
          <rect x="1464" y="376" width="4" height="4" fill={cream} /><rect x="1488" y="376" width="4" height="4" fill={cream} />
          <path d="M1474 391h8v4h-8zM1458 448h16v10h-16zM1490 448h16v10h-16z" fill="#d7c8a3" />
          <path d="M1512 416h8v-12h8v-20h8v40h-8v8h-16z" fill="#8caa9f" />
          </g>
          <path className="desk-art-visitor-silhouette" d="M1440 460v-48h16v-20h-4v-32h12v-16h8v16h20v-16h8v16h12v32h-8v20h16v48z" fill="#070e15" />
        </g>
      </g>
      <path d="M1300 264h240v12h-240zM1412 96h12v366h-12z" fill="#46514e" />
      <path d="M1280 474h280v12h-280zM1296 486h248v12h-248z" fill="#697065" />
      <path d="M1312 100v356M1428 100v356" stroke="#59635a" strokeWidth="4" />
      <path d="M1268 80h20v406h-20zM1552 80h24v406h-24z" fill="#444951" />
      <path d="M1276 84v388M1560 84v392" stroke="#5a5960" strokeWidth="4" />

      {/* An original Mars survey print, with a tiny orbital diagram. */}
      <path d="M84 74h188v224H84z" fill="#19232a" />
      <rect x="92" y="82" width="172" height="208" fill="#b5a583" />
      <rect x="100" y="90" width="156" height="192" fill="#26333b" />
      <text x="112" y="112" fill={cream} fontSize="11" letterSpacing="1">PER ASPERA</text>
      <text x="112" y="128" fill={cream} fontSize="11" letterSpacing="1">AD ASTRA</text>
      <path d="M148 160h48v8h16v16h8v40h-8v16h-16v8h-48v-8h-16v-16h-8v-40h8v-16h16z" fill="#b16f53" />
      <path d="M148 168h28v8h-16v12h-20v12h-8v-16h8v-8h8zM184 204h24v12h-12v16h-12zM148 224h16v8h-16z" fill="#865342" />
      <path d="M112 218v-20h12v-16h20v-12h48v4h32v16h16v24h-12v16h-24v12h-48v-4h-24v-12h-20z" fill="none" stroke="#d2b782" strokeWidth="2" />
      <rect x="232" y="204" width="8" height="8" fill={cream} />
      <text x="112" y="269" fill="#a6b0a1" fontSize="9" letterSpacing="2">MARS / FIELD 04</text>
      <path d="M106 72h36v12h-36zM220 282h32v12h-32z" fill="#cbb784" opacity=".6" />

      {/* Pinned physics page: handwritten ideas, not a UI panel. */}
      <path d="M98 348h178v180H98z" fill="#18272d" />
      <path d="M94 340h180v176h-20v8H94z" fill="#cdc6a5" />
      <path d="M254 504h20l-20 20z" fill="#9d9b82" />
      <rect x="172" y="336" width="12" height="8" fill="#bd805d" />
      <text x="112" y="370" fontSize="12" fill="#46534e">a small universe</text>
      <text x="112" y="398" fontSize="16" fill="#35433f">F = ma</text>
      <text x="112" y="420" fontSize="12" fill="#58635a">E = hf</text>
      <path d="M116 480h128M128 490v-52M128 474h20v-8h16v-12h16v-12h20v-8h28" fill="none" stroke="#748271" strokeWidth="3" />
      <text x="198" y="497" fontSize="9" fill="#6b7364">time →</text>
      <path d="M214 388h32M214 398h24M214 410h28" stroke="#aaa88b" strokeWidth="3" />

      {/* Desktop and edge. The live device's exact region stays undecorated. */}
      <path d="M28 724h1544v12h16v320h-16v16H28v-16H12V736h16z" fill="#513e32" />
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
      <g className="desk-art-cables" fill="none" strokeLinejoin="round">
        {cables.map(cable=><g key={cable.id}><path d={cable.d} stroke="#121e23" strokeWidth="4" /><path data-cable={cable.id} d={cable.d} stroke="#364247" strokeWidth="2" /></g>)}
      </g>

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
      <path d="M156 740h96v8h20v12H136v-12h20z" fill={ink} />
      <path d="M156 736h88v8h20v8H144v-8h12z" fill="#778074" />
      <path d="M200 730V614h-8v-12h-28v-12h-12v-92h16v84h28v12h20v136z" fill="#19272b" />
      <path d="M204 726V612h-12v-16h-32v-92" stroke="#8b917c" strokeWidth="8" fill="none" />
      <path d="M148 584h20v20h-20zM188 594h24v24h-24z" fill="#bbb28c" />
      <path d="M184 424h44v12h16v24h12v32H144v-32h12v-24h28z" fill="#18282c" />
      <path d="M184 432h40v12h16v24h8v16H152v-16h12v-24h20z" fill="#859275" />
      <path d="M176 444h12v28h-20v8h-12v-12h8v-16h12z" fill="#aeb598" />
      <path className="desk-art-bulb" d="M160 484h80v8h-80z" fill="#f0d699" />
      <rect x="220" y="734" width="12" height="8" fill="#46534c" />
      <rect x="68" y="692" width="24" height="32" fill="#53605b" /><rect x="76" y="708" width="8" height="10" fill="#17242a" />
      <path d="M144 750h-36l-8-8H88l-8-8v-20" stroke="#252e2f" strokeWidth="5" fill="none" />

      {/* Books lean into the room's character without borrowed covers. */}
      <g>
        <path d="M1256 712h264v20h-264z" fill="#223032" />
        <path d="M1264 714h248v16h-248z" fill="#c2b794" />
        <path d="M1260 704h260v10h-260z" fill="#77816a" />
        <text x="1290" y="722" dominantBaseline="middle" fontSize="9" fill="#414e46">BORGES · LABYRINTHS</text>
        <path d="M1280 680h224v24h-224z" fill="#ac7554" />
        <path d="M1288 684h204v12h-204z" fill="#dac7a2" />
        <text x="1320" y="694" fontSize="11" fill="#634e3d">UNIX / FIELD NOTES</text>
        <path d="M1268 652h240v28h-240z" fill="#536b65" />
        <path d="M1280 656h216v16h-216z" fill="#7e9380" />
        <text x="1310" y="668" fontSize="11" fill={cream}>FEYNMAN · VOL. I</text>
        <path d="M1472 652v44h12v-44z" fill="#c7ab72" />
        <path d="M1328 644h116v8h-116z" fill="#26363a" />
        <rect x="1340" y="641" width="84" height="5" fill="#c6bd9e" />
        <g transform="rotate(-3 1370 632)">
          <path d="M1280 618h180v28h-180z" fill="#d8c799" />
          <text x="1290" y="630" fontSize="7" fill="#62543e">STILL FIGURING IT OUT.</text>
          <text className="desk-art-book-signature" x="1410" y="640" fontSize="8" fontStyle="italic" fill="#62543e">— Fefe</text>
        </g>
      </g>

      {/* Woven desk mat, mechanical keyboard and wired mouse. */}
      <DeskKeyboard evolved={keyboardEvolved} />
      <rect x={keyboardPort-6} y="809" width="12" height="8" fill="#222e30" /><rect x={keyboardPort-3} y="811" width="6" height="3" fill="#748078" />
      <path d="M1004 854h24v8h8v40h-8v8h-24v-8h-8v-40h8z" fill="#b7b499" />
      <path d="M1016 856v22M1000 878h32" stroke="#6f786b" strokeWidth="3" />
      <rect x="1012" y="862" width="8" height="10" fill="#46574e" />

      {/* Yerba mate with steel bombilla; its steam is a separate effect. */}
      <path d="M368 978h76v16h-76z" fill="#805c40" />
      <path d="M376 924h60v8h8v44h-8v16h-60v-16h-8v-44h8z" fill="#352e29" />
      <path d="M380 932h52v8h8v28h-8v16h-52v-16h-8v-28h8z" fill="#936343" />
      <path d="M380 940h8v28h8v12h-16v-12h-4v-24h4z" fill="#bb8c56" />
      <path d="M376 924h60v8h8v8h-76v-8h8z" fill="#bcb994" />
      <path d="M380 928h52v8h-52z" fill="#536348" />
      <path d="M384 930h8m8 4h8m8-4h8" stroke="#8b9962" strokeWidth="3" />
      <path d="M414 930v-24h8v-24h8v-12" stroke="#26373b" strokeWidth="8" fill="none" />
      <path d="M414 926v-20h8v-24h8v-12" stroke="#c9cbb0" strokeWidth="4" fill="none" />
      <g className="desk-art-steam" fill="none" stroke="#e0d6b2" strokeWidth="4">
        <path d="M388 912v-12h-8v-12h8v-12" /><path d="M404 900v-12h-8v-16h8v-12" /><path d="M442 918v-12h8v-12h-8v-12" />
      </g>

      {/* A duck-shaped rubber confidant, not a mascot. */}
      <path d="M998 936h76v12h-76z" fill="#87613e" />
      <path d="M1028 884h24v8h8v16h16v8h-16v12h8v12h-8v8h-48v-8h-12v-24h12v8h12v-12h-4v-20h8z" fill="#d6b35f" />
      <path d="M1012 924h24v8h12v8h-32v-8h-4z" fill="#b99046" />
      <path d="M1056 908h20v8h-20z" fill="#c87e4e" />
      <rect x="1044" y="896" width="5" height="5" fill={ink} /><rect x="1044" y="896" width="2" height="2" fill={cream} />

      {/* A home-made rocket sits to the RIGHT of the live device. */}
      <path d="M1438 982h88v8h-88z" fill="#7c583b" />
      <g className="desk-art-rocket">
        <path d="M1472 852h12v12h8v16h8v68h12v28h-20v-12h-28v12h-20v-28h12v-68h8v-16h8z" fill="#24323a" />
        <path d="M1472 860h12v16h8v68h-28v-68h8z" fill="#d5cfaf" />
        <path d="M1472 860h12v16h8v8h-28v-8h8z" fill="#b57551" />
        <path d="M1464 936h28v12h-28zM1456 940h8v28h-12v-20h4zM1492 940h8v8h4v20h-12z" fill="#ab6b4b" />
        <path d="M1472 896h12v4h4v12h-4v4h-12v-4h-4v-12h4z" fill="#546e74" />
        <rect x="1472" y="900" width="8" height="8" fill="#9eb7ae" />
        <path d="M1472 952h12v12h-12z" fill="#526059" />
        <path className="desk-art-rocket-flame" d="M1468 964h20v12h-4v16h-4v12h-4v-12h-4v-16h-4z" fill="#e3b25e" />
      </g>

      {/* Leaf by leaf, a scrappy plant in a repaired terracotta pot. */}
      <path d="M96 966h128v12H96z" fill="#765a3b" />
      <path d="M152 926v-88h-8v-28M156 870h20v-24M148 894h-24v-24M156 900h40v-32" stroke="#465b45" strokeWidth="8" fill="none" />
      <path d="M140 838h-24v-8h-12v-16h-8v-12h24v8h12v16h8zM156 856h12v-24h12v-12h24v12h-12v16h-16v8zM124 882h-20v-8H88v-24h16v8h12v12h8zM180 900v-20h12v-12h28v16h-12v8h-16v8zM140 896h-20v-8h-12v-12h20v8h12z" fill={olive} />
      <path d="M104 810h12v12h12v8M180 836h12M96 858h8v12M200 876h12" stroke="#a1af78" strokeWidth="4" fill="none" />
      <path d="M116 916h88v16h-8v32h-8v8h-56v-8h-8v-32h-8z" fill="#9e6448" />
      <path d="M120 916h80v12h-80z" fill="#c08659" />
      <path d="M132 932h12v28h-12zM144 960h36v4h-36z" fill="#b67e51" />
      <path d="M180 932v12h-8v12h8v8" stroke="#d5b77e" strokeWidth="3" fill="none" />
      <g className="desk-art-flower">
        <path d="M144 816v-28" stroke="#8b9a63" strokeWidth="4" />
        <path d="M136 772h16v8h8v16h-8v8h-16v-8h-8v-16h8z" fill="#d3a07e" />
        <rect x="140" y="784" width="8" height="8" fill="#e3c97e" />
      </g>

      {/* Late-night ephemera, each placed inside its agreed hit region. */}
      <g>
        <path d="M978 992h68v8h8v56h-76z" fill="#263a3d" />
        <rect x="986" y="994" width="48" height="24" fill="#9caa9a" />
        <rect x="1018" y="998" width="10" height="16" fill="#354b4d" />
        <rect x="986" y="1024" width="60" height="28" fill="#d0c5a2" />
        <text x="990" y="1035" fontSize="8" fill="#536357">SOURCE</text>
        <path d="M992 1042h44M992 1047h28" stroke="#a39d7d" strokeWidth="2" />
        <rect x="980" y="1048" width="4" height="4" fill="#101e26" />
      </g>
      <g>
        <path d="M1064 1006h92v6h8v48h-8v6h-92v-6h-8v-48h8z" fill="#243135" />
        <rect x="1064" y="1014" width="92" height="34" fill="#ae9a78" />
        <text x="1070" y="1023" fontSize="8" fill="#35463f">NIGHT SHIFT / A</text>
        <rect x="1076" y="1028" width="68" height="16" fill="#4b5953" />
        <path d="M1080 1032h12v8h-12zM1128 1032h12v8h-12z" fill="#d1c7a5" />
        <path d="M1096 1036h28" stroke="#b2a780" strokeWidth="4" />
        <path d="M1084 1058v-8h48v8z" fill="#798575" />
        <rect x="1064" y="1056" width="4" height="4" fill="#b3b197" /><rect x="1152" y="1056" width="4" height="4" fill="#b3b197" />
      </g>
      <g>
        <path d="M140 1004h140v8h12v12h8v24h-8v12h-28v-8h-108v8h-28v-12h-8v-24h8v-12h12z" fill="#263236" />
        <path className="desk-controller-face" d="M140 1010h132v8h16v28h-24v-8h-104v8h-28v-28h8z" fill="#a6aa91" />
        <path className="desk-controller-pad" d="M148 1016h10v7h7v10h-7v7h-10v-7h-7v-10h7z" fill="#354440" />
        <path d="M150 1018h6v9h7M143 1027h13v10" stroke="#59665a" strokeWidth="2" fill="none" />
        <rect x="244" y="1018" width="12" height="12" fill="#b37859" /><rect x="262" y="1032" width="12" height="12" fill="#677b65" />
        <path d="M192 1034h12v4h-12zM212 1034h12v4h-12z" fill="#4f5f54" />
        <path d="M206 1008v-12h76v-12h36v18h24" stroke="#39413b" strokeWidth="4" fill="none" />
      </g>
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
