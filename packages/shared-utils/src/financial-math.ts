import Decimal from 'decimal.js';

// Configure Decimal precision for ERP grade operations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value || 0);
}

export function formatCurrency(
  value: string | number | Decimal,
  currencyCode = 'INR'
): string {
  const dec = toDecimal(value);
  const num = dec.toNumber();
  if (currencyCode === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function roundFinancial(value: Decimal, places = 2): Decimal {
  return value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

export function calculateRoundOff(exactTotal: Decimal): {
  roundedTotal: Decimal;
  roundOffAmount: Decimal;
} {
  const roundedTotal = exactTotal.round();
  const roundOffAmount = roundedTotal.minus(exactTotal);
  return { roundedTotal, roundOffAmount };
}
