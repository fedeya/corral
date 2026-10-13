import {expect,test} from '@playwright/test';

const plausibleSource='https://plausible.fedeminaya.com/js/script.hash.outbound-links.pageview-props.tagged-events.js';
const rybbitSource='https://rybbit.fedeminaya.com/api/script.js?siteId=00647d524d37';

test('landing loads configured deferred analytics and queues Plausible calls',async({page})=>{
  const scripts:string[]=[];
  // Never send local test pageviews or events to the production collectors.
  await page.route('https://plausible.fedeminaya.com/**',route=>{
    if(route.request().resourceType()==='script') scripts.push(route.request().url());
    return route.abort();
  });
  await page.route('https://rybbit.fedeminaya.com/**',route=>{
    if(route.request().resourceType()==='script') scripts.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  const plausible=page.locator(`script[src="${plausibleSource}"]`);
  await expect(plausible).toHaveCount(1);
  await expect(plausible).toHaveAttribute('defer','');
  await expect(plausible).toHaveAttribute('data-domain','corral.fedeya.sh');
  const rybbit=page.locator(`script[src="${rybbitSource}"]`);
  await expect(rybbit).toHaveCount(1);
  await expect(rybbit).toHaveAttribute('defer','');
  await expect.poll(()=>scripts.slice().sort()).toEqual([plausibleSource,rybbitSource].sort());
  const queue=await page.evaluate(()=>{
    const analyticsWindow=window as unknown as {plausible:((...args:unknown[])=>void)&{q?:IArguments[]}};
    analyticsWindow.plausible('test-event',{props:{source:'local-test'}});
    return Array.from(analyticsWindow.plausible.q ?? [],args=>Array.from(args));
  });
  expect(queue).toEqual([['test-event',{props:{source:'local-test'}}]]);
  await expect(page.getByRole('button',{name:'Step inside',exact:true})).toBeVisible();
});
