import type { Order, CargoType } from '@/types/order';
import { generateTemperatureRecords } from '@/utils/temperature';

const cargoInfos: Array<{ name: string; type: CargoType; minT: number; maxT: number }> = [
  { name: '速冻水饺', type: 'frozen', minT: -18, maxT: -12 },
  { name: '进口牛肉', type: 'frozen', minT: -20, maxT: -15 },
  { name: '鲜奶配送', type: 'chilled', minT: 2, maxT: 6 },
  { name: '新鲜草莓', type: 'fresh', minT: 0, maxT: 5 },
  { name: '医药试剂', type: 'medical', minT: 2, maxT: 8 },
  { name: '海鲜水产', type: 'frozen', minT: -22, maxT: -16 },
  { name: '有机蔬菜', type: 'fresh', minT: 1, maxT: 6 },
  { name: '冰淇淋', type: 'frozen', minT: -25, maxT: -18 },
  { name: '疫苗运输', type: 'medical', minT: 2, maxT: 8 },
  { name: '猪肉白条', type: 'chilled', minT: -2, maxT: 4 },
  { name: '精品水果', type: 'fresh', minT: 3, maxT: 8 },
  { name: '低温酸奶', type: 'chilled', minT: 2, maxT: 6 }
];

const routes = [
  { origin: '北京市', originAddr: '朝阳区东三环南路88号冷链仓库', dest: '天津市', destAddr: '滨海新区泰达大街128号物流中心' },
  { origin: '上海市', originAddr: '浦东新区张江高科技园区', dest: '杭州市', destAddr: '西湖区文一路38号农产品批发市场' },
  { origin: '广州市', originAddr: '天河区黄埔大道东663号', dest: '深圳市', destAddr: '南山区科技园北区物流园' },
  { origin: '成都市', originAddr: '武侯区天府大道中段500号', dest: '重庆市', destAddr: '渝北区两路寸滩保税港区' },
  { origin: '武汉市', originAddr: '江汉区建设大道568号', dest: '长沙市', destAddr: '雨花区黄兴镇海吉星物流园' },
  { origin: '南京市', originAddr: '鼓楼区中山北路283号', dest: '苏州市', destAddr: '工业园区现代大道88号' },
  { origin: '济南市', originAddr: '历下区工业南路108号', dest: '青岛市', destAddr: '黄岛区前湾港路688号' }
];

const statuses: Array<Order['status']> = ['pending', 'assigned', 'loading', 'transit', 'delivered', 'completed', 'completed'];

export const mockOrders: Order[] = Array.from({ length: 12 }, (_, i) => {
  const cargo = cargoInfos[i % cargoInfos.length];
  const route = routes[i % routes.length];
  const status = statuses[i % statuses.length];

  const dayOffset = status === 'completed' ? -1 - Math.floor(i / 3) : status === 'pending' ? 1 + Math.floor(i / 4) : 0;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + dayOffset);
  startDate.setHours(8 + (i % 4) * 2, 0, 0, 0);
  const duration = 3 + (i % 6);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + duration);

  const distance = 80 + (i % 7) * 65 + Math.random() * 40;
  const weight = 2 + (i % 5) * 3;
  const volume = weight * 2.5;

  const needTemp = status !== 'pending' && status !== 'assigned';
  const tempRecords = needTemp
    ? generateTemperatureRecords(
        startDate.toISOString(),
        endDate.toISOString(),
        cargo.minT,
        cargo.maxT,
        0.03 + (i % 3) * 0.02
      )
    : [];

  const assignedVehicles: Record<string, { id: string; plate: string }> = {
    'running': { id: 'v_002', plate: '沪B·6K389' },
    'transit': { id: 'v_006', plate: '浙F·3A996' },
    'delivered': { id: 'v_010', plate: '渝A·8R339' }
  };

  const assigned = status !== 'pending' ? (
    assignedVehicles[status] || { id: 'v_001', plate: '京A·88F21' }
  ) : undefined;

  return {
    id: `ord_${String(i + 1).padStart(3, '0')}`,
    orderNo: `CC${202506}${String(i + 1).padStart(4, '0')}`,
    cargoName: cargo.name,
    cargoType: cargo.type,
    cargoWeight: Math.round(weight * 10) / 10,
    cargoVolume: Math.round(volume * 10) / 10,
    origin: route.origin,
    originAddress: route.originAddr,
    destination: route.dest,
    destinationAddress: route.destAddr,
    transportStartTime: startDate.toISOString(),
    transportEndTime: endDate.toISOString(),
    requirement: {
      minTemp: cargo.minT,
      maxTemp: cargo.maxT,
      humidity: cargo.type === 'medical' ? 60 : undefined,
      specialInstructions: cargo.type === 'medical' ? '严禁剧烈震动，需全程温度监控报警' : undefined
    },
    status,
    assignedVehicleId: assigned?.id,
    assignedVehiclePlate: assigned?.plate,
    estimatedDistance: Math.round(distance * 10) / 10,
    estimatedDuration: duration,
    shipperName: ['王经理', '李总', '张主任', '陈主管'][i % 4],
    shipperPhone: `138****${String(1000 + i * 137).slice(-4)}`,
    receiverName: ['刘先生', '赵女士', '孙老板', '周经理'][i % 4],
    receiverPhone: `139****${String(2000 + i * 246).slice(-4)}`,
    createTime: new Date(startDate.getTime() - 86400000).toISOString(),
    temperatureRecords: tempRecords
  };
});
