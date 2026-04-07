import { useMemo, useState, type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { OrderForm } from '../components/OrderForm';
import { OrderTable } from '../components/OrderTable';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useOrders';
import { createOrder, deleteOrder, updateOrder } from '../services/orderService';
import { type Order, type OrderInput } from '../types/order';

export function AdminPage() {
  const { user, loading, signIn } = useAuth();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
  } = useOrders(Boolean(user));
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [costInputs, setCostInputs] = useState({
    quantity: '',
    filamentGrams: '',
    timeHours: '',
  });

  const currentUserLabel = useMemo(
    () => user?.displayName?.trim() || user?.email || 'Admin',
    [user],
  );
  const quantity = Number(costInputs.quantity);
  const filamentGrams = Number(costInputs.filamentGrams);
  const timeHours = Number(costInputs.timeHours);
  const hasValidSimulationInputs =
    costInputs.quantity !== '' &&
    costInputs.filamentGrams !== '' &&
    costInputs.timeHours !== '' &&
    Number.isFinite(quantity) &&
    Number.isFinite(filamentGrams) &&
    Number.isFinite(timeHours) &&
    quantity > 0 &&
    filamentGrams >= 0 &&
    timeHours >= 0;
  const simulatedCost = hasValidSimulationInputs
    ? (filamentGrams * 0.4) / quantity + (timeHours * 4) / quantity
    : 0;

  async function handleSave(payload: OrderInput) {
    setFormError('');

    try {
      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
      } else {
        await createOrder(payload);
      }

      setEditingOrder(null);
      setIsOrderModalOpen(false);
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'permission-denied') {
          setFormError(
            'Firebase rechazo la operacion. Publica las reglas de Firestore y verifica que el usuario autenticado tenga permiso para crear pedidos.',
          );
          return;
        }

        setFormError(`Firebase: ${error.message}`);
        return;
      }

      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el pedido.');
    }
  }

  function handleOpenCreateModal() {
    setFormError('');
    setEditingOrder(null);
    setIsOrderModalOpen(true);
  }

  function handleOpenEditModal(order: Order) {
    setFormError('');
    setEditingOrder(order);
    setIsOrderModalOpen(true);
  }

  function handleCloseOrderModal() {
    setFormError('');
    setEditingOrder(null);
    setIsOrderModalOpen(false);
  }

  function handleOpenCostModal() {
    setCostInputs({
      quantity: '',
      filamentGrams: '',
      timeHours: '',
    });
    setIsCostModalOpen(true);
  }

  function handleCloseCostModal() {
    setIsCostModalOpen(false);
  }

  async function handleDeleteOrder(order: Order) {
    setFormError('');

    try {
      await deleteOrder(order.id);
      if (editingOrder?.id === order.id) {
        handleCloseOrderModal();
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'permission-denied') {
          setFormError(
            'Firebase rechazo la eliminacion. Publica las reglas de Firestore y verifica que el usuario autenticado tenga permiso para eliminar pedidos.',
          );
          return;
        }

        setFormError(`Firebase: ${error.message}`);
        return;
      }

      setFormError(
        error instanceof Error ? error.message : 'No se pudo eliminar el pedido.',
      );
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');

    try {
      await signIn(credentials.email, credentials.password);
      setCredentials({ email: '', password: '' });
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'No se pudo iniciar sesion.',
      );
    }
  }

  if (loading) {
    return <div className="panel centered-panel">Cargando acceso...</div>;
  }

  if (!user) {
    return (
      <section className="admin-login-wrap">
        <form className="panel login-panel" onSubmit={handleLogin}>
          <div className="login-panel-header">
            <span className="eyebrow">Admin privado</span>
            <h1>Acceso al panel</h1>
            <p>
              Inicia sesion para crear, editar y administrar los pedidos en
              proceso.
            </p>
          </div>

          <div className="login-form-fields">
            <label>
              Correo
              <input
                type="email"
                value={credentials.email}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="admin@tu-negocio.com"
                required
              />
            </label>

            <label>
              Contrasena
              <input
                type="password"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Tu contrasena"
                required
              />
            </label>
          </div>

          <div className="login-form-actions">
            <button type="submit" className="primary-button">
              Entrar al panel
            </button>

            {loginError ? <p className="error-text">{loginError}</p> : null}
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="admin-grid">
      <div className="orders-panel">
        {formError ? (
          <div className="panel">
            <p className="error-text">{formError}</p>
          </div>
        ) : null}
        {ordersError ? (
          <div className="panel">
            <p className="error-text">
              No se pudieron cargar los pedidos: {ordersError}
            </p>
            <p className="helper-text">
              Revisa que Firestore este habilitado y que las reglas publicadas
              permitan leer la coleccion `orders`.
            </p>
          </div>
        ) : null}
        {ordersLoading ? (
          <div className="panel centered-panel">Cargando pedidos...</div>
        ) : !ordersError ? (
          <OrderTable
            orders={orders}
            onEdit={handleOpenEditModal}
            onCreate={handleOpenCreateModal}
            onSimulateCost={handleOpenCostModal}
            onDelete={handleDeleteOrder}
          />
        ) : null}
      </div>

      {isOrderModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={handleCloseOrderModal}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={
              editingOrder ? 'Editar pedido' : 'Crear nuevo pedido'
            }
          >
            <button
              type="button"
              className="ghost-button modal-corner-close"
              onClick={handleCloseOrderModal}
            >
              Cancelar
            </button>
            <OrderForm
              editingOrder={editingOrder}
              onSubmit={handleSave}
              onCancelEdit={handleCloseOrderModal}
              submitError={formError}
              currentUserLabel={currentUserLabel}
            />
          </div>
        </div>
      ) : null}

      {isCostModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={handleCloseCostModal}
          role="presentation"
        >
          <div
            className="modal-card modal-card-compact"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Simular costo"
          >
            <button
              type="button"
              className="ghost-button modal-corner-close"
              onClick={handleCloseCostModal}
            >
              Cancelar
            </button>

            <div className="cost-simulator">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Herramienta</span>
                  <h2>Simular costo</h2>
                </div>
              </div>

              <div className="simulator-grid">
                <label>
                  Cantidad de figuras
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={costInputs.quantity}
                    onChange={(event) =>
                      setCostInputs((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    placeholder="Ej. 4"
                  />
                </label>

                <label>
                  Filamento en gramos
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costInputs.filamentGrams}
                    onChange={(event) =>
                      setCostInputs((current) => ({
                        ...current,
                        filamentGrams: event.target.value,
                      }))
                    }
                    placeholder="Ej. 320"
                  />
                </label>

                <label>
                  Tiempo en horas
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costInputs.timeHours}
                    onChange={(event) =>
                      setCostInputs((current) => ({
                        ...current,
                        timeHours: event.target.value,
                      }))
                    }
                    placeholder="Ej. 18"
                  />
                </label>
              </div>

              <div className="simulator-result">
                <span>Costo por figura</span>
                <strong>
                  {hasValidSimulationInputs
                    ? `$${simulatedCost.toFixed(2)}`
                    : 'Completa los campos'}
                </strong>
                <p>
                  Formula: (gr * 0.4 / cantidad) + (time * 4 / cantidad)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
