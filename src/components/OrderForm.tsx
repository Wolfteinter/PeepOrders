import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchOwners,
  getFallbackOwners,
  getConfiguredProductOwnerId,
} from '../services/productService';
import {
  calculateOrderPrice,
  orderStatuses,
  statusLabelMap,
  type Order,
  type OrderItem,
  type OrderInput,
} from '../types/order';
import { type CatalogOwner } from '../types/product';

interface OrderFormProps {
  editingOrder?: Order | null;
  onSubmit: (payload: OrderInput) => Promise<void>;
  onCancelEdit: () => void;
  submitError?: string;
  currentUserLabel: string;
}

interface FormItemState {
  productMode: 'existing' | 'new';
  productId: string;
  catalogSyncedAt: string;
  description: string;
  cost: string;
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
  productMode: 'new',
  productId: '',
  catalogSyncedAt: '',
  description: '',
  cost: '',
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

export function OrderForm({
  editingOrder,
  onSubmit,
  onCancelEdit: _onCancelEdit,
  submitError = '',
  currentUserLabel,
}: OrderFormProps) {
  const [form, setForm] = useState<OrderFormState>(initialState);
  const [owners, setOwners] = useState<CatalogOwner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const totalPrice = calculateOrderPrice(
    form.items.map((item) => ({
      description: item.description.trim(),
      price: (Number(item.cost) || 0) * (Number(item.quantity) || 0),
    })),
  );

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
      return;
    }

    setForm({
      items: editingOrder.items.length
        ? editingOrder.items.map((item) => ({
            ...initialItem,
            productMode: item.productMode ?? (item.productId ? 'existing' : 'new'),
            productId: item.productId ?? '',
            catalogSyncedAt: item.catalogSyncedAt ?? '',
            description: item.description,
            cost: String(item.pendingCatalogProduct?.cost ?? item.price),
            quantity: String(item.pendingCatalogProduct?.quantity ?? 1),
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
  }, [currentUserLabel, editingOrder]);

  function updateItem(index: number, field: keyof FormItemState, value: string) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ownerId = getConfiguredProductOwnerId();
    const normalizedItems = form.items
      .map<OrderItem>((item) => {
        const description = item.description.trim();
        const cost = Number(item.cost);
        const quantity = Number(item.quantity);
        const price = cost * quantity;
        const isSyncedCatalogItem = Boolean(item.productId);

        return {
          description,
          price,
          productMode: isSyncedCatalogItem ? item.productMode : 'new',
          ...(isSyncedCatalogItem
            ? {
                productId: item.productId,
                ...(item.catalogSyncedAt
                  ? { catalogSyncedAt: item.catalogSyncedAt }
                  : {}),
              }
            : {
                pendingCatalogProduct: {
                  name: description,
                  ...(ownerId ? { ownerId } : {}),
                  cost,
                  category: null,
                  tags: [],
                  quantity,
                },
              }),
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
      setLocalError('Cada item necesita costo y cantidad validos.');
      return;
    }

    if (
      normalizedItems.some(
        (item) =>
          !item.productId &&
          (!item.pendingCatalogProduct ||
            !Number.isFinite(item.pendingCatalogProduct.cost) ||
            item.pendingCatalogProduct.cost < 0 ||
            !Number.isFinite(item.pendingCatalogProduct.quantity) ||
            item.pendingCatalogProduct.quantity <= 0),
      )
    ) {
      setLocalError('Cada item necesita costo y cantidad validos.');
      return;
    }

    if (!form.createdBy.trim()) {
      setLocalError('Ingresa quien crea el pedido.');
      return;
    }

    if (!form.assignedTo.trim()) {
      setLocalError('Selecciona a quien se asigna el pedido.');
      return;
    }

    setLocalError('');
    setSubmitting(true);

    try {
      await onSubmit({
        ...form,
        createdBy: form.createdBy.trim(),
        assignedTo: form.assignedTo.trim(),
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
        <p className="helper-text form-field-full">
          Captura nombre, cantidad y costo. El total se calcula automaticamente.
        </p>

        <div className="item-editor">
          {form.items.map((item, index) => (
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

              <div className="new-product-grid">
                <label className="form-field-full">
                  Nombre del item
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

                <label>
                  Costo
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.cost}
                    onChange={(event) => updateItem(index, 'cost', event.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label>
                  Total del item
                  <input
                    type="text"
                    value={`$${(
                      (Number(item.cost) || 0) * (Number(item.quantity) || 0)
                    ).toFixed(2)}`}
                    readOnly
                  />
                </label>
              </div>
            </div>
          ))}

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
        Notas
        <textarea
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          rows={2}
          placeholder="Informacion adicional"
        />
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
          <input
            type="text"
            value={form.createdBy}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                createdBy: event.target.value,
              }))
            }
            placeholder="Nombre de quien crea el pedido"
            required
          />
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

      <label>
        Total del pedido
        <input type="text" value={`$${totalPrice.toFixed(2)}`} readOnly />
      </label>

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
