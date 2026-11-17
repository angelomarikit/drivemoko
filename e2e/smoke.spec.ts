import { test, expect } from '@playwright/test'

// Staging credentials required for full Phase 6 flows — not run in CI by default.

test.skip('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/Drive Moko/i)).toBeVisible()
})