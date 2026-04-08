import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppShell() {
  const { user, logOut } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isSharedOrderView =
    location.pathname === '/seguimiento' && Boolean(searchParams.get('order'));
  const isRuletaView = location.pathname === '/ruleta';
  const showHeaderLogout = location.pathname === '/admin' && Boolean(user);

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      {!isSharedOrderView && !isRuletaView ? (
        <header className="site-header">
          <Link to="/" className="brand">
            <img
              className="brand-image"
              src="/icon.JPG"
              alt="Peepolabs"
            />
            <div>
              <strong>PeepOrders</strong>
              <small>Seguimiento de pedidos</small>
            </div>
          </Link>
          {showHeaderLogout ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => void logOut()}
            >
              Cerrar sesion
            </button>
          ) : null}
        </header>
      ) : null}

      <main
        className={`page-wrap ${isSharedOrderView ? 'page-wrap-shared' : ''} ${
          isRuletaView ? 'page-wrap-ruleta' : ''
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
