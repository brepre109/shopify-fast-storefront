import { expect, test } from '@playwright/test'

const cardTitles = (page: import('@playwright/test').Page) =>
  page.getByTestId('product-grid').getByRole('heading', { level: 3 }).allTextContents()

test.describe('collection page', () => {
  test('sorting and filtering update the grid and the URL', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('status').filter({ hasText: 'products' })).toHaveText('9 products')

    await page.getByLabel('Sort by').selectOption('price-ascending')
    await expect(page).toHaveURL(/sort_by=price-ascending/)
    await expect.poll(async () => (await cardTitles(page))[0]).toBe('Stoneware Bowl')

    await page.locator('summary', { hasText: 'Color' }).click()
    await page.getByRole('checkbox', { name: /Slate/ }).check()
    await expect(page).toHaveURL(/filter\.v\.option\.color=Slate/)
    await expect(page.getByRole('status').filter({ hasText: 'products' })).toHaveText('3 products')

    // Escape closes the open facet panel and returns focus to its toggle.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('checkbox', { name: /Slate/ })).toBeHidden()
    await expect(page.locator('summary', { hasText: 'Color' })).toBeFocused()

    await page.getByRole('link', { name: 'Remove filter Color: Slate' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'products' })).toHaveText('9 products')
    await expect(page).toHaveURL(/sort_by=price-ascending/)
  })

  test('filters work without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/collections/ceramics')
    await page.locator('summary', { hasText: 'Availability' }).click()
    await page.getByRole('checkbox', { name: /In stock/ }).check()
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page).toHaveURL(/filter\.v\.availability=1/)
    await expect(page.getByTestId('product-grid').getByRole('listitem')).toHaveCount(3)
    await context.close()
  })
})
