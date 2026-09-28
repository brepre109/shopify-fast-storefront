import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  // Print a readable summary on failure instead of a giant object diff.
  expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([])
}

test.describe('axe accessibility checks (WCAG 2.2 AA rules)', () => {
  test('collection page', async ({ page }) => {
    await page.goto('/')
    await expectNoViolations(page)
  })

  test('collection page with a filter panel open', async ({ page }) => {
    await page.goto('/collections/textiles')
    await page.locator('summary', { hasText: 'Size' }).click()
    await expect(page.getByRole('checkbox').first()).toBeVisible()
    await expectNoViolations(page)
  })

  test('product page with sold-out and unavailable variants', async ({ page }) => {
    await page.goto('/products/loom-cotton-tee')
    await page.getByRole('radio', { name: 'Clay' }).click()
    await expectNoViolations(page)
  })

  test('product page with the cart drawer open', async ({ page }) => {
    await page.goto('/products/ridge-wool-throw')
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.waitForTimeout(350) // wait for the slide-in so colours are final
    await expectNoViolations(page)
  })
})
