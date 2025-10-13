// src/lib/cart/types.ts

export type CartItem = {
  id: string;
  title: string;
  price: number;
  image?: string;
  imageResolved?: string;
  qty: number;
  sectionSlug?: string;
  slug?: string;
};

export type CartState = {
  items: CartItem[];
};

