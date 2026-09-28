import { expect, test, type Page } from '@playwright/test'

async function addMugToCart(page: Page) {
  await page.goto('/products/harbor-mug')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  return page.getByRole('dialog', { name: /Your cart/ })
}

test.describe('cart drawer', () => {
  test('add to cart opens the drawer, moves focus in, and announces the count', async ({ page }) => {
    const drawer = await addMugToCart(page)
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Close cart' })).toBeFocused()
    await expect(drawer.getByRole('link', { name: 'Harbor Mug' })).toBeVisible()
    await expect(drawer.getByTestId('cart-subtotal')).toHaveText('$28.00')

    // The polite live region carries the new count for screen readers.
    await expect(page.getByRole('status').filter({ hasText: 'Added' })).toHaveText(
      'Added Harbor Mug, Sand / 8 oz, to your cart. Cart has 1 item.',
    )
    // The page behind the modal is inert.
    await expect(page.locator('#page')).toHaveAttribute('inert', '')
  })

  test('focus is trapped: Tab and Shift+Tab cycle inside the drawer', async ({ page }) => {
    const drawer = await addMugToCart(page)
    await expect(drawer.getByRole('button', { name: 'Close cart' })).toBeFocused()

    const focusInside = () => drawer.evaluate((el) => el.contains(document.activeElement))
    const seen = new Set<string>()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await focusInside()).toBe(true)
      seen.add(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? ''))
    }
    // Visited every control (close, product link, -, +, remove) and wrapped around.
    expect(seen.size).toBeGreaterThanOrEqual(5)

    await drawer.getByRole('button', { name: 'Close cart' }).focus()
    await page.keyboard.press('Shift+Tab')
    expect(await focusInside()).toBe(true)
    await expect(drawer.getByRole('button', { name: /^Remove/ })).toBeFocused()
  })

  test('Escape closes the drawer and returns focus to the opener', async ({ page }) => {
    const drawer = await addMugToCart(page)
    await expect(drawer.getByRole('button', { name: 'Close cart' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeFocused()
    await expect(page.locator('#page')).not.toHaveAttribute('inert')
  })

  test('quantity changes update the subtotal and the cart persists across reloads', async ({ page }) => {
    const drawer = await addMugToCart(page)
    await drawer.getByRole('button', { name: /^Increase quantity/ }).click()
    await expect(drawer.getByTestId('cart-subtotal')).toHaveText('$56.00')
    await page.keyboard.press('Escape')

    await page.reload()
    const cartButton = page.getByRole('button', { name: 'Cart, 2 items' })
    await expect(cartButton).toBeVisible()
    await cartButton.click()
    await expect(page.getByRole('dialog', { name: /Your cart/ }).getByTestId('cart-subtotal')).toHaveText('$56.00')
  })
})
