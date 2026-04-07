import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchOwners,
  fetchProducts,
  getFallbackOwners,
  getConfiguredProductOwnerId,
} from '../services/productService';
import {
  calculateOrderPrice,
  orderStatuses,
  statusLabelMap,
  type Order,
  type OrderInput,
} from '../types/order';
import { type CatalogOwner, type Product } from '../types/product';

interface OrderFormProps {
  editingOrder?: Order | null;
  onSubmit: (payload: OrderInput) => Promise<void>;
  onCancelEdit: () => void;
  submitError?: string;
  currentUserLabel: string;
}

type ProductMode = 'existing' | 'new';

interface FormItemState {
  mode: ProductMode;
  selectedProductId: string;
  searchQuery: string;
  description: string;
  price: string;
  cost: string;
  category: string;
  tags: string;
  quantity: string;
}

interface OrderFormState {
  items: FormItemState[];
  notes: string;
  deliveryDate: string;
  deliveryPlace: string;
  createdBy: string;
  assignedTo: string;
  status: OrderInput['status'];
}

const initialItem: FormItemState = {
  mode: 'existing',
  selectedProductId: '',
  searchQuery: '',
  description: '',
  price: '',
  cost: '',
  category: '',
  tags: '',
  quantity: '1',
};

const initialState: OrderFormState = {
  items: [initialItem],
  notes: '',
  deliveryDate: '',
  deliveryPlace: '',
  createdBy: '',
  assignedTo: '',
  status: 'created',
};

function getProductSearchText(product: Product) {
  return [
    product.name,
    product.category ?? '',
    ...(product.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

export function OrderForm({
  editingOrder,
  onSubmit,
  onCancelEdit,
  submitError = '',
  currentUserLabel,
}: OrderFormProps) {
  const [form, setForm] = useState<OrderFormState>(initialState);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [owners, setOwners] = useState<CatalogOwner[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productsNotice, setProductsNotice] = useState('');
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const totalPrice = calculateOrderPrice(
    form.items.map((item) => ({
      description: item.description.trim(),
      price: Number(item.price) || 0,
    })),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCatalogProducts() {
      setProductsLoading(true);
      setProductsError('');

      try {
        const result = await fetchProducts();
        if (!isMounted) {
          return;
        }

        setCatalogProducts(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProductsError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el catalogo de productos.',
        );
      } finally {
        if (isMounted) {
          setProductsLoading(false);
        }
      }
    }

    void loadCatalogProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOwners() {
      setOwnersLoading(true);
      setOwnersError('');

      try {
        const result = await fetchOwners();
        if (!isMounted) {
          return;
        }

        setOwners(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOwners(getFallbackOwners());
        setOwnersError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la lista de responsables.',
        );
      } finally {
        if (isMounted) {
          setOwnersLoading(false);
        }
      }
    }

    void loadOwners();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editingOrder) {
      setForm({
        ...initialState,
        items: [{ ...initialItem }],
        createdBy: currentUserLabel,
      });
      setLocalError('');
      setProductsNotice('');
      return;
    }

    setForm({
      items: editingOrder.items.length
        ? editingOrder.items.map((item) => ({
            ...initialItem,
            mode: 'existing',
            description: item.description,
            price: String(item.price),
            cost: String(item.pendingCatalogProduct?.cost ?? item.price),
            category: item.pendingCatalogProduct?.category ?? '',
            tags: (item.pendingCatalogProduct?.tags ?? []).join(', '),
            quantity: String(item.pendingCatalogProduct?.quantity ?? 1),
            searchQuery: item.description,
            selectedProductId: item.productId ?? '',
          }))
        : [{ ...initialItem }],
      notes: editingOrder.notes ?? '',
      deliveryDate: editingOrder.deliveryDate,
      deliveryPlace: editingOrder.deliveryPlace,
      createdBy: editingOrder.createdBy,
      assignedTo: editingOrder.assignedTo,
      status: editingOrder.status,
    });
    setLocalError('');
    setProductsNotice('');
  }, [currentUserLabel, editingOrder]);

  function updateItem(
    index: number,
    field: keyof FormItemState,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  }

  function setItemMode(index: number, mode: ProductMode) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...initialItem,
              mode,
              description: mode === 'new' ? item.description : '',
              price: mode === 'new' ? item.price : '',
              cost: mode === 'new' ? item.cost : '',
              category: mode === 'new' ? item.category : '',
              tags: mode === 'new' ? item.tags : '',
              quantity: mode === 'new' ? item.quantity : '1',
            }
          : item,
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...initialItem }],
    }));
  }

  function removeItem(index: number) {
    setForm((current) => {
      if (current.items.length === 1) {
        return {
          ...current,
          items: [{ ...initialItem }],
        };
      }

      return {
        ...current,
        items: current.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  function selectExistingProduct(index: number, product: Product) {
    setProductsNotice('');
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              mode: 'existing',
              selectedProductId: product.id,
              searchQuery: product.name,
              description: product.name,
              price: String(product.price),
              cost: String(product.cost || product.price),
              category: product.category ?? '',
              tags: (product.tags ?? []).join(', '),
              quantity: String(product.current_stock || 1),
            }
          : item,
      ),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ownerId = catalogProducts[0]?.owner_id || getConfiguredProductOwnerId();
    const normalizedItems = form.items
      .map((item) => {
        const description = item.description.trim();
        const price = Number(item.price);
        const cost = Number(item.cost);
        const quantity = Number(item.quantity);

        return {
          description,
          price,
          productMode: item.mode,
          ...(item.mode === 'existing' && item.selectedProductId
            ? { productId: item.selectedProductId }
            : {}),
          ...(item.mode === 'new'
            ? {
                pendingCatalogProduct: {
                  name: description,
                  ownerId: ownerId || undefined,
                  cost,
                  category: item.category.trim() || null,
                  tags: item.tags
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                  quantity,
                },
              }
            : {}),
        };
      })
      .filter((item) => item.description);

    if (!normalizedItems.length) {
      setLocalError('Agrega al menos un item al pedido.');
      return;
    }

    if (
      normalizedItems.some(
        (item) => !Number.isFinite(item.price) || item.price <= 0,
      )
    ) {
      setLocalError('Cada item debe tener un precio valido mayor a 0.');
      return;
    }

    if (
      normalizedItems.some(
        (item) =>
          item.productMode === 'new' &&
          (!item.pendingCatalogProduct ||
            !Number.isFinite(item.pendingCatalogProduct.cost) ||
            item.pendingCatalogProduct.cost < 0 ||
            !Number.isFinite(item.pendingCatalogProduct.quantity) ||
            item.pendingCatalogProduct.quantity <= 0),
      )
    ) {
      setLocalError(
        'Cada producto nuevo necesita costo y cantidad validos para guardarse en el pedido.',
      );
      return;
    }

    setLocalError('');
    setSubmitting(true);

    try {
      await onSubmit({
        ...form,
        items: normalizedItems,
        notes: form.notes.trim() || undefined,
      });

      if (!editingOrder) {
        setForm({
          ...initialState,
          items: [{ ...initialItem }],
          createdBy: currentUserLabel,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Gestion</span>
          <h2>{editingOrder ? 'Editar pedido' : 'Crear nuevo pedido'}</h2>
        </div>
      </div>

      <div className="form-field-full">
        <span className="form-label">Items del pedido</span>
        {productsError ? (
          <p className="error-text form-field-full">{productsError}</p>
        ) : null}
        {productsNotice ? (
          <p className="helper-text form-field-full">{productsNotice}</p>
        ) : null}

        <div className="item-editor">
          {form.items.map((item, index) => {
            const normalizedQuery = item.searchQuery.trim().toLowerCase();
            const matchingProducts = normalizedQuery
              ? catalogProducts
                  .filter((product) =>
                    getProductSearchText(product).includes(normalizedQuery),
                  )
                  .slice(0, 6)
              : catalogProducts.slice(0, 6);

            return (
              <div
                key={`${editingOrder?.id ?? 'new'}-item-${index}`}
                className="item-editor-card"
              >
                <div className="item-card-top">
                  <span className="eyebrow">Item {index + 1}</span>
                  <button
                    type="button"
                    className="ghost-button item-row-button"
                    onClick={() => removeItem(index)}
                  >
                    Quitar
                  </button>
                </div>

                <div className="item-mode-toggle">
                  <button
                    type="button"
                    className={`item-mode-button ${item.mode === 'existing' ? 'active' : ''}`}
                    onClick={() => setItemMode(index, 'existing')}
                  >
                    Producto existente
                  </button>
                  <button
                    type="button"
                    className={`item-mode-button ${item.mode === 'new' ? 'active' : ''}`}
                    onClick={() => setItemMode(index, 'new')}
                  >
                    Producto nuevo
                  </button>
                </div>

                {item.mode === 'existing' ? (
                  <div className="item-existing-panel">
                    <label className="item-catalog-field">
                      Buscar producto
                      <input
                        type="text"
                        value={item.searchQuery}
                        onChange={(event) =>
                          updateItem(index, 'searchQuery', event.target.value)
                        }
                        placeholder="Busca por nombre, categoria o tag"
                      />
                    </label>

                    <div className="product-search-results">
                      {matchingProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className={`product-search-result ${
                            item.selectedProductId === product.id ? 'active' : ''
                          }`}
                          onClick={() => selectExistingProduct(index, product)}
                        >
                          <span>{product.name}</span>
                          <strong>${product.price.toFixed(2)}</strong>
                        </button>
                      ))}
                      {!matchingProducts.length ? (
                        <div className="product-search-empty">
                          No encontramos productos con esa busqueda.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="new-product-grid">
                    <p className="helper-text form-field-full">
                      Este producto se guardara en Firebase con el pedido y se
                      publicara en el catalogo cuando el estado cambie a
                      `Impresa y lista`.
                    </p>
                    <label>
                      Nombre del producto
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(index, 'description', event.target.value)
                        }
                        placeholder="Nombre del producto"
                      />
                    </label>

                    <label>
                      Precio
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.price}
                        onChange={(event) =>
                          updateItem(index, 'price', event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </label>

                    <label>
                      Costo
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.cost}
                        onChange={(event) =>
                          updateItem(index, 'cost', event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </label>

                    <label>
                      Categoria
                      <input
                        type="text"
                        value={item.category}
                        onChange={(event) =>
                          updateItem(index, 'category', event.target.value)
                        }
                        placeholder="Categoria"
                      />
                    </label>

                    <label className="form-field-full">
                      Tags
                      <input
                        type="text"
                        value={item.tags}
                        onChange={(event) =>
                          updateItem(index, 'tags', event.target.value)
                        }
                        placeholder="Separadas por coma"
                      />
                    </label>

                    <label>
                      Cantidad
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, 'quantity', event.target.value)
                        }
                        placeholder="1"
                      />
                    </label>
                  </div>
                )}

              </div>
            );
          })}

          <button
            type="button"
            className="ghost-button add-item-button"
            onClick={addItem}
          >
            Agregar item
          </button>
        </div>
      </div>

      <label className="form-field-full">
        Notas opcionales
        <textarea
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          rows={2}
          placeholder="Informacion adicional para mostrar al cliente"
        />
      </label>

      <div className="form-row">
        <label>
          Total del pedido
          <input type="text" value={`$${totalPrice.toFixed(2)}`} readOnly />
        </label>

        <label>
          Fecha de entrega
          <input
            type="date"
            value={form.deliveryDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                deliveryDate: event.target.value,
              }))
            }
            required
          />
        </label>
      </div>

      <label>
        Lugar de entrega
        <input
          type="text"
          value={form.deliveryPlace}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              deliveryPlace: event.target.value,
            }))
          }
          placeholder="Sucursal, colonia o ciudad"
          required
        />
      </label>

      <div className="form-row">
        <label>
          Creado por
          <input type="text" value={form.createdBy} readOnly />
        </label>

        <label>
          Asignado a
          <select
            value={form.assignedTo}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                assignedTo: event.target.value,
              }))
            }
            disabled={ownersLoading}
            required
          >
            <option value="">
              {ownersLoading ? 'Cargando responsables...' : 'Selecciona un responsable'}
            </option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.name}>
                {owner.name}
              </option>
            ))}
            {form.assignedTo &&
            !owners.some((owner) => owner.name === form.assignedTo) ? (
              <option value={form.assignedTo}>{form.assignedTo}</option>
            ) : null}
          </select>
        </label>
      </div>

      {ownersError ? (
        <p className="helper-text form-field-full">{ownersError}</p>
      ) : null}

      <div className="form-field-full">
        <span className="form-label">Estado</span>
        <div className="status-selector">
          {orderStatuses.map((status) => (
            <button
              key={status}
              type="button"
              className={`status-option ${form.status === status ? 'active' : ''}`}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  status,
                }))
              }
            >
              {statusLabelMap[status]}
            </button>
          ))}
        </div>
      </div>

      {localError ? (
        <p className="error-text form-field-full">{localError}</p>
      ) : null}

      {submitError ? (
        <p className="error-text form-field-full">{submitError}</p>
      ) : null}

      <button
        type="submit"
        className="primary-button form-field-full"
        disabled={submitting}
      >
        {submitting
          ? 'Guardando...'
          : editingOrder
            ? 'Actualizar pedido'
            : 'Crear pedido'}
      </button>
    </form>
  );
}
