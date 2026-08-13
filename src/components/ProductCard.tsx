import React from 'react';
import {TouchableOpacity, View, Image, Text, StyleSheet} from 'react-native';
import {Colors} from '../theme';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: string;
    image?: string;
    tag?: string;
  };
  onPress: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({product, onPress}) => {
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      <View style={styles.productImageContainer}>
        <View style={styles.circleBg} />
        <Image
          source={{
            uri: product.image || 'https://via.placeholder.com/150',
            cache: 'force-cache',
          }}
          style={styles.image}
          resizeMode="contain"
        />
        {product.tag ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{product.tag}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.productTitle} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.productPrice}>{product.price}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    flex: 1,
    margin: 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  circleBg: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    backgroundColor: '#F7F8FA',
    borderRadius: 999,
  },
  image: {
    width: '80%',
    height: '80%',
    borderRadius: 999,
  },
  tagBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tagText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#334975',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    height: 38,
  },
  productPrice: {
    color: '#333',
    marginTop: 4,
  },
});

export default ProductCard;
