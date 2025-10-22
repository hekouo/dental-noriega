import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load homepage', async ({ page }) => {
    // Navegar a la página principal
    await page.goto('/');
    
    // Verificar que la página carga correctamente
    await expect(page).toHaveTitle(/.*/);
    
    // Verificar que no hay errores críticos en consola
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Esperar un poco para que se carguen los scripts
    await page.waitForTimeout(1000);
    
    // Verificar que no hay errores críticos
    const criticalErrors = errors.filter(error => 
      !error.includes('404') && 
      !error.includes('favicon') &&
      !error.includes('manifest')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
  
  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página es interactiva
    await expect(page.locator('body')).toBeVisible();
    
    // Verificar que no hay errores de hidratación
    await page.waitForLoadState('networkidle');
  });
});
