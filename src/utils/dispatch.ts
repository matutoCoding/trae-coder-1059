import type { Vehicle, ScheduleItem } from '@/types/vehicle';
import type { Order } from '@/types/order';

export interface DispatchCandidate {
  vehicle: Vehicle;
  matchScore: number;
  matchReasons: string[];
  estimatedLoad: number;
}

export interface DispatchResult {
  success: boolean;
  assignedVehicle?: Vehicle;
  candidates?: DispatchCandidate[];
  reason?: string;
  message?: string;
  score?: number;
}

const isVehicleAvailable = (vehicle: Vehicle, startTime: string, endTime: string): boolean => {
  if (vehicle.status === 'maintain') return false;
  if (vehicle.status === 'idle') {
    return !vehicle.scheduleItems.some(item => {
      return !(endTime <= item.startTime || startTime >= item.endTime);
    });
  }
  return !vehicle.scheduleItems.some(item => {
    if (item.status === 'completed') return false;
    return !(endTime <= item.startTime || startTime >= item.endTime);
  });
};

const checkTemperatureMatch = (vehicle: Vehicle, order: Order): boolean => {
  return (
    vehicle.minTemp <= order.requirement.minTemp &&
    vehicle.maxTemp >= order.requirement.maxTemp
  );
};

const checkCapacityMatch = (vehicle: Vehicle, order: Order): { load: number; ok: boolean } => {
  const weightLoad = (order.cargoWeight / vehicle.loadCapacity) * 100;
  const volumeLoad = (order.cargoVolume / vehicle.volume) * 100;
  const maxLoad = Math.max(weightLoad, volumeLoad);
  return {
    load: Math.round(maxLoad),
    ok: maxLoad <= 95
  };
};

const calculateLocationBonus = (vehicle: Vehicle, order: Order): number => {
  if (vehicle.currentLocation === order.origin) return 15;
  if (vehicle.currentLocation.includes(order.origin.split('市')[0])) return 8;
  return 0;
};

const calculateUtilizationBalance = (vehicle: Vehicle, allVehicles: Vehicle[]): number => {
  const avgUtilization =
    allVehicles.reduce((sum, v) => sum + v.utilizationRate, 0) / allVehicles.length;
  if (vehicle.utilizationRate < avgUtilization - 10) return 20;
  if (vehicle.utilizationRate < avgUtilization) return 10;
  if (vehicle.utilizationRate > avgUtilization + 10) return -10;
  return 0;
};

export const findMatchingVehicles = (
  order: Order,
  vehicles: Vehicle[]
): DispatchCandidate[] => {
  console.log('[Dispatch] 智能分配匹配开始:', {
    orderNo: order.orderNo,
    tempRange: `${order.requirement.minTemp}~${order.requirement.maxTemp}℃`,
    vehiclesCount: vehicles.length
  });

  const candidates: DispatchCandidate[] = [];

  for (const vehicle of vehicles) {
    const reasons: string[] = [];
    let score = 0;

    if (!isVehicleAvailable(vehicle, order.transportStartTime, order.transportEndTime)) {
      continue;
    }

    if (!checkTemperatureMatch(vehicle, order)) {
      continue;
    }
    score += 30;
    reasons.push(`温度范围匹配：${vehicle.minTemp}~${vehicle.maxTemp}℃`);

    const capacity = checkCapacityMatch(vehicle, order);
    if (!capacity.ok) continue;
    score += 25;
    reasons.push(`装载率${capacity.load}%（≤95%安全阈值）`);

    const locBonus = calculateLocationBonus(vehicle, order);
    score += locBonus;
    if (locBonus > 0) reasons.push(`地理位置加成+${locBonus}分`);

    const utilBonus = calculateUtilizationBalance(vehicle, vehicles);
    score += utilBonus;
    if (utilBonus > 0) reasons.push(`负载均衡加成+${utilBonus}分`);
    if (utilBonus < 0) reasons.push(`负载过高${utilBonus}分`);

    if (vehicle.status === 'idle') {
      score += 10;
      reasons.push('车辆当前空闲');
    }

    if (vehicle.refrigerationLevel >= 'C') {
      score += 5;
      reasons.push(`制冷等级${vehicle.refrigerationLevel}级`);
    }

    if (capacity.load >= 60 && capacity.load <= 85) {
      score += 8;
      reasons.push('装载率优化区间（减少碎片）');
    }

    candidates.push({
      vehicle,
      matchScore: score,
      matchReasons: reasons,
      estimatedLoad: capacity.load
    });
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);

  console.log('[Dispatch] 匹配完成，候选车辆数:', candidates.length);
  if (candidates.length > 0) {
    console.log('[Dispatch] 最优匹配:', {
      plate: candidates[0].vehicle.plateNumber,
      score: candidates[0].matchScore
    });
  }

  return candidates;
};

export const assignVehicle = (order: Order, vehicles: Vehicle[]): DispatchResult & { score?: number } => {
  const candidates = findMatchingVehicles(order, vehicles);

  if (candidates.length === 0) {
    console.warn('[Dispatch] 无可分配车辆:', { orderNo: order.orderNo });
    return {
      success: false,
      message: '暂无符合条件的空闲冷藏车，请稍后重试或调整运输时间',
      reason: '无匹配车辆'
    };
  }

  const best = candidates[0];
  return {
    success: true,
    assignedVehicle: best.vehicle,
    candidates,
    score: best.matchScore
  };
};

export const estimateDistance = (origin: string, destination: string): number => {
  const distanceMap: Record<string, number> = {
    '上海-杭州': 180,
    '杭州-上海': 180,
    '上海-苏州': 100,
    '苏州-上海': 100,
    '上海-南京': 300,
    '南京-上海': 300,
    '上海-北京': 1200,
    '北京-上海': 1200,
    '上海-广州': 1450,
    '广州-上海': 1450,
    '北京-天津': 120,
    '天津-北京': 120,
    '广州-深圳': 140,
    '深圳-广州': 140,
    '北京-广州': 2100,
    '广州-北京': 2100,
    '成都-重庆': 320,
    '重庆-成都': 320,
    '武汉-长沙': 350,
    '长沙-武汉': 350,
    '杭州-宁波': 160,
    '宁波-杭州': 160,
    '西安-郑州': 480,
    '郑州-西安': 480,
    '上海-武汉': 820,
    '武汉-上海': 820,
    '北京-成都': 1800,
    '成都-北京': 1800,
    '广州-杭州': 1350,
    '杭州-广州': 1350,
    '南京-杭州': 280,
    '杭州-南京': 280,
    '上海-成都': 1950,
    '成都-上海': 1950,
    '上海-重庆': 1700,
    '重庆-上海': 1700,
    '北京-武汉': 1150,
    '武汉-北京': 1150,
    '北京-西安': 1100,
    '西安-北京': 1100,
    '上海-西安': 1380,
    '西安-上海': 1380
  };
  const key = `${origin}-${destination}`;
  if (distanceMap[key]) return distanceMap[key];
  const hash = Math.abs((origin + destination).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0));
  const baseDist = 50 + (hash % 1950);
  return Math.round(baseDist);
};

export const getLoadBalancingStats = (vehicles: Vehicle[]) => {
  const idle = vehicles.filter(v => v.status === 'idle').length;
  const running = vehicles.filter(v => v.status === 'running').length;
  const maintain = vehicles.filter(v => v.status === 'maintain').length;
  const avgUtil = Math.round(
    vehicles.reduce((sum, v) => sum + v.utilizationRate, 0) / vehicles.length
  );
  const totalCapacity = vehicles.reduce((sum, v) => sum + v.loadCapacity, 0);
  const avgLoad = vehicles.length > 0 ? Math.round(
    (vehicles.reduce((sum, v) => sum + v.loadCapacity * (v.utilizationRate / 100), 0) / totalCapacity) * 100
  ) : 0;

  return {
    idle,
    running,
    maintain,
    avgUtil,
    avgLoad,
    totalVehicles: vehicles.length,
    fragmentRisk: Math.round(Math.max(0, (idle / vehicles.length - 0.4)) * 100)
  };
};
