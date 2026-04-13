import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { normalizeOrderCode } from '../lib/orderCode';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  calculateOrderPrice,
  type Order,
  type OrderInput,
  type OrderItem,
} from '../types/order';

const STORAGE_KEY = 'peepo-orders';

const demoOrders: Order[] = [
  {
    id: 'demo-1',
    orderCode: '2401',
    items: [
      {
        description: 'Figura personalizada de Peepo con base acrilica',
        price: 420,
      },
      {
        description: 'Acabado mate en verde bosque',
        price: 100,
      },
    ],
    notes: 'Recoger con identificacion y revisar color final antes de salir.',
    price: 520,
    deliveryDate: '2026-03-21',
    deliveryPlace: 'Monterrey, Nuevo Leon',
    createdBy: 'admin@peepolabs.com',
    assignedTo: 'Ondrej',
    status: 'in_queue',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    orderCode: '2402',
    items: [
      {
        description: 'Sticker pack verde mate para evento',
        price: 120,
      },
      {
        description: 'Corte individual por pieza',
        price: 60,
      },
    ],
    price: 180,
    deliveryDate: '2026-03-18',
    deliveryPlace: 'CDMX, Roma Norte',
    createdBy: 'admin@peepolabs.com',
    assignedTo: 'Produccion',
    status: 'printing_ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function normalizePrice(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : 0;
}

function normalizeNonNegativeNumber(value: unknown, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Number(amount) : fallback;
}

function normalizeTags(tags: unknown) {
  return Array.isArray(tags)
    ? tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
}

function normalizeItems(
  items: unknown,
  legacyDescription?: unknown,
  legacyPrice?: unknown,
): OrderItem[] {
  const fallbackPrice = normalizePrice(legacyPrice);
  const rawItems = Array.isArray(items)
    ? items
    : typeof legacyDescription === 'string' && legacyDescription.trim()
      ? [legacyDescription]
      : [];

  const rawNormalizedItems = rawItems.map((item, index) => {
      if (typeof item === 'string') {
        const description = item.trim();
        if (!description) {
          return null;
        }

        return {
          description,
          price: index === 0 ? fallbackPrice : 0,
        } satisfies OrderItem;
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const description = String(
        'description' in item ? item.description : '',
      ).trim();

      if (!description) {
        return null;
      }

      const price =
        'price' in item
          ? normalizePrice(item.price)
          : index === 0
            ? fallbackPrice
            : 0;

      const productMode =
        'productMode' in item &&
        (item.productMode === 'existing' || item.productMode === 'new')
          ? item.productMode
          : undefined;
      const productId =
        'productId' in item && item.productId
          ? String(item.productId)
          : undefined;
      const catalogSyncedAt =
        'catalogSyncedAt' in item && item.catalogSyncedAt
          ? String(item.catalogSyncedAt)
          : undefined;
      const pendingCatalogProduct: OrderItem['pendingCatalogProduct'] =
        'pendingCatalogProduct' in item &&
        item.pendingCatalogProduct &&
        typeof item.pendingCatalogProduct === 'object'
          ? {
              name: String(
                (item.pendingCatalogProduct as Record<string, unknown>).name ??
                  description,
              ).trim(),
              ...((item.pendingCatalogProduct as Record<string, unknown>).ownerId
                ? {
                    ownerId: String(
                      (item.pendingCatalogProduct as Record<string, unknown>).ownerId,
                    ),
                  }
                : {}),
              cost: normalizeNonNegativeNumber(
                (item.pendingCatalogProduct as Record<string, unknown>).cost,
              ),
              category:
                (item.pendingCatalogProduct as Record<string, unknown>).category
                  ? String(
                      (item.pendingCatalogProduct as Record<string, unknown>)
                        .category,
                    )
                  : null,
              tags: normalizeTags(
                (item.pendingCatalogProduct as Record<string, unknown>).tags,
              ),
              quantity: normalizeNonNegativeNumber(
                (item.pendingCatalogProduct as Record<string, unknown>).quantity,
                1,
              ),
            }
          : undefined;

      return {
        description,
        price,
        ...(productMode ? { productMode } : {}),
        ...(productId ? { productId } : {}),
        ...(pendingCatalogProduct ? { pendingCatalogProduct } : {}),
        ...(catalogSyncedAt ? { catalogSyncedAt } : {}),
      } satisfies OrderItem;
    });
  const normalizedItems = rawNormalizedItems.filter(
    (item): item is OrderItem => item !== null,
  );

  if (!normalizedItems.length && fallbackPrice > 0) {
    return [
      {
        description: 'Pedido migrado',
        price: fallbackPrice,
      },
    ];
  }

  if (
    fallbackPrice > 0 &&
    normalizedItems.length > 0 &&
    calculateOrderPrice(normalizedItems) === 0
  ) {
    return normalizedItems.map((item, index): OrderItem =>
      index === 0
        ? {
            ...item,
            price: fallbackPrice,
          }
        : item,
    );
  }

  return normalizedItems;
}

function normalizeStoredOrder(order: Record<string, unknown>): Order {
  const items = normalizeItems(order.items, order.description, order.price);

  return {
    id: String(order.id ?? crypto.randomUUID()),
    orderCode: normalizeOrderCode(String(order.orderCode ?? '')),
    items,
    notes: order.notes ? String(order.notes) : undefined,
    price: calculateOrderPrice(items),
    deliveryDate: String(order.deliveryDate ?? ''),
    deliveryPlace: String(order.deliveryPlace ?? ''),
    createdBy: String(order.createdBy ?? ''),
    assignedTo: String(order.assignedTo ?? ''),
    imageUrl: order.imageUrl ? String(order.imageUrl) : undefined,
    status: (order.status as Order['status']) ?? 'created',
    createdAt: order.createdAt ? String(order.createdAt) : undefined,
    updatedAt: order.updatedAt ? String(order.updatedAt) : undefined,
  };
}

function readLocalOrders() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoOrders));
    return demoOrders;
  }

  const parsedOrders = JSON.parse(stored) as Record<string, unknown>[];
  const normalizedOrders = parsedOrders.map((order) => normalizeStoredOrder(order));

  if (JSON.stringify(parsedOrders) !== JSON.stringify(normalizedOrders)) {
    saveLocalOrders(normalizedOrders);
  }

  return normalizedOrders;
}

function saveLocalOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function generateOrderCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizeOrderInput(payload: OrderInput) {
  const { notes, items, ...rest } = payload;
  const normalizedItems = normalizeItems(items);

  return {
    ...rest,
    items: normalizedItems,
    price: calculateOrderPrice(normalizedItems),
    ...(notes ? { notes } : {}),
  };
}

function mapFirestoreOrder(
  id: string,
  data: Record<string, unknown>,
): Order {
  const createdAt =
    typeof data.createdAt === 'object' &&
    data.createdAt !== null &&
    'toDate' in data.createdAt
      ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
      : data.createdAt
        ? String(data.createdAt)
        : undefined;

  const updatedAt =
    typeof data.updatedAt === 'object' &&
    data.updatedAt !== null &&
    'toDate' in data.updatedAt
      ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
      : data.updatedAt
        ? String(data.updatedAt)
        : undefined;

  const items = normalizeItems(data.items, data.description, data.price);

  return {
    id,
    orderCode: normalizeOrderCode(String(data.orderCode ?? '')),
    items,
    notes: data.notes ? String(data.notes) : undefined,
    price: calculateOrderPrice(items),
    deliveryDate: String(data.deliveryDate ?? ''),
    deliveryPlace: String(data.deliveryPlace ?? ''),
    createdBy: String(data.createdBy ?? ''),
    assignedTo: String(data.assignedTo ?? ''),
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    status: (data.status as Order['status']) ?? 'created',
    createdAt,
    updatedAt,
  };
}

export function listenToOrders(
  onChange: (orders: Order[]) => void,
  onError?: (error: Error) => void,
) {
  if (!isFirebaseConfigured || !db) {
    onChange(readLocalOrders());
    return () => undefined;
  }

  const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const orders = snapshot.docs.map((item) =>
        mapFirestoreOrder(item.id, item.data()),
      );
      onChange(orders);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function getOrderByCode(orderCode: string) {
  const code = normalizeOrderCode(orderCode);
  if (!code) {
    return null;
  }

  if (!isFirebaseConfigured || !db) {
    return (
      readLocalOrders().find(
        (order) => normalizeOrderCode(order.orderCode) === code,
      ) ?? null
    );
  }

  const numericQuery = query(
    collection(db, 'orders'),
    where('orderCode', '==', code),
    limit(1),
  );
  const numericSnapshot = await getDocs(numericQuery);
  const numericMatch = numericSnapshot.docs[0];

  if (numericMatch) {
    return mapFirestoreOrder(numericMatch.id, numericMatch.data());
  }

  const legacyQuery = query(
    collection(db, 'orders'),
    where('orderCode', '==', `PEEPO-${code}`),
    limit(1),
  );
  const legacySnapshot = await getDocs(legacyQuery);
  const legacyMatch = legacySnapshot.docs[0];

  return legacyMatch ? mapFirestoreOrder(legacyMatch.id, legacyMatch.data()) : null;
}

export async function createOrder(payload: OrderInput) {
  const now = new Date().toISOString();
  const orderCode = generateOrderCode();
  const sanitizedPayload = sanitizeOrderInput(payload);

  if (!isFirebaseConfigured || !db) {
    const orders = readLocalOrders();
    const order: Order = {
      id: crypto.randomUUID(),
      orderCode,
      ...sanitizedPayload,
      createdAt: now,
      updatedAt: now,
    };

    saveLocalOrders([order, ...orders]);
    return order;
  }

  const docRef = await addDoc(collection(db, 'orders'), {
    ...sanitizedPayload,
    orderCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    orderCode,
    ...sanitizedPayload,
    createdAt: now,
    updatedAt: now,
  } as Order;
}

export async function updateOrder(orderId: string, payload: OrderInput) {
  const now = new Date().toISOString();

  if (!isFirebaseConfigured || !db) {
    const sanitizedPayload = sanitizeOrderInput(payload);
    const orders = readLocalOrders().map((order) =>
      order.id === orderId
        ? {
            ...order,
            ...sanitizedPayload,
            updatedAt: now,
          }
        : order,
    );

    saveLocalOrders(orders);
    return;
  }

  const sanitizedPayload = sanitizeOrderInput(payload);

  await updateDoc(doc(db, 'orders', orderId), {
    ...sanitizedPayload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOrder(orderId: string) {
  if (!isFirebaseConfigured || !db) {
    const orders = readLocalOrders().filter((order) => order.id !== orderId);
    saveLocalOrders(orders);
    return;
  }

  await deleteDoc(doc(db, 'orders', orderId));
}
