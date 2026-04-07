import { normalizeOrderCode } from './orderCode';

export function getOrderSharePath(orderCode: string) {
  const params = new URLSearchParams({
    order: normalizeOrderCode(orderCode),
  });

  return `/seguimiento?${params.toString()}`;
}

export function getOrderShareUrl(orderCode: string) {
  if (typeof window === 'undefined') {
    return getOrderSharePath(orderCode);
  }

  return `${window.location.origin}${getOrderSharePath(orderCode)}`;
}
