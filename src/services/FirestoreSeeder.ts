import {
  collection,
  doc,
  setDoc,
  addDoc,
} from '@react-native-firebase/firestore';
import {db} from './firebase';
import {MOCK_BRANCHES} from '../constants/branches';

interface ProductIngredient {
  id: string;
  name: string;
}

interface Product {
  categoryId: string;
  name: string;
  tag: string;
  price: string;
  order: number;
  image?: string;
  description?: string;
  nutritionInfo?: string;
  ingredients?: ProductIngredient[];
  globalOptions?: string[];
}

export const seedMenuData = async () => {
  try {
    const categoriesCol = collection(db, 'categories');
    const productsCol = collection(db, 'products');

    // 1. Add Categories
    const categories = [
      {id: 'lepak', name: 'Lepak & Moreh', icon: 'coffee', order: 1},
      {id: 'tea', name: 'ZUS Tea Series', icon: 'tea', order: 2},
      {id: 'bb', name: 'ZUS BB', icon: 'bottle-wine-outline', order: 3},
      {id: 'grape', name: 'Grape Series', icon: 'fruit-grapes', order: 4},
      {id: 'meowtcha', name: 'Meowtcha Series', icon: 'cat', order: 5},
      {id: 'picks', name: 'Top Picks', icon: 'heart-outline', order: 6},
      {id: 'ceo', name: 'CEO Series', icon: 'account-tie-outline', order: 7},
    ];

    for (const cat of categories) {
      await setDoc(doc(db, 'categories', cat.id), {
        name: cat.name,
        icon: cat.icon,
        order: cat.order,
      });
    }

    // 2. Add Products
    const products: Product[] = [
      {
        categoryId: 'lepak',
        name: 'CEO Chocolate',
        tag: 'RICH & KAW',
        price: 'RM 13.90',
        order: 1,
      },
      {
        categoryId: 'lepak',
        name: 'Iced Buttercrème Latté',
        tag: 'BUTTERY BLISS',
        price: 'RM 11.20',
        order: 2,
      },
      {
        categoryId: 'lepak',
        name: 'Burnt Cheese Cake',
        tag: 'MOST ORDERED',
        price: 'RM 15.00',
        order: 3,
      },
      {
        categoryId: 'lepak',
        name: 'Signature Latté',
        tag: 'BESTSELLER',
        price: 'RM 10.90',
        order: 3,
      },
      {
        categoryId: 'tea',
        name: 'ZUS Tea - Peach',
        tag: 'REFRESHING',
        price: 'RM 6.80',
        order: 1,
      },
      {
        categoryId: 'grape',
        name: 'Grape Americano',
        tag: 'MUST TRY',
        price: 'RM 4.90',
        order: 1,
        image: 'https://img.zuscoffee.com/zuscoffee/menu/Grape-Americano.png',
        description:
          'Say hello to your new favourite Americano! Bold espresso meets sweet, juicy grape made from real grape with 90% ...',
        nutritionInfo: '90% real grape',
        ingredients: [
          {id: 'esp', name: 'Espresso'},
          {id: 'grp', name: 'Grape'},
          {id: 'boba', name: 'Crystal Boba'},
          {id: 'lem', name: 'Lemon'},
        ],
        globalOptions: [], // Will be filled via Admin app
      },
    ];

    for (const prod of products) {
      await addDoc(productsCol, prod);
    }

    return {success: true};
  } catch (error) {
    console.error('Error seeding data:', error);
    return {success: false, error};
  }
};

export const seedBranchesData = async () => {
  try {
    const branchesCol = collection(db, 'branches');
    for (const branch of MOCK_BRANCHES) {
      await setDoc(doc(db, 'branches', branch.id), branch);
    }
    return {success: true};
  } catch (error) {
    console.error('Error seeding branches:', error);
    return {success: false, error};
  }
};
