import { expect, test } from '@playwright/test';
import { DESK_OBJECTS } from '../src/desk/desk-contract';
import {newRun,stepRun} from '../src/desk/arcade-engine';

const controller = DESK_OBJECTS.find(object => object.id === 'controller')!;
test('obstacles spawn and disappear at the visible edges of the expanded terrain',()=>{
  const edges={left:-100,right:740};
  const run=newRun(edges);
  expect(run.obstacles[0].x).toBeGreaterThan(640);
  const before=stepRun({...run,obstacles:[{id:0,x:-90,width:22,height:30}]},0,edges);
  expect(before.obstacles.some(obstacle=>obstacle.id===0)).toBe(true);
  const after=stepRun({...run,obstacles:[{id:0,x:-123,width:22,height:30}]},0,edges);
  expect(after.obstacles.some(obstacle=>obstacle.id===0)).toBe(false);
});
async function openArcade(page: import('@playwright/test').Page, mobile = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  if (mobile) {
    // The small-screen room intentionally hides decorative desk objects.
    await page.getByRole('button', { name: 'Focus monitor ↗', exact: true }).click();
    await page.getByRole('button', { name: 'Open arcade', exact: true }).click();
  } else {
    await page.getByRole('button', { name: controller.label, exact: true }).click();
  }
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
  await expect(page.getByRole('heading', { name: 'AGENT ARCADE', exact: true })).toBeVisible();
}

test('joystick opens an original runner: start, jump, pause, collision and retry', async ({ page }) => {
  await openArcade(page);
  const game = page.getByRole('region', { name: 'Runner game', exact: true });
  await expect(game).toHaveAttribute('data-state', 'ready');
  await expect(page.getByRole('link', { name: 'agent-arcade on GitHub' })).toHaveAttribute('href', 'https://github.com/fedeya/agent-arcade');
  await page.getByRole('button', { name: 'Start run', exact: true }).click();
  await expect(game).toBeFocused();
  await page.keyboard.press('Space');
  await expect(game.locator('[data-runner]')).toHaveAttribute('data-airborne', 'true');
  await page.getByRole('button', { name: 'Pause run', exact: true }).click();
  await expect(game).toHaveAttribute('data-state', 'paused');
  const score = await page.getByLabel('Runner score', { exact: true }).textContent();
  await page.waitForTimeout(300);
  await expect(page.getByLabel('Runner score', { exact: true })).toHaveText(score!);
  await page.getByRole('button', { name: 'Resume run', exact: true }).click();
  await expect(game).toHaveAttribute('data-state', 'over', { timeout: 12_000 });
  await page.getByRole('button', { name: 'Retry run', exact: true }).click();
  await expect(game).toHaveAttribute('data-state', 'running');
  await game.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open arcade', exact: true })).toBeVisible();
});

test('arcade switches preserve browser state and pause the run while away', async ({ page }) => {
  await openArcade(page);
  await page.getByRole('button', { name: 'Open browser', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search field notes' });
  await search.fill('gravity');
  await page.getByRole('button', { name: 'Open arcade', exact: true }).click();
  await page.getByRole('button', { name: 'Start run', exact: true }).click();
  await page.getByRole('button', { name: 'Open terminal', exact: true }).click();
  await page.getByRole('button', { name: 'Open arcade', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Runner game', exact: true })).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: 'Open browser', exact: true }).click();
  await expect(search).toHaveValue('gravity');
});

test('mobile runner provides touch jump without overflowing the monitor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openArcade(page, true);
  await page.getByRole('button', { name: 'Start run', exact: true }).click();
  await page.getByRole('button', { name: 'Jump', exact: true }).click();
  await expect(page.locator('[data-runner]')).toHaveAttribute('data-airborne', 'true');
  const game = page.getByRole('region', { name: 'Runner game', exact: true });
  const bounds = await game.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: 'Pause run', exact: true })).toBeVisible();
});

test('Space starts immediately after opening arcade and jumping does not outline the playfield',async({page})=>{
  await openArcade(page);
  const game=page.getByRole('region',{name:'Runner game',exact:true});
  await page.keyboard.press('Space');
  await expect(game).toHaveAttribute('data-state','running');
  await page.keyboard.press('Space');
  await expect(game.locator('[data-runner]')).toHaveAttribute('data-airborne','true');
  expect(await game.evaluate(element=>getComputedStyle(element).outlineStyle)).toBe('none');
  await expect(page.getByRole('link',{name:'agent-arcade on GitHub'})).toHaveText('Agent Arcade on GitHub ↗');
});

test('terrain scrolls a repeating texture without moving its edges',async({page})=>{
  await openArcade(page);
  const pattern=page.locator('.desk-arcade-world pattern');
  await expect(pattern).toHaveAttribute('patternUnits','userSpaceOnUse');
  const terrain=page.locator('.desk-arcade-world rect[fill="url(#arcade-floor)"]');
  const edge=await terrain.getAttribute('x');
  await page.keyboard.press('Space');
  await expect.poll(()=>pattern.getAttribute('patternTransform')).not.toBe('translate(0 0)');
  await expect(terrain).toHaveAttribute('x',edge!);
  await page.getByRole('button',{name:'Pause run',exact:true}).click();
  const offset=await pattern.getAttribute('patternTransform');
  await page.waitForTimeout(120);
  await expect(pattern).toHaveAttribute('patternTransform',offset!);
});

for(const width of [1440,390]) test(`platform spans the entire game width without explanatory copy at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await openArcade(page,width===390);
  const game=page.getByRole('region',{name:'Runner game',exact:true});
  const platform=page.locator('.desk-arcade-world > path');
  await expect.poll(async()=>{
    const area=await game.boundingBox();
    const floor=await platform.boundingBox();
    return Math.abs(area!.width-floor!.width);
  }).toBeLessThan(3);
  await expect(page.locator('.desk-arcade')).not.toContainText('A tiny web homage');
  await expect(page.locator('.desk-arcade')).not.toContainText('Original web runner');
  await expect(page.getByRole('link',{name:'agent-arcade on GitHub'})).toBeVisible();
});
