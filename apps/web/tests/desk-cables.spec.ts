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
  // The independently powered lamp retains its exact original path.
  await expect(page.locator('[data-prop-art="lamp"] path').last()).toHaveAttribute('d','M144 750h-36l-8-8H88l-8-8v-20');
  const keyboard=page.locator('[data-cable="keyboard"]'),before=await keyboard.getAttribute('d');
  await page.getByRole('button',{name:'Evolve the keyboard',exact:true}).click();await expect(keyboard).not.toHaveAttribute('d',before!);
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  await page.screenshot({path:info.outputPath(`cables-${width}.png`)});
});
