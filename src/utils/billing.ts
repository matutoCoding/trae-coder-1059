import type { BillingRule, Bill, BillDetailItem } from '@/types/bill';
import type { Order, TemperatureRecord } from '@/types/order';

export interface BillingResult {
  totalAmount: number;
  baseAmount: number;
  distanceAmount: number;
  startPrice: number;
  mileagePrice: number;
  appliedCap: boolean;
  tempAdjustment: number;
  isStartPriceApplied: boolean;
  isCapPriceApplied: boolean;
  details: BillDetailItem[];
  temperatureCompliance: number;
}

export const calculateTemperatureCompliance = (
  records: TemperatureRecord[],
  minTemp: number,
  maxTemp: number
): number => {
  if (!records || records.length === 0) return 100;
  const compliantRecords = records.filter(
    r => r.temperature >= minTemp && r.temperature <= maxTemp
  );
  return Math.round((compliantRecords.length / records.length) * 100);
};

export const calculateFreight = (
  distance: number,
  rule: BillingRule,
  tempRecords: TemperatureRecord[] = [],
  minTemp: number,
  maxTemp: number
): BillingResult => {
  console.log('[Billing] 计算运费:', { distance, ruleName: rule.name });

  const details: BillDetailItem[] = [];
  let distanceAmount = 0;

  if (distance <= rule.baseDistance) {
    distanceAmount = 0;
  } else {
    distanceAmount = Math.round((distance - rule.baseDistance) * rule.pricePerKm * 100) / 100;
  }

  let totalAmount = rule.basePrice + distanceAmount;
  let isStartPriceApplied = distance <= rule.baseDistance;
  let isCapPriceApplied = false;

  details.push({
    label: '起步价',
    value: rule.basePrice,
    unit: '元',
    description: `含${rule.baseDistance}公里内运输`
  });

  if (distanceAmount > 0) {
    details.push({
      label: '里程费',
      value: distanceAmount,
      unit: '元',
      description: `超${rule.baseDistance}公里部分：${(distance - rule.baseDistance).toFixed(1)}km × ${rule.pricePerKm}元/km`
    });
  }

  if (distance >= rule.capDistance) {
    const originalTotal = totalAmount;
    totalAmount = rule.capPrice;
    isCapPriceApplied = true;
    details.push({
      label: '封顶价拦截',
      value: -(originalTotal - rule.capPrice),
      unit: '元',
      description: `里程${distance.toFixed(1)}km ≥ ${rule.capDistance}km，按封顶价${rule.capPrice}元计算`
    });
  }

  if (isStartPriceApplied && !isCapPriceApplied) {
    details.push({
      label: '起步价生效',
      value: 0,
      description: `里程${distance.toFixed(1)}km ≤ ${rule.baseDistance}km，按起步价${rule.basePrice}元收取`
    });
  }

  const compliance = calculateTemperatureCompliance(tempRecords, minTemp, maxTemp);
  let tempAdjustment = 0;

  if (compliance >= 95 && rule.tempBonus) {
    tempAdjustment = rule.tempBonus;
    details.push({
      label: '温控达标奖励',
      value: tempAdjustment,
      unit: '元',
      description: `温度达标率${compliance}% ≥ 95%，奖励${rule.tempBonus}元`
    });
  } else if (compliance < 80 && rule.tempPenalty) {
    tempAdjustment = -rule.tempPenalty;
    details.push({
      label: '温控不达标扣款',
      value: tempAdjustment,
      unit: '元',
      description: `温度达标率${compliance}% < 80%，扣款${rule.tempPenalty}元`
    });
  }

  totalAmount = Math.round((totalAmount + tempAdjustment) * 100) / 100;
  totalAmount = Math.max(0, totalAmount);

  const minAllowed = rule.basePrice;
  const maxAllowed = rule.capPrice + (rule.tempBonus || 0);
  let boundaryAdjusted = false;

  if (totalAmount < minAllowed) {
    const diff = minAllowed - totalAmount;
    totalAmount = minAllowed;
    tempAdjustment = Math.round((tempAdjustment + diff) * 100) / 100;
    boundaryAdjusted = true;
    details.push({
      label: '最低运费保护',
      value: diff,
      unit: '元',
      description: `温控扣款后不低于起步价¥${rule.basePrice}`
    });
    console.log('[Billing] 触发最低运费保护:', { diff, newTotal: totalAmount });
  } else if (totalAmount > maxAllowed) {
    const diff = totalAmount - maxAllowed;
    totalAmount = maxAllowed;
    tempAdjustment = Math.round((tempAdjustment - diff) * 100) / 100;
    boundaryAdjusted = true;
    details.push({
      label: '最高金额拦截',
      value: -diff,
      unit: '元',
      description: `含奖励不超过封顶+奖励上限¥${maxAllowed}`
    });
    console.log('[Billing] 触发最高金额拦截:', { diff, newTotal: totalAmount });
  }

  console.log('[Billing] 计算结果:', {
    totalAmount,
    isStartPriceApplied,
    isCapPriceApplied,
    compliance,
    boundaryAdjusted
  });

  return {
    totalAmount,
    baseAmount: rule.basePrice,
    distanceAmount,
    startPrice: rule.basePrice,
    mileagePrice: distanceAmount,
    appliedCap: isCapPriceApplied,
    tempAdjustment,
    isStartPriceApplied,
    isCapPriceApplied,
    details,
    temperatureCompliance: compliance
  };
};

export const validateBoundaryAmount = (amount: number, rule: BillingRule): { valid: boolean; message?: string } => {
  if (amount < rule.basePrice) {
    console.error('[Billing] 金额低于起步价边界:', { amount, basePrice: rule.basePrice });
    return { valid: false, message: `金额低于起步价¥${rule.basePrice}` };
  }
  const maxAllowed = rule.capPrice + (rule.tempBonus || 0);
  if (amount > maxAllowed) {
    console.error('[Billing] 金额超出封顶价边界:', { amount, maxAllowed });
    return { valid: false, message: `金额超出封顶+奖励上限¥${maxAllowed}` };
  }
  return { valid: true };
};

export const billingRules: BillingRule[] = [
  {
    id: 'rule_001',
    name: '标准冷链运输',
    basePrice: 180,
    baseDistance: 30,
    pricePerKm: 4.5,
    capPrice: 2800,
    capDistance: 500,
    tempBonus: 50,
    tempPenalty: 100,
    effectiveDate: '2025-01-01',
    cargoTypes: ['frozen', 'chilled', 'fresh']
  },
  {
    id: 'rule_002',
    name: '医药冷链运输',
    basePrice: 280,
    baseDistance: 20,
    pricePerKm: 6.8,
    capPrice: 4500,
    capDistance: 400,
    tempBonus: 100,
    tempPenalty: 300,
    effectiveDate: '2025-01-01',
    cargoTypes: ['medical']
  },
  {
    id: 'rule_003',
    name: '深冷运输',
    basePrice: 350,
    baseDistance: 25,
    pricePerKm: 7.2,
    capPrice: 5200,
    capDistance: 450,
    tempBonus: 80,
    tempPenalty: 250,
    effectiveDate: '2025-01-01',
    cargoTypes: ['frozen']
  }
];

export const getRuleByCargoType = (cargoType: string): BillingRule => {
  return billingRules.find(r => r.cargoTypes.includes(cargoType)) || billingRules[0];
};
