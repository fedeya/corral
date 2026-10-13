import { DESK_TOWER_PORTS } from './DeskCableArt';
/** Mobile-only continuation in the original 1600px room coordinate world. */
export function DeskUnderdesk() {
  return <g className="desk-art-underdesk" aria-hidden="true">
    <rect x="28" y="1100" width="1544" height="808" fill="#222d32"/>
    <path d="M76 1096h80v768H76zM1432 1096h80v768h-80z" fill="#182329"/>
    <path d="M100 1100h44v752h-44zM1444 1100h44v752h-44z" fill="#46524f"/>
    <path d="M108 1112h12v724h-12zM1452 1112h12v724h-12z" fill="#57615a"/>
    <path d="M88 1848h72v20H88zM1432 1848h72v20h-72z" fill="#111c22"/>
    <path d="M148 1260h1284v16H148z" fill="#172329"/>
    <path d="M164 1260h1252v4H164z" fill="#3b4949"/>

    <g data-underdesk="pc">
      <path d="M1144 1492h216v348h-216z" fill="#111e24"/>
      <path d="M1120 1480h220v356h-220z" fill="#5b665b"/>
      <rect x="1132" y="1492" width="196" height="332" fill="#1b292c"/>
      <path d="M1144 1504h172v24h-172z" fill="#101d22"/>
      <path d="M1152 1512h144v4h-144z" fill="#48564f"/>
      <path d="M1156 1556h72v8h-72zM1156 1576h72v8h-72z" fill="#56635a"/>
      <rect data-underdesk="pc-led" x="1280" y="1556" width="12" height="16" fill="#abc28a"/>
      <path d="M1148 1624h156M1148 1640h156M1148 1656h156M1148 1672h156M1148 1688h156M1148 1704h156M1148 1720h156M1148 1736h156M1148 1752h156M1148 1768h156" stroke="#2d3d3d" strokeWidth="4"/>
      <path d="M1136 1836h24v12h-24zM1304 1836h24v12h-24z" fill="#101a20"/>
    </g>
    {Object.entries(DESK_TOWER_PORTS).map(([name,port])=><rect data-tower-port={name} key={name} x={port.x-4} y={port.y-4} width="8" height="8" fill="#0d1c22" stroke="#667569" strokeWidth="2"/>)}
    <path d="M28 1896h1544v12H28z" fill="#47504a"/>
  </g>;
}
