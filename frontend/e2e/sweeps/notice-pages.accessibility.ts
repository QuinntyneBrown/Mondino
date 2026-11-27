// Accessibility sweep. Runs only when a person asks: npm run e2e:accessibility
// Traces to: L2-039, L2-041, L2-036, L2-043, L2-052, L2-053

import { expect, test } from '../fixtures/test';
import { NORTHWIND_PINS, northwindPins } from '../fixtures/pins';
import { NORTHWIND_ME, sofiaProfile } from '../fixtures/profile';
import { expectNoViolations } from '../support/axe';
import { rememberTeamOnce } from '../support/membership';

test.use({ webgl: false });

for (const theme of ['light', 'dark'] as const) {
  test(`"You need an invite link" has no WCAG 2.2 AA violation, ${theme}`, async ({
    inviteNeededPage,
  }) => {
    await inviteNeededPage.page.emulateMedia({ colorScheme: theme });
    await inviteNeededPage.open('/globe');
    await expect(inviteNeededPage.title).toBeVisible();

    await expectNoViolations(inviteNeededPage.page);
  });

  test(`Left Team has no WCAG 2.2 AA violation, ${theme}`, async ({
    api,
    page,
    profilePage,
    leaveDialog,
    leftTeamPage,
  }) => {
    // Sofia leaves Northwind from Profile & Settings, as profile-leave-team.spec.ts does
    await rememberTeamOnce(page);
    api.answer('GET', NORTHWIND_PINS, northwindPins());
    api.answer('GET', NORTHWIND_ME, sofiaProfile());
    api.answer('DELETE', NORTHWIND_ME, { status: 204 });
    await page.emulateMedia({ colorScheme: theme });
    await profilePage.open();
    await profilePage.leave.click();
    await leaveDialog.confirm.click();
    await expect(leftTeamPage.title).toBeVisible();

    await expectNoViolations(page);
  });
}
