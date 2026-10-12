import type {CSSProperties} from 'react';
import './DeskMonitorFrame.css';
export function DeskMonitorFrame({scale,disabled,zoomed,suggested,onToggle}:{scale:number;disabled:boolean;zoomed:boolean;suggested:boolean;onToggle:()=>void}) {
  return <button type="button" className="desk-monitor-frame" style={{'--frame-hit':`${Math.max(32,44/scale)}px`} as CSSProperties} disabled={disabled} data-suggested={suggested} aria-label={zoomed?'Zoom out using the monitor frame':'Zoom in using the monitor frame'} onClick={onToggle}>
    {(['top','left','right','bottom'] as const).map(edge=><span key={edge} data-edge={edge} aria-hidden="true" />)}
  </button>;
}
