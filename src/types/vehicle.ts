export type VehicleStatus = 'idle' | 'running' | 'maintain';

export type RefrigerationLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Vehicle {
  id: string;
  plateNumber: string;
  vehicleType: string;
  loadCapacity: number;
  volume: number;
  minTemp: number;
  maxTemp: number;
  refrigerationLevel: RefrigerationLevel;
  status: VehicleStatus;
  driverName: string;
  driverPhone: string;
  purchaseDate: string;
  maintenanceDate: string;
  currentLocation: string;
  totalMileage: number;
  utilizationRate: number;
  scheduleItems: ScheduleItem[];
}

export interface ScheduleItem {
  id: string;
  orderId: string;
  startTime: string;
  endTime: string;
  origin: string;
  destination: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}
