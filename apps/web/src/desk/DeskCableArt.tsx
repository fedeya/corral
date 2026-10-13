import { useId } from 'react';

export const DESK_TOWER_PORTS = {
  keyboard:{x:1120,y:1536},mouse:{x:1120,y:1552},device:{x:1340,y:1540},video:{x:1120,y:1596},
} as const;

/** One cable layer behind the props; mobile rear descents are occluded by the desk. */
export function DeskCableArt({mobile,keyboardPort}:{mobile:boolean;keyboardPort:number}) {
  const clipId=useId().replace(/:/g,'');
  const {keyboard,mouse,device,video}=DESK_TOWER_PORTS;
  const cables=mobile ? [
    {id:'keyboard',port:{x:keyboardPort,y:813},d:`M${keyboard.x} ${keyboard.y}H1000L992 1528V708L984 700H${keyboardPort+8}l-8 8V813`},
    {id:'mouse',port:{x:1016,y:854},d:`M${mouse.x} ${mouse.y}H1040L1032 1544V700L1024 692L1016 700V854`},
    {id:'device',port:{x:1376,y:784},d:`M${device.x} ${device.y}H1384L1392 1532V708L1384 700L1376 708V784`},
    {id:'video',port:null,d:`M1030 620V684L1022 692H1012L1004 700V1180L1012 1188V1588L1020 1596H${video.x}`},
  ] : [
    {id:'keyboard',port:null,d:`M1030 620v64l-8 8h-60l-8 8v64l-8 8H${keyboardPort+8}l-8 8v33`},
    {id:'mouse',port:null,d:'M1050 620v76l-8 8h-48l-8 8v64l8 8h14l8 8v62'},
    {id:'device',port:null,d:'M1070 620v86l8 8h62l8 8v22l8 8h206l8 8v24'},
  ];
  return <g className="desk-art-cables" fill="none" strokeLinejoin="round">
    {mobile && <defs>{cables.map(cable=><clipPath key={cable.id} id={`${clipId}-${cable.id}`} clipPathUnits="userSpaceOnUse">
      {/* Only the upward lead sits on the tabletop. The rear run reappears below
          its front apron, without painting a second copy of any cable. */}
      <rect x="0" y="0" width="1600" height="724"/>
      {cable.port && <rect x={cable.port.x-4} y="724" width="8" height={cable.port.y-724+2}/>}
      <rect x="0" y="1100" width="1600" height="808"/>
    </clipPath>)}</defs>}
    {cables.map(cable=><g key={cable.id} clipPath={mobile?`url(#${clipId}-${cable.id})`:undefined}><path d={cable.d} stroke="#121e23" strokeWidth="4"/><path data-cable={cable.id} d={cable.d} stroke="#364247" strokeWidth="2"/></g>)}
  </g>;
}
