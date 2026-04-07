export interface ProductOwner {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface CatalogOwner {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id?: string;
  name?: string;
  price?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  image_url: string | null;
  owner_id: string;
  active: boolean;
  created_at: string;
  track_stock: boolean;
  current_stock: number;
  min_stock_alert: number;
  category: string | null;
  tags: string[] | null;
  owner: ProductOwner | null;
  variants: ProductVariant[];
}
