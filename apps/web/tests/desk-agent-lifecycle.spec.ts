import {expect,test} from '@playwright/test';
import {demoReducer,initialDemoState} from '../src/desk/desk-demo';

test('background agents finish at staggered times only after entering the scene',()=>{
  const initial=initialDemoState();
  expect(demoReducer(initial,{type:'advance',now:100000}).statuses).toEqual(initial.statuses);
  const entered=demoReducer(initial,{type:'reveal',now:1000});
  const early=demoReducer(entered,{type:'advance',now:26000});
  expect(early.statuses[2]).toBe('done');
  expect(early.statuses[6]).toBe('working');
  const late=demoReducer(early,{type:'advance',now:90000});
  for(const index of [2,3,4,5,6]) expect(late.statuses[index]).toBe('done');
  expect(late.focused).toBe(0);
  expect(late.statuses[0]).toBe('blocked');
});

test('opening a finished agent acknowledges it as idle while retaining its completed work',()=>{
  let state=demoReducer(initialDemoState(),{type:'reveal',now:1000});
  state=demoReducer(state,{type:'advance',now:90000});
  state=demoReducer(state,{type:'focus',index:2,now:90001});
  expect(state.statuses[2]).toBe('idle');
  expect(state.completed).toContain(2);
  expect(state.statuses[3]).toBe('done');
  const reset=demoReducer(state,{type:'reset'});
  expect(reset.completed).toEqual([]);
  expect(Object.keys(reset.running)).toHaveLength(0);
});

test('a background completion leaves the browser alone and opening that agent clears its done badge',async({page})=>{
  await page.clock.install();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Open browser',exact:true}).click();
  await page.clock.fastForward(26000);
  const auth=page.getByRole('button',{name:'Desk key auth',exact:true});
  await expect(auth).toHaveAttribute('data-status','done');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app','browser');
  await auth.click();
  await expect(page.getByRole('region',{name:'Coding agent demo terminal'})).toHaveAttribute('data-status','idle');
  await expect(auth).toHaveAttribute('data-status','idle');
});
