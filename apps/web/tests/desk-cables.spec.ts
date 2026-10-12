import {expect,test} from '@playwright/test';

test('device cables connect to rear monitor ports instead of floating stubs',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  for(const id of ['keyboard','mouse','device']) {
    const cable=page.locator(`[data-cable="${id}"]`);
    await expect(cable).toHaveCount(1);
    const ends=await cable.evaluate(element=>{
      const path=element as SVGPathElement;
      const first=path.getPointAtLength(0),last=path.getPointAtLength(path.getTotalLength());
      return {first:{x:first.x,y:first.y},last:{x:last.x,y:last.y}};
    });
    expect(ends.first.y).toBe(620);
    expect(ends.last.y).toBeGreaterThanOrEqual(784);
  }
  expect(await page.locator('.desk-device').evaluate(element=>getComputedStyle(element,'::after').content)).toBe('none');
  const keyboard=page.locator('[data-cable="keyboard"]');
  const before=await keyboard.getAttribute('d');
  await page.getByRole('button',{name:'Evolve the keyboard',exact:true}).click();
  await expect(keyboard).not.toHaveAttribute('d',before!);
});
