import { expect, test } from '@playwright/test';

const conversations = {
  api: ['please fix the keyboard navigation', 'Removed a duplicate keydown listener. The selection should move once now.', 'it still moves twice', 'Changed the handler to ignore repeated keydown events.', "now it doesn't move at all", 'please. i have a family to feed', 'The guard also blocks the first keypress. Removing it.', 'they depend on this dropdown', 'Testing the listener cleanup this time.', "if you don't fix this they're going to shoot me", 'Who?', "don't worry about it. focus on the dropdown", 'Found it. A new listener was being added on every render.', "please don't refactor anything. there isn't time", 'Attached it once and added cleanup. Running the regression.', 'tell my family i loved them', 'Six tests passed. One keypress, one step.', "i tried it. it works. we're so back", 'can you also add vim bindings', 'Keep j/k alongside the arrow keys?'],
  web: ['where did the dashboard go', 'The offline state is clean and empty.', 'there was a whole application here a second ago', 'It returns when the connection does.', "my furniture doesn't disappear when the power goes out", 'I can preserve the last-known data.', 'yes please preserve my furniture', 'Keep the last-known agents visible?'],
  auth: ['i got logged out again', 'The session expired.', 'i built this website', 'That does not extend the session.', 'i was there when it was a div', 'The refresh token is not being renewed.', "after everything we've been through", 'Adding silent refresh.', "tell it i'm not mad. just disappointed"],
  docs: ['installation takes two minutes', 'I followed the README. I’m on minute twelve.', 'are you following the readme', 'Step three says “run the usual command.”', 'right. the usual command', 'Which command?', 'everyone knows the command', 'The next step needs a file on your Desktop.', 'okay the target audience was originally me', 'Expanding the target audience.'],
  search: ['i searched for auth', 'The office lunch is the first result.', 'why', 'It contains “authentic Italian food”.', 'bring me the person responsible', 'You wrote the search function.', 'bring me someone else', 'Prioritizing exact names.', "and let the lunch go. it's innocent"],
  infra: ['it works on my machine', 'CI cannot find the configuration.', 'has it tried being my machine', 'The path is /Users/fede/Desktop/final-final-REAL.json.', "that's an internal detail", 'It is the deployment configuration.', 'can we ship my laptop', 'Moving the file into the repository.', 'fine. but it was willing to travel'],
  tests: ['all green. finally some good news', 'The test asserts that true is true.', 'and is it', 'Yes.', 'then why are we arguing', 'It never calls the function.', 'i hired you to help me not investigate me', 'The real function fails on an empty list.', 'nobody give it an empty list', 'Writing that test now.', 'this used to be a happy place'],
  billing: ["we're in test mode right", 'Yes.', 'legally or spiritually', 'The sandbox key is loaded.', "so this button can't take money", 'Correct.', 'what if the person is me', 'Still no.', "i'm going to click it", 'stay with me', "I'm here.", 'it worked', 'refund it anyway'],
} as const;

for (const [agent, messages] of Object.entries(conversations)) {
  test(`${agent} has the complete inline static speaker-labeled conversation`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    const terminal = page.getByRole('region', { name: 'Coding agent demo terminal' });
    await terminal.getByRole('button', { name: `Focus ${agent} in herdr demo`, exact: true }).click();
    await expect(terminal).toHaveAttribute('data-focused', agent);
    await expect(terminal.locator('details, summary')).toHaveCount(0);
    const history = terminal.getByRole('list', { name: `Earlier conversation with ${agent}` });
    const rows = history.getByRole('listitem');
    await expect(rows).toHaveCount(messages.length);
    expect(await rows.locator('.agent-history-text').allTextContents()).toEqual(messages);
    expect(await rows.locator('.agent-history-speaker').allTextContents()).toEqual(messages.map(text => /^[A-Z]/.test(text) ? 'Agent' : 'You'));
    expect(await history.evaluate(el => el.nextElementSibling?.classList.contains('agent-user-prompt'))).toBe(true);
    await terminal.locator('.agent-terminal-session').evaluate(el => { el.scrollTop = 0; });
    await expect(rows.first()).toBeInViewport();
    if (agent === 'api') await page.screenshot({ path: `${process.env.TMPDIR ?? '/root/.hermes/cache/scratch'}/desk-history-earlier-api.png` });
    await expect(terminal.locator('.agent-simulation')).toHaveText('SIMULATED');
    if (agent === 'billing') {
      await expect(terminal).toHaveAttribute('data-status', 'idle');
      await expect(terminal).toContainText('Ready for the next task.');
    }
  });
}

for (const width of [1440, 390, 320]) {
  test(`inline history starts at the decision, supports keyboard scrolling, and resets only on agent switch (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    if (width < 760) await page.getByRole('button', { name: 'Focus monitor ↗', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const terminal = page.getByRole('region', { name: 'Coding agent demo terminal' });
    const session = terminal.locator('.agent-terminal-session');
    const reply = terminal.getByRole('button', { name: 'Yes, keep it' });
    await expect(reply).toBeInViewport();
    const paneBox = await session.boundingBox();
    const replyBox = await reply.boundingBox();
    expect(replyBox!.y + replyBox!.height).toBeLessThanOrEqual(paneBox!.y + paneBox!.height + 1);
    expect(await session.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    const outerScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    await session.focus();
    await page.keyboard.press('Control+Home');
    await expect.poll(() => session.evaluate(el => el.scrollTop)).toBe(0);
    await expect(terminal.getByText('please fix the keyboard navigation', { exact: true })).toBeInViewport();
    // Reading earlier messages must remain stable; timed React progress renders
    // are covered separately below.
    await page.waitForTimeout(250);
    expect(await session.evaluate(el => el.scrollTop)).toBe(0);
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(outerScroll);
    expect(await terminal.locator('.agent-history').evaluate(el => getComputedStyle(el).overflowY)).toBe('visible');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 760) await page.getByRole('combobox', { name: 'Focused agent' }).selectOption('7');
    else await terminal.getByRole('button', { name: 'Focus billing in herdr demo', exact: true }).click();
    await expect(terminal).toHaveAttribute('data-focused', 'billing');
    await expect(terminal.getByText('Standing by.', { exact: true })).toBeInViewport();
    if (width < 760) await page.getByRole('combobox', { name: 'Focused agent' }).selectOption('0');
    else await terminal.getByRole('button', { name: 'Focus api in herdr demo', exact: true }).click();
    await expect(reply).toBeInViewport();
    expect(await session.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await page.screenshot({ path: `${process.env.TMPDIR ?? '/root/.hermes/cache/scratch'}/desk-history-inline-${width}.png` });
  });
}

test('acknowledged completed background agents retain a meaningful result without blank test output', async ({ page }) => {
  test.setTimeout(40000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  const terminal = page.getByRole('region', { name: 'Coding agent demo terminal' });
  const auth = terminal.getByRole('button', { name: 'Focus auth in herdr demo', exact: true });
  await expect(auth).toContainText('done', { timeout: 30000 });
  await auth.click();
  await expect(terminal).toHaveAttribute('data-status', 'idle');
  await expect(terminal.locator('.agent-run-complete')).toContainText('Session handling review complete.');
  await expect(terminal.locator('.agent-run-complete')).toContainText('Ready for your review.');
  await expect(terminal.locator('.agent-test-result')).toHaveCount(0);
  await expect(terminal.locator('.agent-run-complete')).not.toContainText('Standing by.');
});

test('a terminal first mounted behind the browser positions the decision on its first visible layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open install guide', exact: true }).click();
  await page.getByRole('button', { name: 'Open terminal', exact: true }).click();
  const reply = page.getByRole('button', { name: 'Yes, keep it' });
  await expect(reply).toBeInViewport();
  const session = page.locator('.agent-terminal-session');
  const paneBox = await session.boundingBox();
  const replyBox = await reply.boundingBox();
  expect(replyBox!.y + replyBox!.height).toBeLessThanOrEqual(paneBox!.y + paneBox!.height + 1);
});

test('background progress never displays an empty filename or claims the offline tests are running', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.getByRole('button', { name: 'Focus auth in herdr demo', exact: true }).click();
  const output = page.locator('.agent-run-output');
  await expect(output).toContainText('Reviewing the example task');
  await expect(output).not.toContainText('Updating …');
  await expect(output).not.toContainText('Running offline agent tests');
});

test('progress updates do not steal an upward history scroll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  const session = page.locator('.agent-terminal-session');
  await page.getByRole('button', { name: 'Yes, keep it' }).click();
  await session.evaluate(el => { el.scrollTop = 0; });
  await expect(page.locator('.agent-run-output')).toContainText('Running keyboard navigation tests', { timeout: 10000 });
  expect(await session.evaluate(el => el.scrollTop)).toBe(0);
});
