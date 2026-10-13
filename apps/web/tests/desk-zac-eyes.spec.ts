import {expect,test} from '@playwright/test';

test('awake eyes blink and briefly glance without moving the head; hidden and reduced motion stay static',async({page})=>{
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const head=page.locator('.desk-art [data-prop-art="zac"]');
  const eyes=head.locator('[data-zac-eyes]');
  expect(await eyes.evaluate(el=>el.getAnimations().length)).toBe(0);
  await page.getByRole('button',{name:'Wake the Zac prototype',exact:true}).click();
  await expect.poll(()=>eyes.evaluate(el=>el.getAnimations().length)).toBe(1);
  const sample=async(time:number)=>eyes.evaluate(async(el,time)=>{
    const animation=el.getAnimations()[0]; animation.pause(); animation.currentTime=time;
    await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
    return getComputedStyle(el).transform;
  },time);
  const neutral=await sample(0);
  expect(await sample(700)).not.toBe(neutral);
  expect(await sample(1600)).not.toBe(neutral);
  expect(await sample(5000)).toBe(neutral);
  await expect(head).toHaveAttribute('transform','translate(294 748)');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(()=>eyes.evaluate(el=>el.getAnimations().length)).toBe(0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>eyes.evaluate(el=>el.getAnimations().length)).toBe(0);
  expect(await eyes.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  await page.getByRole('button',{name:'Wake the Zac prototype',exact:true}).click();
  await expect(eyes).toHaveAttribute('data-zac-eyes','off');
  expect(await eyes.evaluate(el=>el.getAnimations().length)).toBe(0);
});
