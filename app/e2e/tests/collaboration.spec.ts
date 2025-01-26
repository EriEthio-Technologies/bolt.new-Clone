import { test, expect } from '@playwright/test';

test.describe('Collaborative Features', () => {
  test.beforeEach(async ({ browser }) => {
    // Create two browser contexts for testing collaboration
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Login both users
    await pageA.goto('/login');
    await pageA.getByLabel('Email').fill('userA@example.com');
    await pageA.getByLabel('Password').fill('password123');
    await pageA.getByRole('button', { name: 'Login' }).click();

    await pageB.goto('/login');
    await pageB.getByLabel('Email').fill('userB@example.com');
    await pageB.getByLabel('Password').fill('password123');
    await pageB.getByRole('button', { name: 'Login' }).click();
  });

  test('pair programming session', async ({ browser }) => {
    const [pageA, pageB] = await Promise.all([
      browser.newPage(),
      browser.newPage()
    ]);

    // User A starts a pair programming session
    await pageA.goto('/workspace');
    await pageA.getByRole('button', { name: 'Start Pair Session' }).click();
    const sessionUrl = await pageA.getByRole('textbox', { name: 'Session URL' }).inputValue();

    // User B joins the session
    await pageB.goto(sessionUrl);
    await pageB.getByRole('button', { name: 'Join Session' }).click();

    // Verify both users are in the session
    await expect(pageA.getByText('userB joined the session')).toBeVisible();
    await expect(pageB.getByText('Connected to session')).toBeVisible();

    // Test code synchronization
    await pageA.getByRole('textbox', { name: 'Editor' }).fill('console.log("Hello");');
    await expect(pageB.getByRole('textbox', { name: 'Editor' })).toHaveValue('console.log("Hello");');
  });

  test('collaborative debugging', async ({ browser }) => {
    const [pageA, pageB] = await Promise.all([
      browser.newPage(),
      browser.newPage()
    ]);

    // Start debugging session
    await pageA.goto('/workspace');
    await pageA.getByRole('button', { name: 'Start Debug Session' }).click();
    const debugUrl = await pageA.getByRole('textbox', { name: 'Debug URL' }).inputValue();

    await pageB.goto(debugUrl);
    await pageB.getByRole('button', { name: 'Join Debug Session' }).click();

    // Set breakpoint
    await pageA.getByRole('button', { name: 'Set Breakpoint' }).click();
    await expect(pageB.getByText('Breakpoint set at line 5')).toBeVisible();

    // Verify shared debugging state
    await pageA.getByRole('button', { name: 'Continue' }).click();
    await expect(pageB.getByText('Execution paused at breakpoint')).toBeVisible();
  });
}); 