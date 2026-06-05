// Smoke E2E: verifies the app boots cleanly and core v3 chrome is wired up.
// These checks don't need a floor plan — they exercise mode switching,
// the settings modal, heatmap pills and the help dialog.
import {test, expect} from '@playwright/test';

// Fail the test on any uncaught page error or console error during the run.
function trackErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

test('app boots without errors and shows empty state', async ({page}) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/Plexus/i);
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#btn-add')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('mode toolbar switches the active tool', async ({page}) => {
  await page.goto('/');
  // Add AP is the default active tool.
  await expect(page.locator('#btn-add')).toHaveClass(/active/);
  await page.locator('#btn-sel').click();
  await expect(page.locator('#btn-sel')).toHaveClass(/active/);
  await expect(page.locator('#btn-add')).not.toHaveClass(/active/);
});

test('annotation mode reveals the sub-tool bar', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#anno-sub-bar')).toBeHidden();
  await page.locator('#btn-anno').click();
  await expect(page.locator('#btn-anno')).toHaveClass(/active/);
  await expect(page.locator('#anno-sub-bar')).toBeVisible();
});

test('heatmap mode pill cycles through metrics', async ({page}) => {
  await page.goto('/');
  const pill = page.locator('#heat-mode-pill');
  const first = (await pill.textContent())?.trim();
  await pill.click();
  const second = (await pill.textContent())?.trim();
  expect(second).not.toBe(first);
});

test('settings modal opens with sectioned headings', async ({page}) => {
  await page.goto('/');
  await page.locator('[data-action="show-settings"]').click();
  await expect(page.locator('#mbg')).toHaveClass(/vis/);
  await expect(page.locator('.settings-heading').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mbg')).not.toHaveClass(/vis/);
});

test('help dialog opens via the ? shortcut', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('?');
  await expect(page.locator('#mbg')).toHaveClass(/vis/);
  await expect(page.locator('.help-grid')).toBeVisible();
});
