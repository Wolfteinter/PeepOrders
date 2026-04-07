export function normalizeOrderCode(value: string) {
  return value.replace(/\D/g, '');
}
