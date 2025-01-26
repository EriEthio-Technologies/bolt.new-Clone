import { test, expect } from '@playwright/test';

test.describe('Code Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
  });

  test('basic editor functionality', async ({ page }) => {
    // Test file creation
    await page.getByRole('button', { name: 'New File' }).click();
    await page.getByLabel('File name').fill('test.ts');
    await page.getByRole('button', { name: 'Create' }).click();

    // Test code editing
    const editor = page.getByRole('textbox', { name: 'Editor' });
    await editor.fill('function test() {\n  return true;\n}');
    
    // Test syntax highlighting
    const syntaxHighlighting = await page.getByTestId('editor-content').innerHTML();
    expect(syntaxHighlighting).toContain('class="function"');
    expect(syntaxHighlighting).toContain('class="keyword"');

    // Test file saving
    await page.keyboard.press('Control+S');
    await expect(page.getByText('File saved')).toBeVisible();
  });

  test('file tree navigation', async ({ page }) => {
    // Create test files
    await page.getByRole('button', { name: 'New File' }).click();
    await page.getByLabel('File name').fill('index.ts');
    await page.getByRole('button', { name: 'Create' }).click();

    await page.getByRole('button', { name: 'New File' }).click();
    await page.getByLabel('File name').fill('utils.ts');
    await page.getByRole('button', { name: 'Create' }).click();

    // Test file tree interaction
    await page.getByRole('treeitem', { name: 'utils.ts' }).click();
    await expect(page.getByRole('tab', { name: 'utils.ts' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'utils.ts' })).toHaveAttribute('aria-selected', 'true');

    // Test file deletion
    await page.getByRole('treeitem', { name: 'utils.ts' }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('treeitem', { name: 'utils.ts' })).not.toBeVisible();
  });

  test('keyboard shortcuts', async ({ page }) => {
    await page.getByRole('button', { name: 'New File' }).click();
    await page.getByLabel('File name').fill('test.ts');
    await page.getByRole('button', { name: 'Create' }).click();

    const editor = page.getByRole('textbox', { name: 'Editor' });
    await editor.focus();

    // Test save shortcut
    await editor.fill('let x = 1;');
    await page.keyboard.press('Control+S');
    await expect(page.getByText('File saved')).toBeVisible();

    // Test find shortcut
    await page.keyboard.press('Control+F');
    await expect(page.getByRole('searchbox', { name: 'Find' })).toBeVisible();

    // Test multiple cursor
    await page.keyboard.down('Alt');
    await page.mouse.click(100, 100);
    await page.mouse.click(100, 120);
    await page.keyboard.up('Alt');
    
    const cursors = await page.evaluate(() => {
      return document.querySelectorAll('.cursor').length;
    });
    expect(cursors).toBe(2);
  });
}); 