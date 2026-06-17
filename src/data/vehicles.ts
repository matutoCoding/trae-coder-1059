import type { Vehicle, ScheduleItem } from '@/types/vehicle';

const generateScheduleItems = (count: number, statusWeights: number[]): ScheduleItem[] => {
  const items: ScheduleItem[] = [];
  const statuses: Array<'upcoming' | 'ongoing' | 'completed'> = ['upcoming', 'ongoing', 'completed'];
  const bases = [
    { origin: '北京市朝阳区', destination: '天津市滨海新区' },
    { origin: '上海市浦东新区', destination: '杭州市西湖区' },
    { origin: '广州市天河区', destination: '深圳市南山区' },
    { origin: '成都市武侯区', destination: '重庆市渝北区' },
    { origin: '武汉市江汉区', destination: '长沙市雨花区' }
  ];

  for (let i = 0; i < count; i++) {
    const base = bases[i % bases.length];
    const rand = Math.random();
    let status: 'upcoming' | 'ongoing' | 'completed';
    if (rand < statusWeights[0]) status = 'upcoming';
    else if (rand < statusWeights[0] + statusWeights[1]) status = 'ongoing';
    else status = 'completed';

    const dayOffset = status === 'completed' ? -2 - Math.floor(Math.random() * 5) : status === 'ongoing' ? 0 : 1 + Math.floor(Math.random() * 3);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + dayOffset);
    startDate.setHours(8 + Math.floor(Math.random() * 4), 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 3 + Math.floor(Math.random() * 6));

    items.push({
      id: `sch_${Date.now()}_${i}`,
      orderId: `ORD${2025000 + i}`,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      origin: base.origin,
      destination: base.destination,
      status
    });
  }
  return items;
};

export const mockVehicles: Vehicle[] = [
  {
    id: 'v_001',
    plateNumber: '京A·88F21',
    vehicleType: '9.6米冷藏车',
    loadCapacity: 18,
    volume: 55,
    minTemp: -25,
    maxTemp: 10,
    refrigerationLevel: 'F',
    status: 'idle',
    driverName: '张建国',
    driverPhone: '138****2341',
    purchaseDate: '2023-06-15',
    maintenanceDate: '2025-05-20',
    currentLocation: '北京市朝阳区',
    totalMileage: 128500,
    utilizationRate: 62,
    scheduleItems: generateScheduleItems(5, [0.3, 0, 0.7])
  },
  {
    id: 'v_002',
    plateNumber: '沪B·6K389',
    vehicleType: '6.8米冷藏车',
    loadCapacity: 10,
    volume: 38,
    minTemp: -18,
    maxTemp: 15,
    refrigerationLevel: 'E',
    status: 'running',
    driverName: '李明辉',
    driverPhone: '139****5672',
    purchaseDate: '2024-01-08',
    maintenanceDate: '2025-04-10',
    currentLocation: '上海市浦东新区',
    totalMileage: 86200,
    utilizationRate: 78,
    scheduleItems: generateScheduleItems(6, [0.2, 0.2, 0.6])
  },
  {
    id: 'v_003',
    plateNumber: '粤C·2H775',
    vehicleType: '4.2米冷藏车',
    loadCapacity: 5,
    volume: 20,
    minTemp: -15,
    maxTemp: 20,
    refrigerationLevel: 'D',
    status: 'idle',
    driverName: '王志强',
    driverPhone: '137****8901',
    purchaseDate: '2024-03-22',
    maintenanceDate: '2025-06-01',
    currentLocation: '广州市天河区',
    totalMileage: 42800,
    utilizationRate: 45,
    scheduleItems: generateScheduleItems(3, [0.4, 0, 0.6])
  },
  {
    id: 'v_004',
    plateNumber: '川D·5M128',
    vehicleType: '9.6米冷藏车',
    loadCapacity: 20,
    volume: 60,
    minTemp: -30,
    maxTemp: 5,
    refrigerationLevel: 'F',
    status: 'maintain',
    driverName: '赵德胜',
    driverPhone: '136****3456',
    purchaseDate: '2022-11-30',
    maintenanceDate: '2025-06-15',
    currentLocation: '成都市武侯区',
    totalMileage: 196800,
    utilizationRate: 71,
    scheduleItems: generateScheduleItems(7, [0.1, 0, 0.9])
  },
  {
    id: 'v_005',
    plateNumber: '鄂E·9Q654',
    vehicleType: '7.6米冷藏车',
    loadCapacity: 12,
    volume: 45,
    minTemp: -20,
    maxTemp: 12,
    refrigerationLevel: 'E',
    status: 'idle',
    driverName: '刘振华',
    driverPhone: '135****7823',
    purchaseDate: '2023-09-12',
    maintenanceDate: '2025-05-28',
    currentLocation: '武汉市江汉区',
    totalMileage: 108600,
    utilizationRate: 55,
    scheduleItems: generateScheduleItems(4, [0.3, 0, 0.7])
  },
  {
    id: 'v_006',
    plateNumber: '浙F·3A996',
    vehicleType: '6.8米冷藏车',
    loadCapacity: 10,
    volume: 40,
    minTemp: -25,
    maxTemp: 8,
    refrigerationLevel: 'F',
    status: 'running',
    driverName: '陈建军',
    driverPhone: '138****4567',
    purchaseDate: '2024-05-18',
    maintenanceDate: '2025-05-10',
    currentLocation: '杭州市西湖区',
    totalMileage: 65400,
    utilizationRate: 82,
    scheduleItems: generateScheduleItems(6, [0.1, 0.2, 0.7])
  },
  {
    id: 'v_007',
    plateNumber: '苏G·7N442',
    vehicleType: '4.2米冷藏车',
    loadCapacity: 4.5,
    volume: 18,
    minTemp: -18,
    maxTemp: 18,
    refrigerationLevel: 'D',
    status: 'idle',
    driverName: '周伟东',
    driverPhone: '139****2234',
    purchaseDate: '2024-08-05',
    maintenanceDate: '2025-06-05',
    currentLocation: '南京市鼓楼区',
    totalMileage: 31200,
    utilizationRate: 38,
    scheduleItems: generateScheduleItems(2, [0.5, 0, 0.5])
  },
  {
    id: 'v_008',
    plateNumber: '鲁H·1L883',
    vehicleType: '13米半挂冷藏',
    loadCapacity: 30,
    volume: 85,
    minTemp: -28,
    maxTemp: 8,
    refrigerationLevel: 'F',
    status: 'idle',
    driverName: '孙海涛',
    driverPhone: '137****6678',
    purchaseDate: '2023-03-20',
    maintenanceDate: '2025-04-25',
    currentLocation: '济南市历下区',
    totalMileage: 245600,
    utilizationRate: 68,
    scheduleItems: generateScheduleItems(8, [0.2, 0, 0.8])
  },
  {
    id: 'v_009',
    plateNumber: '闽J·4P557',
    vehicleType: '医药冷藏车',
    loadCapacity: 6,
    volume: 25,
    minTemp: 2,
    maxTemp: 8,
    refrigerationLevel: 'C',
    status: 'idle',
    driverName: '吴文斌',
    driverPhone: '136****9901',
    purchaseDate: '2024-02-14',
    maintenanceDate: '2025-05-15',
    currentLocation: '厦门市思明区',
    totalMileage: 52800,
    utilizationRate: 58,
    scheduleItems: generateScheduleItems(4, [0.3, 0, 0.7])
  },
  {
    id: 'v_010',
    plateNumber: '渝A·8R339',
    vehicleType: '9.6米冷藏车',
    loadCapacity: 18,
    volume: 58,
    minTemp: -22,
    maxTemp: 10,
    refrigerationLevel: 'E',
    status: 'running',
    driverName: '郑宏伟',
    driverPhone: '135****1123',
    purchaseDate: '2023-12-01',
    maintenanceDate: '2025-06-10',
    currentLocation: '重庆市渝北区',
    totalMileage: 138900,
    utilizationRate: 75,
    scheduleItems: generateScheduleItems(6, [0.2, 0.2, 0.6])
  }
];
