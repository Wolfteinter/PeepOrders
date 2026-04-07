export type OrderStatus =
  | 'created'
  | 'in_queue'
  | 'printing'
  | 'printing_ready'
  | 'delivered';

export type OrderItemMode = 'existing' | 'new';

export interface PendingCatalogProduct {
  name: string;
  ownerId?: string;
  cost: number;
  category?: string | null;
  tags?: string[];
  quantity: number;
}

export interface OrderItem {
  description: string;
  price: number;
  productMode?: OrderItemMode;
  productId?: string;
  pendingCatalogProduct?: PendingCatalogProduct;
  catalogSyncedAt?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  items: OrderItem[];
  notes?: string;
  price: number;
  deliveryDate: string;
  deliveryPlace: string;
  createdBy: string;
  assignedTo: string;
  imageUrl?: string;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderInput {
  items: OrderItem[];
  notes?: string;
  deliveryDate: string;
  deliveryPlace: string;
  createdBy: string;
  assignedTo: string;
  status: OrderStatus;
}

export function calculateOrderPrice(items: OrderItem[]) {
  return items.reduce((total, item) => total + item.price, 0);
}

export const orderStatuses: OrderStatus[] = [
  'created',
  'in_queue',
  'printing',
  'printing_ready',
  'delivered',
];

export const statusLabelMap: Record<OrderStatus, string> = {
  created: 'Creada',
  in_queue: 'En cola',
  printing: 'Imprimiendo',
  printing_ready: 'Impresa y lista',
  delivered: 'Entregada',
};

export const statusHintMap: Record<OrderStatus, string> = {
  created: 'Tu pedido ya fue registrado.',
  in_queue: 'Estamos preparando tu pieza.',
  printing: 'Tu pedido esta en impresion.',
  printing_ready: 'La impresion termino y esta lista.',
  delivered: 'Pedido entregado.',
};
