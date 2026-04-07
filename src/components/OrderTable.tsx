import { useEffect, useMemo, useState } from 'react';
import { getOrderShareUrl } from '../lib/orderLinks';
import {
  orderStatuses,
  statusLabelMap,
  type Order,
  type OrderStatus,
} from '../types/order';

interface OrderTableProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onCreate: () => void;
  onSimulateCost: () => void;
  onDelete: (order: Order) => Promise<void>;
}

export function OrderTable({
  orders,
  onEdit,
  onCreate,
  onSimulateCost,
  onDelete,
}: OrderTableProps) {
  const [copiedOrderCode, setCopiedOrderCode] = useState('');
  const [deletingOrderId, setDeletingOrderId] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    if (!showClosed && selectedStatus === 'delivered') {
      setSelectedStatus('all');
    }
  }, [selectedStatus, showClosed]);

  const availableStatuses = showClosed
    ? orderStatuses
    : orderStatuses.filter((status) => status !== 'delivered');

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return orders.filter((order) => {
      const itemsText = order.items
        .map((item) => item.description)
        .join(' ')
        .toLowerCase();
      const matchesClosed = showClosed || order.status !== 'delivered';
      const matchesStatus =
        selectedStatus === 'all' || order.status === selectedStatus;

      const matchesSearch =
        !normalizedSearch ||
        order.orderCode.toLowerCase().includes(normalizedSearch) ||
        itemsText.includes(normalizedSearch) ||
        order.deliveryPlace.toLowerCase().includes(normalizedSearch) ||
        order.createdBy.toLowerCase().includes(normalizedSearch) ||
        order.assignedTo.toLowerCase().includes(normalizedSearch);

      return matchesClosed && matchesStatus && matchesSearch;
    });
  }, [orders, searchValue, selectedStatus, showClosed]);

  async function handleCopyLink(orderCode: string) {
    const shareUrl = getOrderShareUrl(orderCode);

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedOrderCode(orderCode);
      window.setTimeout(() => {
        setCopiedOrderCode((current) => (current === orderCode ? '' : current));
      }, 1800);
    } catch {
      window.prompt('Copia este link del pedido:', shareUrl);
    }
  }

  async function handleDelete(order: Order) {
    const confirmed = window.confirm(
      `Vas a eliminar el pedido ${order.orderCode}. Esta accion no se puede deshacer.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingOrderId(order.id);
    try {
      await onDelete(order);
    } finally {
      setDeletingOrderId('');
    }
  }

  return (
    <div className="panel admin-orders-panel">
      <div className="panel-heading admin-orders-header">
        <div className="admin-orders-heading">
          <h2>Pedidos activos</h2>
        </div>
        <div className="table-actions">
          <span className="badge">{filteredOrders.length} pedidos</span>
          <button
            type="button"
            className="ghost-button"
            onClick={onSimulateCost}
          >
            Simular costo
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onCreate}
          >
            Crear nuevo pedido
          </button>
        </div>
      </div>

      <div className="filters-bar admin-filters">
        <label className="filter-field">
          Buscar
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Numero, item o lugar"
          />
        </label>

        <label className="filter-field">
          Estado
          <select
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value as 'all' | OrderStatus)
            }
          >
            <option value="all">Todos</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabelMap[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(event) => setShowClosed(event.target.checked)}
          />
          <span>Mostrar cerrados</span>
        </label>
      </div>

      <div className="order-list admin-order-list">
        {filteredOrders.map((order) => (
          <article key={order.id} className="order-row admin-order-card">
            <div className="order-row-content admin-order-content">
              <div className="order-row-top admin-order-top">
                <strong>{order.orderCode}</strong>
                <span className={`status-pill status-${order.status}`}>
                  {statusLabelMap[order.status]}
                </span>
              </div>
              <div className="order-items-preview">
                {order.items.slice(0, 3).map((item, index) => (
                  <p key={`${order.id}-preview-item-${index}`} className="order-description">
                    {item.description} · ${item.price.toFixed(2)}
                  </p>
                ))}
                {order.items.length > 3 ? (
                  <small className="order-items-more">
                    +{order.items.length - 3} item(s) mas
                  </small>
                ) : null}
              </div>
              <div className="admin-order-meta-grid">
                <small className="order-meta">
                  <strong>Precio</strong>
                  <span>${order.price.toFixed(2)}</span>
                </small>
                <small className="order-meta">
                  <strong>Entrega</strong>
                  <span>{order.deliveryDate}</span>
                </small>
                <small className="order-meta">
                  <strong>Lugar</strong>
                  <span>{order.deliveryPlace}</span>
                </small>
                <small className="order-meta">
                  <strong>Asignado</strong>
                  <span>{order.assignedTo}</span>
                </small>
              </div>
              <small className="order-meta order-meta-wide">
                <strong>Creado por</strong>
                <span>{order.createdBy}</span>
              </small>
              <small className="share-link-label">
                Link: {getOrderShareUrl(order.orderCode)}
              </small>
            </div>

            <div className="row-actions admin-order-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => void handleCopyLink(order.orderCode)}
              >
                {copiedOrderCode === order.orderCode ? 'Copiado' : 'Copiar link'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => onEdit(order)}
              >
                Editar
              </button>
              <button
                type="button"
                className="ghost-button danger-button"
                onClick={() => void handleDelete(order)}
                disabled={deletingOrderId === order.id}
              >
                {deletingOrderId === order.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </article>
        ))}

        {!filteredOrders.length ? (
          <div className="empty-state">
            No encontramos pedidos con ese filtro.
          </div>
        ) : null}
      </div>
    </div>
  );
}
