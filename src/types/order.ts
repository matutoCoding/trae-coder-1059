export type OrderStatus = 'pending' | 'assigned' | 'loading' | 'transit' | 'delivered' | 'completed' | 'cancelled';

export type CargoType = 'frozen' | 'chilled' | 'fresh' | 'medical' | 'other';

export interface TransportRequirement {
  minTemp: number;
  maxTemp: number;
  humidity?: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  cargoName: string;
  cargoType: CargoType;
  cargoWeight: number;
  cargoVolume: number;
  origin: string;
  originAddress: string;
  destination: string;
  destinationAddress: string;
  transportStartTime: string;
  transportEndTime: string;
  requirement: TransportRequirement;
  status: OrderStatus;
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  estimatedDistance: number;
  estimatedDuration: number;
  shipperName: string;
  shipperPhone: string;
  receiverName: string;
  receiverPhone: string;
  createTime: string;
  temperatureRecords: TemperatureRecord[];
}

export interface TemperatureRecord {
  timestamp: string;
  temperature: number;
  humidity?: number;
  location?: string;
}
