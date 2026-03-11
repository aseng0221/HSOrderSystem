import {useState, useEffect} from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from '@react-native-firebase/firestore';
import {db} from '../services/firebase';

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface ProductOption {
  id: string;
  name: string;
  price?: number; // Added price (e.g., +0.90)
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  type: 'pick_one' | 'multi_select' | 'boolean';
  maxSelections?: number;
  options: ProductOption[];
}

export interface ProductIngredient {
  id: string;
  name: string;
  image?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  tag: string;
  price: string; // Base price as string (e.g., "RM 11.20")
  order: number;
  image?: string;
  description?: string;
  ingredients?: ProductIngredient[];
  nutritionInfo?: string; // e.g. "90% real grape"
  globalOptions?: string[]; // IDs of global option groups (Option B)
}

export const useMenuViewModel = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [globalOptions, setGlobalOptions] = useState<ProductOptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    // Subscribe to categories
    const categoriesQuery = query(
      collection(db, 'categories'),
      orderBy('order', 'asc'),
    );
    const unsubscribeCategories = onSnapshot(
      categoriesQuery,
      querySnapshot => {
        const catList: Category[] = [];
        querySnapshot.forEach((doc: any) => {
          catList.push({
            id: doc.id,
            ...doc.data(),
          } as Category);
        });
        setCategories(catList);
      },
      err => {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      },
    );

    // Subscribe to products
    const productsCollection = collection(db, 'products');
    const unsubscribeProducts = onSnapshot(
      productsCollection,
      querySnapshot => {
        const prodList: Product[] = [];
        querySnapshot.forEach((doc: any) => {
          prodList.push({
            id: doc.id,
            ...doc.data(),
          } as Product);
        });

        // Local sorting: order (asc), then name (asc)
        const sortedProds = prodList.sort((a, b) => {
          if (a.order !== b.order) {
            return (a.order || 0) - (b.order || 0);
          }
          return a.name.localeCompare(b.name);
        });

        setProducts(sortedProds);
        setLoading(false);
      },
      err => {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
        setLoading(false);
      },
    );

    // Subscribe to global options
    const globalOptionsQuery = collection(db, 'global_options');
    const unsubscribeGlobal = onSnapshot(
      globalOptionsQuery,
      querySnapshot => {
        const optionList: ProductOptionGroup[] = [];
        querySnapshot.forEach((doc: any) => {
          optionList.push({
            id: doc.id,
            ...doc.data(),
          } as ProductOptionGroup);
        });
        setGlobalOptions(optionList);
      },
      err => {
        console.error('Error fetching global options:', err);
      },
    );

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
      unsubscribeGlobal();
    };
  }, []);

  return {
    categories,
    products,
    globalOptions,
    loading,
    error,
  };
};
