import React from 'react';
import renderer from 'react-test-renderer';
import ProductCard from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Americano',
    price: 10.00,
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
    const priceText = testInstance.findAllByType('Text').find(
      (node) => node.props.style?.marginTop === 4
    );
    expect(priceText?.children.join('')).toBe('RM 10.00');
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
