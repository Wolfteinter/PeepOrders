import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatusTimeline } from '../components/StatusTimeline';
import { normalizeOrderCode } from '../lib/orderCode';
import { getOrderSharePath } from '../lib/orderLinks';
import { isFirebaseConfigured } from '../lib/firebase';
import { getOrderByCode } from '../services/orderService';
import { statusLabelMap, type Order } from '../types/order';

export function PublicPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sharedOrderCode = normalizeOrderCode(searchParams.get('order') ?? '');
  const hasSharedOrder = Boolean(sharedOrderCode);
  const [query, setQuery] = useState(sharedOrderCode || '2401');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    'Ingresa el numero de pedido para revisar el avance.',
  );

  useEffect(() => {
    if (!sharedOrderCode) {
      return;
    }

    setQuery(sharedOrderCode);
  }, [sharedOrderCode]);

  useEffect(() => {
    if (!sharedOrderCode) {
      setOrder(null);
      setMessage('Ingresa el numero de pedido para revisar el avance.');
      return;
    }

    void loadOrder(sharedOrderCode);
  }, [sharedOrderCode]);

  async function loadOrder(orderCode: string) {
    setLoading(true);

    try {
      const result = await getOrderByCode(orderCode);
      setOrder(result);
      setMessage(
        result
          ? 'Pedido encontrado. Aqui tienes el estado actual.'
          : 'No encontramos un pedido con ese numero.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = normalizeOrderCode(query);

    if (!normalizedQuery) {
      setSearchParams({});
      setOrder(null);
      setMessage('Ingresa un numero de pedido valido.');
      return;
    }

    setSearchParams({
      order: normalizedQuery,
    });
  }

  function renderOrderPanel() {
    return (
      <div className="panel order-preview">
        {order ? (
          <>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Pedido {order.orderCode}</span>
              </div>
              <span className={`status-pill status-${order.status}`}>
                {statusLabelMap[order.status]}
              </span>
            </div>

            <div className="order-summary order-summary-split">
              <div className="order-summary-main">
                <strong>Items del pedido</strong>
                <ul className="order-item-list">
                  {order.items.map((item, index) => (
                    <li key={`${order.id}-item-${index}`}>
                      <span>{item.description}</span>
                      <strong>${item.price.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
                {order.notes ? (
                  <div className="order-notes">
                    <strong>Notas</strong>
                    <p>{order.notes}</p>
                  </div>
                ) : null}
              </div>
              <div className="order-summary-side">
                <div>
                  <strong>Precio</strong>
                  <p>${order.price.toFixed(2)}</p>
                </div>
                <div>
                  <strong>Fecha de entrega</strong>
                  <p>{order.deliveryDate}</p>
                </div>
                <div>
                  <strong>Lugar de entrega</strong>
                  <p>{order.deliveryPlace}</p>
                </div>
              </div>
            </div>
            <StatusTimeline currentStatus={order.status} />
          </>
        ) : (
          <div className="empty-order">
            <div className="frog-mark">
              <span />
              <span />
            </div>
            <h2>{loading ? 'Buscando pedido' : 'Pedido no encontrado'}</h2>
            <p>
              {loading
                ? 'Estamos cargando la informacion del pedido.'
                : 'No encontramos informacion para este numero de pedido.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (hasSharedOrder) {
    return <section className="shared-order-page">{renderOrderPanel()}</section>;
  }

  return (
    <section className="page-grid">
      <div className="hero-card">
        <span className="eyebrow">Vista cliente</span>
        <h1>Tu pedido, claro y visible en cada etapa.</h1>
        <p>
          Un seguimiento simple, en espanol y con una identidad verde inspirada
          en Peepo, pero con una presentacion limpia y profesional.
        </p>

        {hasSharedOrder ? (
          <div className="shared-order-banner">
            <div>
                <strong>Link compartido</strong>
                <p>
                Estas viendo solo el pedido <strong>{sharedOrderCode}</strong>.
                </p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setSearchParams({})}
            >
              Buscar otro
            </button>
          </div>
        ) : (
          <form className="lookup-form" onSubmit={handleSearch}>
            <input
              type="text"
              value={query}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(event) =>
                setQuery(normalizeOrderCode(event.target.value))
              }
              placeholder="Ej. 2401"
            />
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar pedido'}
            </button>
          </form>
        )}

        <p className="helper-text">{message}</p>

        {!isFirebaseConfigured ? (
          <div className="mode-banner">
            Modo demo activo. Usa el pedido <strong>2401</strong> o crea
            pedidos desde admin. El link compartido usa el formato{' '}
            <strong>{getOrderSharePath('2401')}</strong>.
          </div>
        ) : null}
      </div>

      {renderOrderPanel()}
    </section>
  );
}
