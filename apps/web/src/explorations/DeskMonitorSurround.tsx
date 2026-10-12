import {useEffect,useRef,useState,type CSSProperties} from 'react';

/** A camera move is not a pointer gesture: require fresh motion after settling. */
export function DeskMonitorSurround({cameraKey,style,onExit,label='Back to the desk from the monitor surround'}:{cameraKey:string;style?:CSSProperties;onExit:()=>void;label?:string}) {
  const [highlight,setHighlight]=useState(false);
  const settled=useRef(false);
  useEffect(()=>{
    settled.current=false;setHighlight(false);
    const scene=document.querySelector('.desk-scene');
    const duration=scene?Math.max(...getComputedStyle(scene).transitionDuration.split(',').map(value=>parseFloat(value)*(value.trim().endsWith('ms')?1:1000))):0;
    const timer=window.setTimeout(()=>{settled.current=true;},duration?duration+50:0);
    return ()=>window.clearTimeout(timer);
  },[cameraKey]);
  return <button type="button" className="desk-monitor-surround" style={style} data-highlight={highlight} aria-label={label} onPointerMove={event=>{if(settled.current && event.pointerType!=='touch')setHighlight(true);}} onPointerLeave={()=>setHighlight(false)} onClick={onExit}><span aria-hidden="true">↙ Back to the desk</span></button>;
}
