import { test, expect } from '@playwright/test';

/**
 * E2E tests for Financial Core functionality
 * Tests the critical flow: Month Selection -> Common Expense Calculation -> Results Verification
 */

// Mock authentication helper
const mockLogin = async (page: any) => {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill login form with demo credentials
  await page.fill('[data-testid="email-input"]', 'demo@example.com');
  await page.fill('[data-testid="password-input"]', 'demo123');
  
  // Submit login
  await page.click('[data-testid="login-submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL(/dashboard/);
};

test.describe('Financial Core - Common Expenses Calculation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login for each test
    await mockLogin(page);
  });

  test('Complete flow: Select month -> Calculate common expenses -> Verify results', async ({ page }) => {
    // Step 1: Navigate to Financial Management
    await page.click('[data-testid="nav-financial"]');
    await page.waitForURL(/financial/);
    
    // Verify we're on the financial page
    await expect(page.locator('h1')).toContainText(['Οικονομικά', 'Financial']);

    // Step 2: Select specific month (August 2025)
    await page.click('[data-testid="month-selector"]');
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    
    // Wait for month selection to be processed
    await page.waitForTimeout(1000);

    // Step 3: Trigger common expenses calculation
    await page.click('[data-testid="calculate-common-expenses"]');
    
    // Wait for calculation to complete (might take a few seconds)
    await page.waitForLoadState('networkidle');
    
    // Verify calculation started - loading indicator should appear
    await expect(page.locator('[data-testid="calculation-loading"]')).toBeVisible();
    
    // Wait for calculation to complete - results should appear
    await page.waitForSelector('[data-testid="calculation-results"]', { timeout: 30000 });

    // Step 4: Verify calculation results are displayed
    const resultsContainer = page.locator('[data-testid="calculation-results"]');
    await expect(resultsContainer).toBeVisible();
    
    // Verify apartments list is displayed
    const apartmentsList = page.locator('[data-testid="apartments-list"]');
    await expect(apartmentsList).toBeVisible();
    
    // Verify at least one apartment is shown
    const firstApartment = apartmentsList.locator('[data-testid^="apartment-"]').first();
    await expect(firstApartment).toBeVisible();

    // Step 5: Verify apartment details contain expected elements
    await expect(firstApartment.locator('[data-testid="apartment-number"]')).toBeVisible();
    await expect(firstApartment.locator('[data-testid="previous-balance"]')).toBeVisible();
    await expect(firstApartment.locator('[data-testid="expense-distributions"]')).toBeVisible();
    await expect(firstApartment.locator('[data-testid="reserve-fund-contribution"]')).toBeVisible();

    // Step 6: Verify financial totals are displayed
    const totalsSection = page.locator('[data-testid="financial-totals"]');
    await expect(totalsSection).toBeVisible();
    
    await expect(totalsSection.locator('[data-testid="total-expenses"]')).toBeVisible();
    await expect(totalsSection.locator('[data-testid="total-reserve-fund"]')).toBeVisible();
    
    // Step 7: Verify amounts are properly formatted (Greek locale)
    const firstExpenseAmount = firstApartment.locator('[data-testid="expense-amount"]').first();
    await expect(firstExpenseAmount).toContainText(/€/); // Contains Euro symbol
    
    // Step 8: Test month switching preserves functionality
    await page.selectOption('[data-testid="month-selector"]', '2025-07');
    await page.click('[data-testid="calculate-common-expenses"]');
    
    // Results should update for new month
    await page.waitForSelector('[data-testid="calculation-results"]', { timeout: 30000 });
    await expect(resultsContainer).toBeVisible();
  });

  test('Expense distribution algorithms verification', async ({ page }) => {
    // Navigate to financial page
    await page.goto('/financial');
    
    // Select a month with known test data
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    
    // Calculate common expenses
    await page.click('[data-testid="calculate-common-expenses"]');
    await page.waitForSelector('[data-testid="calculation-results"]');

    // Verify different distribution methods are shown
    const expenseDistributions = page.locator('[data-testid="expense-distributions"]');
    await expect(expenseDistributions).toBeVisible();
    
    // Check for different distribution method labels
    const distributionItems = expenseDistributions.locator('[data-testid="distribution-item"]');
    const count = await distributionItems.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Verify distribution details are shown for first item
    const firstDistribution = distributionItems.first();
    await expect(firstDistribution.locator('[data-testid="expense-description"]')).toBeVisible();
    await expect(firstDistribution.locator('[data-testid="expense-amount"]')).toBeVisible();
    await expect(firstDistribution.locator('[data-testid="distribution-method"]')).toBeVisible();
  });

  test('Balance transfer scenarios', async ({ page }) => {
    // Navigate to financial page
    await page.goto('/financial');
    
    // Calculate for current period
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    await page.click('[data-testid="calculate-common-expenses"]');
    await page.waitForSelector('[data-testid="calculation-results"]');

    // Find apartments with different balance scenarios
    const apartments = page.locator('[data-testid^="apartment-"]');
    const apartmentCount = await apartments.count();
    
    expect(apartmentCount).toBeGreaterThan(0);
    
    // Verify balance transfer is shown
    for (let i = 0; i < Math.min(apartmentCount, 3); i++) {
      const apartment = apartments.nth(i);
      
      // Previous balance should be displayed
      const previousBalance = apartment.locator('[data-testid="previous-balance"]');
      await expect(previousBalance).toBeVisible();
      
      // Balance amount should be formatted as currency
      const balanceText = await previousBalance.textContent();
      expect(balanceText).toMatch(/[+-]?\d+[,.]?\d*\s*€/);
      
      // New charges should be shown
      const newCharges = apartment.locator('[data-testid="new-charges"]');
      await expect(newCharges).toBeVisible();
      
      // Total new obligations should be calculated
      const totalObligations = apartment.locator('[data-testid="total-obligations"]');
      await expect(totalObligations).toBeVisible();
    }
  });

  test('Reserve fund calculations', async ({ page }) => {
    // Navigate to financial page
    await page.goto('/financial');
    
    // Calculate common expenses
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    await page.click('[data-testid="calculate-common-expenses"]');
    await page.waitForSelector('[data-testid="calculation-results"]');

    // Verify reserve fund section
    const reserveFundSection = page.locator('[data-testid="reserve-fund-section"]');
    await expect(reserveFundSection).toBeVisible();
    
    // Check monthly total reserve fund contribution
    const monthlyTotal = page.locator('[data-testid="reserve-fund-monthly-total"]');
    await expect(monthlyTotal).toBeVisible();
    await expect(monthlyTotal).toContainText('€');
    
    // Verify individual apartment contributions
    const apartments = page.locator('[data-testid^="apartment-"]');
    const firstApartment = apartments.first();
    
    const reserveContribution = firstApartment.locator('[data-testid="reserve-fund-contribution"]');
    await expect(reserveContribution).toBeVisible();
    await expect(reserveContribution).toContainText('€');
  });

  test('Error handling for invalid scenarios', async ({ page }) => {
    // Navigate to financial page
    await page.goto('/financial');
    
    // Test with future month (should have no expenses)
    await page.selectOption('[data-testid="month-selector"]', '2025-12');
    await page.click('[data-testid="calculate-common-expenses"]');
    await page.waitForSelector('[data-testid="calculation-results"]');
    
    // Should show results but with no expenses
    const resultsContainer = page.locator('[data-testid="calculation-results"]');
    await expect(resultsContainer).toBeVisible();
    
    // Should show message about no expenses for this period
    const noExpensesMessage = page.locator('[data-testid="no-expenses-message"]');
    await expect(noExpensesMessage).toBeVisible();
    
    // But apartments should still be listed with previous balances
    const apartments = page.locator('[data-testid^="apartment-"]');
    const apartmentCount = await apartments.count();
    expect(apartmentCount).toBeGreaterThan(0);
  });

  test('Greek language and currency formatting', async ({ page }) => {
    // Navigate to financial page
    await page.goto('/financial');
    
    // Calculate common expenses
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    await page.click('[data-testid="calculate-common-expenses"]');
    await page.waitForSelector('[data-testid="calculation-results"]');

    // Verify Greek apartment numbers are displayed correctly
    const apartments = page.locator('[data-testid^="apartment-"]');
    const apartmentNumbers = apartments.locator('[data-testid="apartment-number"]');
    
    const firstNumber = await apartmentNumbers.first().textContent();
    
    // Should handle both Greek (Α1, Β2) and Latin (A1, B2) apartment numbers
    expect(firstNumber).toMatch(/^[ΑΒΓΔΑαβγδA-Z]\d+$/);
    
    // Verify currency formatting uses Euro symbol
    const expenseAmounts = page.locator('[data-testid="expense-amount"]');
    const firstAmount = await expenseAmounts.first().textContent();
    expect(firstAmount).toContain('€');
    
    // Verify decimal separator (Greek uses comma)
    if (firstAmount && firstAmount.includes(',')) {
      expect(firstAmount).toMatch(/\d+,\d{2}\s*€/);
    }
  });

  test('Responsive design verification', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to financial page
    await page.goto('/financial');
    
    // Calculate common expenses
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    await page.click('[data-testid="calculate-common-expenses"]');
    await page.waitForSelector('[data-testid="calculation-results"]');
    
    // Verify mobile-friendly layout
    const resultsContainer = page.locator('[data-testid="calculation-results"]');
    await expect(resultsContainer).toBeVisible();
    
    // Apartments should be displayed in mobile-friendly format (likely stacked)
    const apartments = page.locator('[data-testid^="apartment-"]');
    await expect(apartments.first()).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Results should still be visible and properly formatted
    await expect(resultsContainer).toBeVisible();
    await expect(apartments.first()).toBeVisible();
  });
});

test.describe('Financial Core - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
  });

  test('Performance with large number of apartments', async ({ page }) => {
    // Navigate to financial page
    await page.goto('/financial');
    
    // Select month and calculate
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    
    // Measure calculation time
    const startTime = Date.now();
    await page.click('[data-testid="calculate-common-expenses"]');
    await page.waitForSelector('[data-testid="calculation-results"]');
    const endTime = Date.now();
    
    const calculationTime = endTime - startTime;
    
    // Should complete within reasonable time (30 seconds max)
    expect(calculationTime).toBeLessThan(30000);
    
    // Verify results are displayed
    const apartments = page.locator('[data-testid^="apartment-"]');
    const apartmentCount = await apartments.count();
    expect(apartmentCount).toBeGreaterThan(0);
  });

  test('Network interruption handling', async ({ page }) => {
    // Navigate to financial page
    await page.goto('/financial');
    
    // Start calculation
    await page.selectOption('[data-testid="month-selector"]', '2025-08');
    await page.click('[data-testid="calculate-common-expenses"]');
    
    // Simulate network interruption
    await page.route('**/api/financial/**', route => route.abort());
    
    // Should show error message
    const errorMessage = page.locator('[data-testid="network-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Retry button should be available
    const retryButton = page.locator('[data-testid="retry-calculation"]');
    await expect(retryButton).toBeVisible();
    
    // Clear network interruption
    await page.unroute('**/api/financial/**');
    
    // Retry should work
    await retryButton.click();
    await page.waitForSelector('[data-testid="calculation-results"]');
    await expect(page.locator('[data-testid="calculation-results"]')).toBeVisible();
  });
});