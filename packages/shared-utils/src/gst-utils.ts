import { Decimal, toDecimal, roundFinancial } from './financial-math';

export interface TaxCalculationResult {
  taxableAmount: Decimal;
  cgstRate: Decimal;
  cgstAmount: Decimal;
  sgstRate: Decimal;
  sgstAmount: Decimal;
  igstRate: Decimal;
  igstAmount: Decimal;
  totalTaxAmount: Decimal;
  totalAmount: Decimal;
  isIntraState: boolean;
}

export function calculateItemGst(params: {
  quantity: string | number | Decimal;
  unitPrice: string | number | Decimal;
  discountPct?: string | number | Decimal;
  discountAmount?: string | number | Decimal;
  taxRate: string | number | Decimal; // e.g. 18 for 18%
  isTaxInclusive: boolean;
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
}): TaxCalculationResult {
  const qty = toDecimal(params.quantity);
  const price = toDecimal(params.unitPrice);
  const taxRate = toDecimal(params.taxRate);
  const grossAmount = qty.times(price);

  let discount = toDecimal(0);
  if (params.discountPct && toDecimal(params.discountPct).gt(0)) {
    discount = grossAmount.times(toDecimal(params.discountPct)).dividedBy(100);
  } else if (params.discountAmount && toDecimal(params.discountAmount).gt(0)) {
    discount = toDecimal(params.discountAmount);
  }

  const netBase = grossAmount.minus(discount);
  const isIntraState = params.supplierStateCode === params.placeOfSupplyStateCode;

  let taxableAmount: Decimal;
  let totalTaxAmount: Decimal;
  let totalAmount: Decimal;

  if (params.isTaxInclusive) {
    // If tax inclusive: Taxable = Net / (1 + (Rate / 100))
    const divisor = new Decimal(1).plus(taxRate.dividedBy(100));
    taxableAmount = roundFinancial(netBase.dividedBy(divisor), 4);
    totalTaxAmount = netBase.minus(taxableAmount);
    totalAmount = netBase;
  } else {
    taxableAmount = netBase;
    totalTaxAmount = roundFinancial(taxableAmount.times(taxRate).dividedBy(100), 4);
    totalAmount = taxableAmount.plus(totalTaxAmount);
  }

  let cgstRate = toDecimal(0);
  let cgstAmount = toDecimal(0);
  let sgstRate = toDecimal(0);
  let sgstAmount = toDecimal(0);
  let igstRate = toDecimal(0);
  let igstAmount = toDecimal(0);

  if (isIntraState) {
    cgstRate = taxRate.dividedBy(2);
    sgstRate = taxRate.dividedBy(2);
    cgstAmount = roundFinancial(totalTaxAmount.dividedBy(2), 2);
    sgstAmount = totalTaxAmount.minus(cgstAmount); // Avoid 1 paisa rounding gap
  } else {
    igstRate = taxRate;
    igstAmount = roundFinancial(totalTaxAmount, 2);
  }

  return {
    taxableAmount: roundFinancial(taxableAmount, 2),
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTaxAmount: roundFinancial(totalTaxAmount, 2),
    totalAmount: roundFinancial(totalAmount, 2),
    isIntraState,
  };
}
