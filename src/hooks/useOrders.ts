import { useEffect, useState } from 'react';
import { listenToOrders } from '../services/orderService';
import { type Order } from '../types/order';

export function useOrders(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setOrders([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    setLoading(true);
    setError('');
    const unsubscribe = listenToOrders(
      (nextOrders) => {
        setOrders(nextOrders);
        setLoading(false);
      },
      (nextError) => {
        setLoading(false);
        setError(nextError.message || 'No se pudieron cargar los pedidos.');
      },
    );

    return unsubscribe;
  }, [enabled]);

  return { orders, loading, error };
}
