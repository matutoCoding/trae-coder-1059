import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Vehicle } from '@/types/vehicle';
import type { Order } from '@/types/order';
import type { Bill } from '@/types/bill';
import { mockVehicles } from '@/data/vehicles';
import { mockOrders } from '@/data/orders';
import { mockBills } from '@/data/bills';
import { assignVehicle, DispatchResult } from '@/utils/dispatch';
import { calculateFreight, getRuleByCargoType } from '@/utils/billing';

interface AppContextType {
  vehicles: Vehicle[];
  orders: Order[];
  bills: Bill[];
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'scheduleItems' | 'utilizationRate' | 'totalMileage'>) => void;
  submitOrder: (order: Omit<Order, 'id' | 'orderNo' | 'status' | 'createTime' | 'temperatureRecords'>) => { order: Order; dispatchResult: DispatchResult };
  getOrderById: (id: string) => Order | undefined;
  getVehicleById: (id: string) => Vehicle | undefined;
  getBillByOrderId: (orderId: string) => Bill | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [bills, setBills] = useState<Bill[]>(mockBills);

  useEffect(() => {
    console.log('[AppContext] 初始化完成:', {
      vehicles: vehicles.length,
      orders: orders.length,
      bills: bills.length
    });
  }, []);

  const addVehicle: AppContextType['addVehicle'] = (data) => {
    const newVehicle: Vehicle = {
      ...data,
      id: `v_${Date.now()}`,
      scheduleItems: [],
      utilizationRate: 0,
      totalMileage: 0
    };
    setVehicles(prev => [...prev, newVehicle]);
    console.log('[AppContext] 新增车辆:', newVehicle.plateNumber);
  };

  const submitOrder: AppContextType['submitOrder'] = (data) => {
    const timestamp = Date.now();
    const newOrder: Order = {
      ...data,
      id: `ord_${timestamp}`,
      orderNo: `CC${202506}${String(timestamp).slice(-6)}`,
      status: 'pending',
      createTime: new Date().toISOString(),
      temperatureRecords: []
    };

    const dispatchResult = assignVehicle(newOrder, vehicles);

    if (dispatchResult.success && dispatchResult.assignedVehicle) {
      newOrder.status = 'assigned';
      newOrder.assignedVehicleId = dispatchResult.assignedVehicle.id;
      newOrder.assignedVehiclePlate = dispatchResult.assignedVehicle.plateNumber;
    }

    setOrders(prev => [newOrder, ...prev]);
    console.log('[AppContext] 提交订单:', {
      orderNo: newOrder.orderNo,
      assigned: newOrder.assignedVehiclePlate || '未分配'
    });

    return { order: newOrder, dispatchResult };
  };

  const getOrderById = (id: string) => orders.find(o => o.id === id);
  const getVehicleById = (id: string) => vehicles.find(v => v.id === id);
  const getBillByOrderId = (orderId: string) => bills.find(b => b.orderId === orderId);

  return (
    <AppContext.Provider
      value={{
        vehicles,
        orders,
        bills,
        addVehicle,
        submitOrder,
        getOrderById,
        getVehicleById,
        getBillByOrderId
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
};
