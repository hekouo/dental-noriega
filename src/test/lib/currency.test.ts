import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../lib/utils/currency';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(100)).toBe('$100.00 MXN');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00 MXN');
  });

  it('handles invalid numbers', () => {
    expect(formatCurrency(NaN)).toBe('Precio a consultar');
    expect(formatCurrency(-10)).toBe('Precio a consultar');
  });
});
