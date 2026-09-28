import { expect, test } from '@playwright/test'

test.describe('variant selection', () => {
  test('arrow keys move selection, update the price and the ?variant= URL', async ({ page }) => {
    await page.goto('/products/ember-soy-candle')
    const size = page.getByRole('radiogroup', { name: /^Size/ })
    const price = page.getByTestId('product-price')
    await expect(price).toContainText('$24.00')
    await expect(page).not.toHaveURL(/variant=/)

    // One tab stop per group: only the checked radio is focusable.
    await expect(size.getByRole('radio', { name: 'Small' })).toHaveAttribute('tabindex', '0')
    await expect(size.getByRole('radio', { name: 'Large' })).toHaveAttribute('tabindex', '-1')

    await size.getByRole('radio', { name: 'Small' }).focus()
    await page.keyboard.press('ArrowRight')

    const large = size.getByRole('radio', { name: 'Large' })
    await expect(large).toHaveAttribute('aria-checked', 'true')
    await expect(large).toBeFocused()
    await expect(price).toContainText('$38.00')
    await expect(page).toHaveURL(/\?variant=\d+$/)

    // The URL is a real deep link: reloading it renders the same variant server-side.
    await page.reload()
    await expect(page.getByRole('radiogroup', { name: /^Size/ }).getByRole('radio', { name: 'Large' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(page.getByTestId('product-price')).toContainText('$38.00')
  })

  test('arrow keys wrap, and Home / End jump to the ends', async ({ page }) => {
    await page.goto('/products/ember-soy-candle')
    const scent = page.getByRole('radiogroup', { name: /^Scent/ })
    await scent.getByRole('radio', { checked: true }).focus()
    await page.keyboard.press('ArrowLeft') // wraps from Cedar to Salt
    await expect(scent.getByRole('radio', { name: 'Salt' })).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Home')
    await expect(scent.getByRole('radio', { name: 'Cedar' })).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('End')
    await expect(scent.getByRole('radio', { name: 'Salt' })).toHaveAttribute('aria-checked', 'true')
  })

  test('sold-out and non-existent combinations are marked and cannot be bought', async ({ page }) => {
    await page.goto('/products/loom-cotton-tee')
    const color = page.getByRole('radiogroup', { name: /^Color/ })
    const size = page.getByRole('radiogroup', { name: /^Size/ })

    // Chalk / XS exists but is sold out.
    await expect(size.getByRole('radio', { name: 'XS, sold out' })).toBeVisible()
    await size.getByRole('radio', { name: /^XS/ }).click()
    await expect(page.getByRole('button', { name: 'Sold out' })).toBeDisabled()
    await expect(page.getByText('Chalk / XS is sold out')).toBeVisible()

    // Clay never comes in XS: choosing Clay snaps to an available size and says so.
    await color.getByRole('radio', { name: 'Clay' }).click()
    await expect(size.getByRole('radio', { name: 'XS, unavailable in this combination' })).toBeVisible()
    await expect(size.getByRole('radio', { name: 'S', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled()
  })
})
