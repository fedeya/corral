import { expect, test } from '@playwright/test';

for(const width of [320,390,1440]) test(`mobile-only underdesk extension at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const extension=page.locator('.desk-art-underdesk');
  if(width>760) {
    await expect(extension).toBeHidden();
    const transform=await page.locator('.desk-scene').evaluate(el=>getComputedStyle(el).transform);
    const rect=await page.locator('.desk-viewport').boundingBox();
    const fit=Math.min(rect!.width/1600,rect!.height/1100);
    const matrix=transform.slice(7,-1).split(',').map(Number);
    expect(matrix[0]).toBeCloseTo(fit,5);expect(matrix[3]).toBeCloseTo(fit,5);
    expect(matrix[4]).toBeCloseTo(-800*fit,2);expect(matrix[5]).toBeCloseTo(-550*fit,2);
  } else {
    await expect(extension).toBeVisible();
    const bounds=await extension.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.height).toBeGreaterThan(160);
    const desktop=await page.locator('.desk-art-desktop').boundingBox();
    expect(desktop!.y).toBeLessThan(500);
    expect(Math.abs(bounds!.y-(desktop!.y+desktop!.height))).toBeLessThan(10);
    await expect(page.locator('[data-underdesk="pc-led"]')).toBeVisible();
    await page.screenshot({path:info.outputPath(`room-lit-${width}.png`)});
    const before=await page.locator('.desk-scene').getAttribute('style');
    await page.getByRole('button',{name:'Switch the desk lamp',exact:true}).click();
    expect(await page.locator('.desk-scene').getAttribute('style')).toBe(before);
    await expect(page.locator('.desk-art')).not.toHaveClass(/desk-art--lit/);
  }
  await page.screenshot({path:info.outputPath(`room-${width}.png`)});
});

for (const width of [320,390,1440]) test(`touched portraits and stable room at ${width}`,async ({page},info)=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await expect(page.locator('.desk-dialogue-portrait .xp-critter')).toBeVisible();
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const geometry=()=>page.locator('.desk-viewport').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),transform:getComputedStyle(document.querySelector('.desk-scene')!).transform}));
  const before=await geometry();
  await page.locator('.desk-object[aria-label="Ask the rubber duck"]').click();
  await expect(page.getByRole('img',{name:'Rubber duck portrait',exact:true})).toBeVisible();
  expect(await geometry()).toEqual(before);
  const portrait=await page.locator('.desk-dialogue-object-art').boundingBox();
  const frame=await page.locator('.desk-dialogue-portrait').boundingBox();
  expect(portrait!.width).toBeLessThanOrEqual(frame!.width-4);
  expect(portrait!.height).toBeLessThanOrEqual(frame!.height-4);
  await page.screenshot({path:info.outputPath(`duck-${width}.png`)});
});

for(const width of [320,390,1440]) test(`every original touched object stays isolated at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  test.setTimeout(120_000);
  const objects=[['coffee','Take a mate break'],['rocket','Launch the little rocket'],['plant','Water the desk plant'],['floppy','Inspect the source disk'],['controller','Inspect the old game controller'],['cassette','Play a short chiptune'],['books','Read the desk books'],['poster','Read the space poster'],['physics','Read the physics notes'],['keyboard','Evolve the keyboard'],['window','Look through the window'],['lamp','Switch the desk lamp']] as const;
  for(const [id,label] of objects){
    await page.getByRole('button',{name:label,exact:true}).click();
    const art=page.locator('.desk-dialogue-object-art');
    await expect(art).toBeVisible();
    await expect(art.locator('[data-prop-art]')).toHaveCount(1);
    await expect(art.locator('[data-prop-art]')).toHaveAttribute('data-prop-art',id);
    await expect(art.locator('.desk-art-desktop,.desk-art-room-darkness,.desk-art-underdesk')).toHaveCount(0);
    const frame=await page.locator('.desk-dialogue-portrait').boundingBox();
    const box=await art.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(frame!.x+2);
    expect(box!.x+box!.width).toBeLessThanOrEqual(frame!.x+frame!.width-2);
    await page.screenshot({path:info.outputPath(`portrait-${id}-${width}.png`)});
    await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
    if(await page.locator('.desk-page').getAttribute('data-view')==='monitor') await page.getByRole('button',{name:'Back to the desk ↙',exact:true}).click();
  }
  await page.getByRole('button',{name:'Look through the window',exact:true}).click();
  await expect(page.getByRole('img',{name:'Night silhouette portrait',exact:true})).toBeVisible();
});

for(const width of [320,390,1440]) test(`arcade stick lever and eight buttons at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const stick=page.locator('.desk-art [data-prop-art="controller"]');
  await expect(stick.locator('[data-arcade-front]')).toBeVisible();
  const cabinet=await stick.locator('[data-arcade-front]').evaluate(el=>{const box=(el as SVGGraphicsElement).getBBox();return {height:box.height,width:box.width};});
  expect(cabinet.height).toBeGreaterThanOrEqual(20);
  expect(cabinet.width).toBeGreaterThanOrEqual(160);
  await expect(stick.locator('[data-arcade-button]')).toHaveCount(8);
  const lever=await stick.locator('[data-arcade-lever]').boundingBox();
  const buttons=await stick.locator('[data-arcade-button]').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));
  for(const button of buttons) expect(lever!.x+lever!.width).toBeLessThan(button.x);
  for(let a=0;a<buttons.length;a++)for(let b=a+1;b<buttons.length;b++) {
    const x=buttons[a],y=buttons[b];expect(x.right<=y.x || y.right<=x.x || x.bottom<=y.y || y.bottom<=x.y).toBe(true);
  }
  const artBounds=await stick.evaluate(el=>{const b=(el as SVGGraphicsElement).getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height};});
  expect(artBounds.x).toBeGreaterThanOrEqual(120);expect(artBounds.y).toBeGreaterThanOrEqual(1000);
  expect(artBounds.x+artBounds.width).toBeLessThanOrEqual(300);expect(artBounds.y+artBounds.height).toBeLessThanOrEqual(1065);
  await page.screenshot({path:info.outputPath(`arcade-stick-${width}.png`)});
  await page.getByRole('button',{name:'Inspect the old game controller',exact:true}).click();
  await expect(page.getByRole('heading',{name:'AGENT ARCADE',exact:true})).toBeVisible();
  await expect(page.getByRole('img',{name:'Arcade stick portrait',exact:true})).toBeVisible();
  await expect(page.locator('.desk-dialogue-object-art [data-arcade-button]')).toHaveCount(8);
});
