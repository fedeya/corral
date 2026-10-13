import { DeskKeyboard } from './DeskKeyboard';
import { DeskZacEyes } from './DeskZacEyes';
import { ZAC_HEAD, type DESK_OBJECTS } from './desk-contract';
export type DeskObjectId = (typeof DESK_OBJECTS)[number]['id'];
const ink='#182128',cream='#e0d6b2',olive='#77926b';
/** Shared original prop fragments: no neighbouring room paint. */
export function DeskPropArt({object,lit=true,keyboardEvolved=false,zacAwake=false}:{object:DeskObjectId;lit?:boolean;keyboardEvolved?:boolean;zacAwake?:boolean}) {
  switch(object) {
    case 'zac': return <g data-prop-art="zac" data-awake={zacAwake} transform={`translate(${ZAC_HEAD.x} ${ZAC_HEAD.y})`}>
      {/* Original little workbench head, drawn on the room's stepped pixel grid. */}
      <path d="M8 88h82v6H8z" fill="#352c29" />
      <path d="M36 76h28v14H36z" fill={ink} />
      <path d="M40 78h20v10H40z" fill="#859083" />
      <path d="M20 8h56v8h12v16h8v28h-8v16H76v8H20v-8h-8V60H4V32h8V16h8z" fill={ink} />
      <path d="M20 16h56v8h4v44h-4v8H20v-8h-4V24h4z" fill="#b5a583" />
      <path d="M20 16h56v8H24v12h-8V24h4z" fill={cream} />
      <path d="M72 24h8v44h-4v8H24v-8h48z" fill="#8b957c" />
      <path d="M8 36h8v20H8zM80 36h12v20H80z" fill="#697065" />
      <path d="M28 32h36v4h8v24h-8v4H28v-4h-8V36h8z" fill="#26333b" />
      <DeskZacEyes awake={zacAwake}/>
      <path d="M40 56h12v4H40z" fill="#859083" />
      <path d="M28 88h44v6H28z" fill={ink} />
      <path d="M32 88h36v2H32z" fill="#8b957c" />
    </g>;
    case 'poster': return <g data-prop-art="poster">
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
    </g>;
    case 'physics': return <g data-prop-art="physics">
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
    </g>;
    case 'lamp': return <g data-prop-art="lamp">
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
    </g>;
    case 'books': return <g data-prop-art="books">
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
    </g>;
    case 'coffee': return <g data-prop-art="coffee">
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
    </g>;
    case 'duck': return <g data-prop-art="duck">
      <path d="M998 936h76v12h-76z" fill="#87613e" />
      <path d="M1028 884h24v8h8v16h16v8h-16v12h8v12h-8v8h-48v-8h-12v-24h12v8h12v-12h-4v-20h8z" fill="#d6b35f" />
      <path d="M1012 924h24v8h12v8h-32v-8h-4z" fill="#b99046" />
      <path d="M1056 908h20v8h-20z" fill="#c87e4e" />
      <rect x="1044" y="896" width="5" height="5" fill={ink} /><rect x="1044" y="896" width="2" height="2" fill={cream} />
    </g>;
    case 'rocket': return <g data-prop-art="rocket">
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
    </g>;
    case 'plant': return <g data-prop-art="plant">
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
    </g>;
    case 'floppy': return <g data-prop-art="floppy">
      <g>
        <path d="M978 992h68v8h8v56h-76z" fill="#263a3d" />
        <rect x="986" y="994" width="48" height="24" fill="#9caa9a" />
        <rect x="1018" y="998" width="10" height="16" fill="#354b4d" />
        <rect x="986" y="1024" width="60" height="28" fill="#d0c5a2" />
        <text x="990" y="1035" fontSize="8" fill="#536357">SOURCE</text>
        <path d="M992 1042h44M992 1047h28" stroke="#a39d7d" strokeWidth="2" />
        <rect x="980" y="1048" width="4" height="4" fill="#101e26" />
      </g>
    </g>;
    case 'cassette': return <g data-prop-art="cassette">
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
    </g>;
    case 'controller': return <g data-prop-art="controller">
      {/* Original fighting-game arcade stick; stays inside the agreed hit region. */}
      <path d="M128 1016h156v8h16v32h-8v8H128v-8h-8v-32h8z" fill="#17262c" />
      <path d="M132 1020h152l12 8v16H124v-16z" fill="#52615b" />
      <path d="M132 1020h152v4H132z" fill="#8b957c" />
      <path d="M288 1024h12v32h-12z" fill="#112128" />
      <rect data-arcade-front="true" x="124" y="1044" width="164" height="20" fill="#293b3d" />
      <path d="M124 1044h164v4H124z" fill="#6b7b6d" />
      <path d="M136 1052h96v4h-96z" fill="#a26b50" />
      <path d="M136 1060h140v4H136z" fill="#122329" />
      <g data-arcade-lever="true">
        <path d="M148 1036h28v8h-28z" fill="#17252a" />
        <path d="M158 1016h8v22h-8z" fill="#bbc2aa" />
        <path d="M162 1020h4v18h-4z" fill="#6b8078" />
        <path d="M156 1000h12v4h4v12h-4v4h-12v-4h-4v-12h4z" fill="#b57958" />
        <path d="M156 1004h8v4h-8z" fill="#d5a275" />
      </g>
      {[0,1,2,3,4,5,6,7].map(index=>{
        const x=214+index%4*18,y=1020+Math.floor(index/4)*12;
        const colors=['#b97e60','#cfb884','#8ea482','#b8bcaa'];
        return <g data-arcade-button={index+1} key={index}>
          <path d={`M${x+2} ${y}h8v2h2v8h-2v2h-8v-2h-2v-8h2z`} fill="#142329" />
          <rect x={x+2} y={y+2} width="8" height="8" fill={colors[index%4]} />
          <rect x={x+3} y={y+2} width="6" height="2" fill="#e0d6b2" opacity=".6" />
        </g>;
      })}
      <path d="M186 1032h8v4h-8zM186 1042h8v4h-8z" fill="#939e85" />
    </g>;
    case 'keyboard': return <g data-prop-art="keyboard"><DeskKeyboard evolved={keyboardEvolved} /></g>;
    case 'window': return <g data-prop-art="window">{lit ? <>
          <path d="M1440 460v-48h16v-20h48v20h16v48z" fill="#3e525d" />
          <path d="M1452 356h12v-16h8v16h20v-16h8v16h12v40h-12v12h-48v-12h-8v-32h8z" fill="#8caa9f" />
          <path d="M1452 368h52v28h-52z" fill="#b9c2a9" />
          <rect x="1460" y="374" width="12" height="10" fill="#26353a" /><rect x="1484" y="374" width="12" height="10" fill="#26353a" />
          <rect x="1464" y="376" width="4" height="4" fill={cream} /><rect x="1488" y="376" width="4" height="4" fill={cream} />
          <path d="M1474 391h8v4h-8zM1458 448h16v10h-16zM1490 448h16v10h-16z" fill="#d7c8a3" />
          <path d="M1512 416h8v-12h8v-20h8v40h-8v8h-16z" fill="#8caa9f" />
</> : <>          <path  d="M1440 460v-48h16v-20h-4v-32h12v-16h8v16h20v-16h8v16h12v32h-8v20h16v48z" fill="#070e15" /></>}</g>;
  }
}
