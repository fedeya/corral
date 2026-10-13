export const DESK_TOWER_PORTS = {
  keyboard:{x:1120,y:1536},mouse:{x:1120,y:1552},device:{x:1340,y:1540},video:{x:1120,y:1596},
} as const;

/** A single rendered cable layer, behind the original props and live apparatus. */
export function DeskCableArt({mobile,keyboardPort}:{mobile:boolean;keyboardPort:number}) {
  const {keyboard,mouse,device,video}=DESK_TOWER_PORTS;
  const cables=mobile ? [
    {id:'keyboard',d:`M${keyboard.x} ${keyboard.y}H1000L992 1528V1108L984 1100V796L976 788H${keyboardPort+8}l-8 8V813`},
    {id:'mouse',d:`M${mouse.x} ${mouse.y}H1040L1032 1544V1188L1024 1180V792L1016 784V854`},
    {id:'device',d:`M${device.x} ${device.y}H1384L1392 1532V1124L1400 1116H1536L1544 1108V768L1536 760H1384L1376 768V784`},
    {id:'video',d:`M1030 620V684L1022 692H1012L1004 700V1180L1012 1188V1588L1020 1596H${video.x}`},
  ] : [
    {id:'keyboard',d:`M1030 620v64l-8 8h-60l-8 8v64l-8 8H${keyboardPort+8}l-8 8v33`},
    {id:'mouse',d:'M1050 620v76l-8 8h-48l-8 8v64l8 8h14l8 8v62'},
    {id:'device',d:'M1070 620v86l8 8h62l8 8v22l8 8h206l8 8v24'},
  ];
  return <g className="desk-art-cables" fill="none" strokeLinejoin="round">
    {cables.map(cable=><g key={cable.id}><path d={cable.d} stroke="#121e23" strokeWidth="4"/><path data-cable={cable.id} d={cable.d} stroke="#364247" strokeWidth="2"/></g>)}
  </g>;
}
