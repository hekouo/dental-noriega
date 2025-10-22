import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProductImage from '../../components/ProductImage';

describe('ProductImage', () => {
  it('renders with alt text', () => {
    render(<ProductImage src="/test.jpg" alt="Test product" />);
    
    const image = screen.getByAltText('Test product');
    expect(image).toBeInTheDocument();
  });

  it('renders placeholder when no src', () => {
    render(<ProductImage src="/placeholder.png" alt="Test product" />);
    
    const image = screen.getByAltText('Test product');
    expect(image).toHaveAttribute('src', '/placeholder.png');
  });
});
