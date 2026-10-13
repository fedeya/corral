import { expect, test } from '@playwright/test';

async function darkRoom(page: import('@playwright/test').Page, width=1440) {
 await page.setViewportSize({width,height:width===390?844:1000});
 await page.goto('/?concept=desk');
 await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
 await page.getByRole('button',{name:'Skip intro',exact:true}).click();
 await page.waitForTimeout(1700);
 await page.getByRole('button',{name:'Switch the desk lamp',exact:true}).click();
 await page.waitForTimeout(700);
}

test('rain falls downward independently and resets only beyond the window edges',async({page},info)=>{
 await darkRoom(page);
 // Real CSS animation frames on either side of the previous sheet's repeat.
 for(const [name,time] of [['rain-before-seam',1790],['rain-after-seam',1810]] as const) {
  await page.locator('.desk-art-rain').evaluate((element,time)=>{for(const animation of element.getAnimations({subtree:true})){animation.pause();animation.currentTime=time;}},time);
  await page.screenshot({path:info.outputPath(`${name}.png`)});
 }
 const drops=page.locator('.desk-art-rain-drop');
 expect(await drops.count()).toBeGreaterThanOrEqual(24);
 const result=await drops.evaluateAll(elements=>elements.map(element=>{
  const animation=element.getAnimations()[0]; const timing=animation.effect!.getTiming();
  const duration=Number(timing.duration),delay=Number(timing.delay);
  const sample=(progress:number)=>{animation.pause();animation.currentTime=delay+duration*(3+progress);return new DOMMatrix(getComputedStyle(element).transform).m42;};
  const box=(element as SVGGraphicsElement).getBBox();
  return {duration,delay,start:sample(.0001),middle:sample(.5),end:sample(.9999),wrapped:sample(1.0001),length:box.height,y:box.y};
 }));
 expect(new Set(result.map(drop=>drop.duration)).size).toBeGreaterThan(3);
 expect(new Set(result.map(drop=>drop.delay)).size).toBeGreaterThan(16);
 for(const drop of result){
  expect(drop.middle).toBeGreaterThan(drop.start);
  expect(drop.end).toBeGreaterThan(drop.middle);
  expect(drop.y+drop.start+drop.length).toBeLessThan(96);
  expect(drop.y+drop.end).toBeGreaterThan(462);
  expect(drop.y+drop.wrapped+drop.length).toBeLessThan(96);
  expect(drop.wrapped).toBeCloseTo(drop.start,2);
 }
 expect(await page.locator('.desk-art-storm').evaluate(element=>element.parentElement?.getAttribute('clip-path'))).toMatch(/window-glass/);
 // Capture ordinary staggered rain, not all drops aligned by the samples above.
 await drops.evaluateAll(elements=>elements.forEach(element=>{const animation=element.getAnimations()[0];animation.currentTime=1000;animation.play();}));
 await page.screenshot({path:info.outputPath('rain-natural.png')});
});

for (const width of [390,1440]) test(`outdoor bolt shares the gentle flash and resets safely at ${width}px`,async({page},info)=>{
 await darkRoom(page,width);
 const bolt=page.locator('.desk-art-lightning-bolt');
 await expect(bolt).toHaveCount(1);
 expect(await bolt.evaluate(element=>element.closest('[clip-path]')?.getAttribute('clip-path'))).toMatch(/window-glass/);
 const flash=page.locator('.desk-art-lightning');
 const timings=await page.locator('.desk-art-lightning, .desk-art-lightning-bolt').evaluateAll(elements=>elements.map(element=>{const animation=element.getAnimations()[0];return {start:animation.startTime,duration:animation.effect!.getTiming().duration,delay:animation.effect!.getTiming().delay};}));
 expect(timings[0]).toEqual(timings[1]);
 expect(timings[0].duration).toBe(19000);
 expect(timings[0].delay).toBe(7000);
 const sample=async(time:number)=>{
  await page.locator('.desk-art-lightning, .desk-art-lightning-bolt').evaluateAll((elements,time)=>elements.forEach(element=>{const animation=element.getAnimations()[0];animation.pause();animation.currentTime=time;}),time);
 };
 await sample(7000); await expect(bolt).toHaveCSS('opacity','0'); await expect(flash).toHaveCSS('opacity','0');
 await sample(7285);
 await expect.poll(async()=>Number(await bolt.evaluate(element=>getComputedStyle(element).opacity))).toBeCloseTo(.8,2);
 await expect.poll(async()=>Number(await flash.evaluate(element=>getComputedStyle(element).opacity))).toBeCloseTo(.09,2);
 await page.screenshot({path:info.outputPath(`bolt-${width}.png`)});
 await sample(8000); await expect(bolt).toHaveCSS('opacity','0'); await expect(flash).toHaveCSS('opacity','0');
 await page.screenshot({path:info.outputPath(`normal-${width}.png`)});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 for(const selector of ['.desk-art-lightning-bolt','.desk-art-lightning','.desk-art-rain-drop']) await expect(page.locator(selector).first()).toHaveCSS('animation-name','none');
 await expect(bolt).toHaveCSS('opacity','0');
 await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await expect(bolt).not.toHaveCSS('animation-name','none');
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const selector of ['.desk-art-lightning-bolt','.desk-art-lightning','.desk-art-rain-drop']) await expect(page.locator(selector).first()).toHaveCSS('animation-name','none');
 await expect(page.locator('.desk-art-rain')).toHaveCSS('visibility','hidden');
 await expect(bolt).toHaveCSS('opacity','0');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'Switch the desk lamp',exact:true}).click();
 await expect(bolt).toHaveCSS('animation-name','none');
 await expect(page.locator('.desk-art-rain-drop').first()).toHaveCSS('animation-name','none');
 await expect(page.locator('.desk-art-visitor-friendly')).toHaveCSS('opacity','1');
 await expect(page.locator('.desk-art-visitor-silhouette')).toHaveCSS('opacity','0');
});
