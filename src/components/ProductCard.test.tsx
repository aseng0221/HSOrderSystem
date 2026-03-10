import React from 'react';
import renderer from 'react-test-renderer';
import ProductCard from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Americano',
    price: 'RM 10.00',
    image: 'https://example.com/image.jpg',
    tag: 'Best Seller',
  };

  it('renders correctly with all props', () => {
    const tree = renderer
      .create(<ProductCard product={mockProduct} onPress={() => {}} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders product name and price', () => {
    const testRenderer = renderer.create(
      <ProductCard product={mockProduct} onPress={() => {}} />,
    );
    const testInstance = testRenderer.root;

    expect(testInstance.findByProps({children: 'Americano'})).toBeTruthy();
    expect(testInstance.findByProps({children: 'RM 10.00'})).toBeTruthy();
  });

  it('renders tag when provided', () => {
    const testRenderer = renderer.create(
      <ProductCard product={mockProduct} onPress={() => {}} />,
    );
    const testInstance = testRenderer.root;
    expect(testInstance.findByProps({children: 'Best Seller'})).toBeTruthy();
  });

  it('does not render tag when not provided', () => {
    const productWithoutTag = {...mockProduct, tag: undefined};
    const testRenderer = renderer.create(
      <ProductCard product={productWithoutTag} onPress={() => {}} />,
    );
    const testInstance = testRenderer.root;

    // Attempting to find the tag text should fail
    const tags = testInstance.findAllByProps({children: 'Best Seller'});
    expect(tags.length).toBe(0);
  });
});
