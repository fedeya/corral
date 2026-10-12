import { DESK_OBJECTS } from './desk-contract';

type Point = {x:number;y:number};
/** Share crowded touch padding by proximity, never cover another prop's center. */
export function objectTouchClip(object:(typeof DESK_OBJECTS)[number],width:number,height:number) {
 const center={x:object.x+object.width/2,y:object.y+object.height/2};
 const left=center.x-width/2,top=center.y-height/2;
 let polygon:Point[]=[{x:left,y:top},{x:left+width,y:top},{x:left+width,y:top+height},{x:left,y:top+height}];
 for(const other of DESK_OBJECTS) {
  if(other.id===object.id) continue;
  const next={x:other.x+other.width/2,y:other.y+other.height/2};
  const dx=next.x-center.x,dy=next.y-center.y;
  const limit=(next.x*next.x+next.y*next.y-center.x*center.x-center.y*center.y)/2;
  const distance=(p:Point)=>p.x*dx+p.y*dy-limit;
  const clipped:Point[]=[];
  polygon.forEach((a,i)=>{
   const b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);
   if(da<=0) clipped.push(a);
   if((da<=0)!==(db<=0)) {const t=da/(da-db);clipped.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});}
  });
  polygon=clipped;
 }
 return `polygon(${polygon.map(p=>`${(p.x-left)/width*100}% ${(p.y-top)/height*100}%`).join(',')})`;
}
