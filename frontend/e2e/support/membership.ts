import type { Page } from '@playwright/test';

/** Northwind as the browser remembers it after joining: ids and the team's name, nothing more. */
export const NORTHWIND_MEMBERSHIP = {
  teamId: 'c8a2f0de-5b1e-4f7c-9a3d-2e6b8f1c4d07',
  teammateId: '5f3e9b2a-7c41-4d8e-b6a0-91d2c7e4f318',
  teamName: 'Northwind',
};

/** Makes the browser remember a team before the first page loads, as joining would have. */
export async function rememberTeam(page: Page, membership = NORTHWIND_MEMBERSHIP): Promise<void> {
  await page.addInitScript((kept) => {
    localStorage.setItem('mondino.membership', kept);
  }, JSON.stringify(membership));
}

/**
 * Makes the browser hold a teammate's chosen kinds of moment, as a save on Profile & Settings
 * leaves them (ADR 0020): Sofia's unless another teammate id is given.
 */
export async function chooseKinds(
  page: Page,
  momentKinds: string[],
  teammateId = NORTHWIND_MEMBERSHIP.teammateId,
): Promise<void> {
  await page.addInitScript((kept) => {
    localStorage.setItem('mondino.settings', kept);
  }, JSON.stringify({ teammateId, momentKinds }));
}
