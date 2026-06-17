import type { Bill } from '@/types/bill';
import { calculateFreight, getRuleByCargoType } from '@/utils/billing';
import { mockOrders } from './orders';

export const mockBills: Bill[] = mockOrders
  .filter(o => ['delivered', 'completed'].includes(o.status))
  .map((order, idx) => {
    const rule = getRuleByCargoType(order.cargoType);
    const result = calculateFreight(
      order.estimatedDistance,
      rule,
      order.temperatureRecords,
      order.requirement.minTemp,
      order.requirement.maxTemp
    );

    return {
      id: `bill_${String(idx + 1).padStart(3, '0')}`,
      billNo: `BL${202506}${String(idx + 1).padStart(5, '0')}`,
      orderId: order.id,
      orderNo: order.orderNo,
      plateNumber: order.assignedVehiclePlate || '京A·88F21',
      cargoName: order.cargoName,
      actualDistance: order.estimatedDistance,
      actualDuration: order.estimatedDuration,
      baseAmount: result.baseAmount,
      distanceAmount: result.distanceAmount,
      tempAdjustment: result.tempAdjustment,
      totalAmount: result.totalAmount,
      appliedRule: rule.name,
      isStartPriceApplied: result.isStartPriceApplied,
      isCapPriceApplied: result.isCapPriceApplied,
      temperatureCompliance: result.temperatureCompliance,
      createTime: new Date(new Date(order.transportEndTime).getTime() + 3600000).toISOString(),
      status: idx % 3 === 0 ? 'pending' : idx % 3 === 1 ? 'paid' : 'paid',
      details: result.details
    };
  });
