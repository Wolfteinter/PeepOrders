import { type CatalogOwner, type Product } from '../types/product';

const PRODUCTS_API_URL = import.meta.env.VITE_PRODUCTS_API_URL?.trim();
const PEEPOS_API_KEY = import.meta.env.VITE_PEEPOS_API_KEY?.trim();
const PEEPOS_OWNER_ID = import.meta.env.VITE_PEEPOS_OWNER_ID?.trim();

const demoProducts: Product[] = [
  {
    id: '64047ff3-66ea-468b-96d5-675a77d3fc71',
    name: 'Amplificador',
    price: 250,
    cost: 0,
    image_url: null,
    owner_id: '2559d3b5-f733-44aa-bf87-a8f9e6e54c82',
    active: true,
    created_at: '2026-03-21T19:07:13.572254+00:00',
    track_stock: false,
    current_stock: 0,
    min_stock_alert: 0,
    category: 'Llaveros',
    tags: null,
    owner: {
      id: '2559d3b5-f733-44aa-bf87-a8f9e6e54c82',
      name: 'Espana',
      active: true,
      created_at: '2026-01-26T08:23:48.188398+00:00',
    },
    variants: [],
  },
  {
    id: '75945a21-f9c3-4f5c-8364-42d2bbf06f83',
    name: 'Angel Estatua Blanca',
    price: 120,
    cost: 0,
    image_url: null,
    owner_id: '2559d3b5-f733-44aa-bf87-a8f9e6e54c82',
    active: true,
    created_at: '2026-02-10T03:46:28.90808+00:00',
    track_stock: false,
    current_stock: 0,
    min_stock_alert: 0,
    category: null,
    tags: [],
    owner: {
      id: '2559d3b5-f733-44aa-bf87-a8f9e6e54c82',
      name: 'Espana',
      active: true,
      created_at: '2026-01-26T08:23:48.188398+00:00',
    },
    variants: [],
  },
];

const demoOwners: CatalogOwner[] = [
  {
    id: '82b6c444-c94d-463a-997e-eaf0ace21d5b',
    name: 'Alex',
    active: true,
    created_at: '2026-03-28T18:54:30.277765+00:00',
  },
  {
    id: '2559d3b5-f733-44aa-bf87-a8f9e6e54c82',
    name: 'Espana',
    active: true,
    created_at: '2026-01-26T08:23:48.188398+00:00',
  },
  {
    id: '42eb6c44-d5ec-4eca-bf76-e8c4f4d622fd',
    name: 'Jassiel',
    active: true,
    created_at: '2026-01-26T08:24:15.662894+00:00',
  },
  {
    id: 'cc6bf78d-aecc-4837-8f87-897692670ed4',
    name: 'Onder',
    active: true,
    created_at: '2026-01-26T08:23:35.640426+00:00',
  },
];

function normalizeProduct(raw: Record<string, unknown>): Product {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    name: String(raw.name ?? 'Producto sin nombre'),
    price: Number(raw.price ?? 0),
    cost: Number(raw.cost ?? 0),
    image_url: raw.image_url ? String(raw.image_url) : null,
    owner_id: String(raw.owner_id ?? ''),
    active: Boolean(raw.active ?? true),
    created_at: String(raw.created_at ?? ''),
    track_stock: Boolean(raw.track_stock ?? false),
    current_stock: Number(raw.current_stock ?? 0),
    min_stock_alert: Number(raw.min_stock_alert ?? 0),
    category: raw.category ? String(raw.category) : null,
    tags: Array.isArray(raw.tags) ? raw.tags.map((tag) => String(tag)) : null,
    owner:
      raw.owner && typeof raw.owner === 'object'
        ? {
            id: String((raw.owner as Record<string, unknown>).id ?? ''),
            name: String((raw.owner as Record<string, unknown>).name ?? ''),
            active: Boolean((raw.owner as Record<string, unknown>).active ?? true),
            created_at: String(
              (raw.owner as Record<string, unknown>).created_at ?? '',
            ),
          }
        : null,
    variants: Array.isArray(raw.variants)
      ? raw.variants.map((variant) => ({
          id:
            variant && typeof variant === 'object' && 'id' in variant
              ? String(variant.id)
              : undefined,
          name:
            variant && typeof variant === 'object' && 'name' in variant
              ? String(variant.name)
              : undefined,
          price:
            variant && typeof variant === 'object' && 'price' in variant
              ? Number(variant.price)
              : undefined,
        }))
      : [],
  };
}

function normalizeOwner(raw: Record<string, unknown>): CatalogOwner {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    name: String(raw.name ?? 'Sin nombre'),
    active: Boolean(raw.active ?? true),
    created_at: String(raw.created_at ?? ''),
  };
}

interface CreateProductInput {
  name: string;
  ownerId?: string;
  price: number;
  cost: number;
  category?: string | null;
  tags?: string[];
  trackStock?: boolean;
  currentStock?: number;
  minStockAlert?: number;
}

function getRequestHeaders() {
  return {
    accept: 'application/json',
    ...(PEEPOS_API_KEY ? { peepos_api_key: PEEPOS_API_KEY } : {}),
  };
}

export function getConfiguredProductOwnerId() {
  return PEEPOS_OWNER_ID || '';
}

export async function fetchProducts() {
  if (!PRODUCTS_API_URL) {
    throw new Error('Configura VITE_PRODUCTS_API_URL para cargar el catalogo.');
  }

  const response = await fetch(PRODUCTS_API_URL, {
    headers: getRequestHeaders(),
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar el catalogo (${response.status}).`);
  }

  const payload = (await response.json()) as { data?: Record<string, unknown>[] };
  const products = Array.isArray(payload.data)
    ? payload.data.map((item) => normalizeProduct(item))
    : [];

  return products.filter((product) => product.active);
}

export function getFallbackProducts() {
  return demoProducts;
}

export async function fetchOwners() {
  if (!PRODUCTS_API_URL) {
    throw new Error('Configura VITE_PRODUCTS_API_URL para cargar owners.');
  }

  const ownersUrl = PRODUCTS_API_URL.replace(/\/products\/?$/, '/owners');
  const response = await fetch(ownersUrl, {
    headers: getRequestHeaders(),
  });

  if (!response.ok) {
    throw new Error(`No se pudieron cargar los owners (${response.status}).`);
  }

  const payload = (await response.json()) as { data?: Record<string, unknown>[] };
  const owners = Array.isArray(payload.data)
    ? payload.data.map((item) => normalizeOwner(item))
    : [];

  return owners.filter((owner) => owner.active);
}

export function getFallbackOwners() {
  return demoOwners;
}

export async function createCatalogProduct(payload: CreateProductInput) {
  if (!PRODUCTS_API_URL) {
    throw new Error('Configura VITE_PRODUCTS_API_URL para crear productos.');
  }

  const ownerId = payload.ownerId || PEEPOS_OWNER_ID;
  if (!ownerId) {
    throw new Error(
      'No hay owner_id disponible. Configura VITE_PEEPOS_OWNER_ID o carga productos existentes primero.',
    );
  }

  const response = await fetch(PRODUCTS_API_URL, {
    method: 'POST',
    headers: {
      ...getRequestHeaders(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: payload.name,
      owner_id: ownerId,
      price: payload.price,
      cost: payload.cost,
      active: true,
      category: payload.category ?? 'Pedidos',
      tags: payload.tags ?? [],
      image_url: null,
      track_stock: payload.trackStock ?? false,
      current_stock: payload.currentStock ?? 0,
      min_stock_alert: payload.minStockAlert ?? payload.currentStock ?? 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo crear el producto (${response.status}).`);
  }

  const payloadData = (await response.json()) as {
    data?: Record<string, unknown>;
  } & Record<string, unknown>;
  const productData =
    payloadData.data && typeof payloadData.data === 'object'
      ? payloadData.data
      : payloadData;

  return normalizeProduct(productData);
}
