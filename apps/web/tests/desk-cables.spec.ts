import { expect, test } from '@playwright/test';

for(const width of [320,390,1440]) test(`coherent device cable endpoints at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const mobile=width<=760;
  const ports={keyboard:{x:1120,y:1536},mouse:{x:1120,y:1552},device:{x:1340,y:1540},video:{x:1120,y:1596}};
  await expect(page.locator('[data-cable]')).toHaveCount(mobile?4:3);
  for(const id of ['keyboard','mouse','device',...(mobile?['video']:[])] as (keyof typeof ports)[]){
    const cable=page.locator(`[data-cable="${id}"]`);await expect(cable).toHaveCount(1);
    const ends=await cable.evaluate(element=>{
      const path=element as SVGPathElement,first=path.getPointAtLength(0),last=path.getPointAtLength(path.getTotalLength());
      return {first:{x:first.x,y:first.y},last:{x:last.x,y:last.y}};
    });
    if(mobile){
      expect(id==='video'?ends.last:ends.first).toEqual(ports[id]);
      await expect(page.locator(`[data-tower-port="${id}"]`)).toBeVisible();
      if(id==='video')expect(ends.first).toEqual({x:1030,y:620});
      else expect(ends.last).toEqual(id==='keyboard'?{x:710,y:813}:id==='mouse'?{x:1016,y:854}:{x:1376,y:784});
    } else {expect(ends.first.y).toBe(620);expect(ends.last.y).toBeGreaterThanOrEqual(784);}
    await expect(cable).toHaveAttribute('stroke-width','2');
  }
  if(mobile) for(const id of ['keyboard','mouse','device']) {
    const route=await page.locator(`[data-cable="${id}"]`).evaluate(element=>{
      const path=element as SVGPathElement,length=path.getTotalLength();
      const samples=Array.from({length:Math.ceil(length/2)+1},(_,i)=>path.getPointAtLength(Math.max(0,length-i*2)));
      const rear=samples.findIndex(point=>point.y<724);
      const clip=path.parentElement!.getAttribute('clip-path');
      const rects=clip?Array.from(document.querySelectorAll<SVGRectElement>(`${clip.slice(4,-1)} rect`)).map(rect=>({x:rect.x.baseVal.value,y:rect.y.baseVal.value,width:rect.width.baseVal.value,height:rect.height.baseVal.value})):[];
      const visible=(point:DOMPoint)=>rects.some(rect=>point.x>=rect.x&&point.x<=rect.x+rect.width&&point.y>=rect.y&&point.y<=rect.y+rect.height);
      return {rear,startsUp:samples[10].y<samples[0].y,upToRear:rear>0&&samples.slice(0,rear).every((point,i)=>i===0||point.y<=samples[i-1].y),clip,frontLeak:rear>=0&&samples.slice(rear).some(point=>point.y>744&&point.y<1088&&visible(point)),underdesk:samples.some(point=>point.y>1100&&visible(point))};
    });
    expect(route.startsUp).toBe(true);
    expect(route.rear,`${id} must reach the rear edge before descending`).toBeGreaterThan(0);
    expect(route.upToRear).toBe(true);
    expect(route.clip).toBeTruthy();expect(route.frontLeak).toBe(false);expect(route.underdesk).toBe(true);
  }
  // The independently powered lamp retains its exact original path.
  await expect(page.locator('[data-prop-art="lamp"] path').last()).toHaveAttribute('d','M144 750h-36l-8-8H88l-8-8v-20');
  const keyboard=page.locator('[data-cable="keyboard"]'),before=await keyboard.getAttribute('d');
  await page.getByRole('button',{name:'Evolve the keyboard',exact:true}).click();await expect(keyboard).not.toHaveAttribute('d',before!);
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  await page.screenshot({path:info.outputPath(`cables-${width}.png`)});
});
