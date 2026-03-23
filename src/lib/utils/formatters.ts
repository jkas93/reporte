/**
 * Utilidades de formateo unificadas (Phase L.1)
 */
export function formatCurrency(
  value: number, 
  currency: string = "PEN", 
  locale: string = "es-PE"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
}

export function formatNumber(
  value: number, 
  locale: string = "es-PE"
): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(
  value: number,
  decimals: number = 2,
  locale: string = "es-PE"
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}
