import { describe, it, expect } from 'vitest';
import { ROUTES } from '../../lib/routes';

describe('ROUTES', () => {
  it('contains expected routes', () => {
    expect(ROUTES.home()).toBe('/');
    expect(ROUTES.catalogIndex()).toBe('/catalogo');
    expect(ROUTES.carrito()).toBe('/carrito');
    expect(ROUTES.cuenta()).toBe('/account');
    expect(ROUTES.destacados()).toBe('/destacados');
  });
});
