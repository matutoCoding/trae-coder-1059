import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Vehicle } from '@/types/vehicle';
import type { Order } from '@/types/order';
import type { Bill } from '@/types/bill';
import { mockVehicles } from '@/data/vehicles';
import { mockOrders } from '@/data/orders';
import { mockBills } from '@/data/bills';
import { assignVehicle, DispatchResult } from '@/utils/dispatch';
import { calculateFreight, getRuleByCargoType } from '@/utils/billing';
import { generateTemperatureRecords } from '@/utils/temperature';

interface AppContextType {
  vehicles: Vehicle[];
  orders: Order[];
  bills: Bill[];
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'scheduleItems' | 'utilizationRate' | 'totalMileage'>) => void;
  submitOrder: (order: Omit<Order, 'id' | 'orderNo' | 'status' | 'createTime' | 'temperatureRecords'>) => {
    order: Order;
    dispatchResult: DispatchResult;
    bill?: Bill;
  };
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
    const tempRecords = generateTemperatureRecords(
      data.transportStartTime,
      data.transportEndTime,
      data.requirement.minTemp,
      data.requirement.maxTemp
    );

    const newOrder: Order = {
      ...data,
      id: `ord_${timestamp}`,
      orderNo: `CC${202506}${String(timestamp).slice(-6)}`,
      status: 'pending',
      createTime: new Date().toISOString(),
      temperatureRecords: tempRecords
    };

    const dispatchResult = assignVehicle(newOrder, vehicles);
    let newBill: Bill | undefined = undefined;

    if (dispatchResult.success && dispatchResult.assignedVehicle) {
      newOrder.status = 'assigned';
      newOrder.assignedVehicleId = dispatchResult.assignedVehicle.id;
      newOrder.assignedVehiclePlate = dispatchResult.assignedVehicle.plateNumber;

      setVehicles(prev => prev.map(v => {
        if (v.id === dispatchResult.assignedVehicle!.id) {
          const newScheduleItem = {
            id: `sch_${timestamp}`,
            orderId: newOrder.id,
            startTime: newOrder.transportStartTime,
            endTime: newOrder.transportEndTime,
            origin: newOrder.origin,
            destination: newOrder.destination,
            status: 'upcoming' as const
          };

          const newScheduleItems = [...v.scheduleItems, newScheduleItem];
          const upcomingCount = newScheduleItems.filter(s => s.status !== 'completed').length;
          const newUtilization = Math.min(100, Math.round(upcomingCount * 25 + v.utilizationRate * 0.5));

          return {
            ...v,
            status: upcomingCount > 0 ? 'running' : v.status,
            scheduleItems: newScheduleItems,
            utilizationRate: newUtilization,
            currentLocation: newOrder.destination
          };
        }
        return v;
      }));

      const billingRule = getRuleByCargoType(newOrder.cargoType);
      const billingResult = calculateFreight(
        newOrder.estimatedDistance,
        billingRule,
        newOrder.temperatureRecords,
        newOrder.requirement.minTemp,
        newOrder.requirement.maxTemp
      );

      const billTimestamp = Date.now() + 1;
      newBill = {
        id: `bill_${billTimestamp}`,
        billNo: `BL${202506}${String(billTimestamp).slice(-6)}`,
        orderId: newOrder.id,
        orderNo: newOrder.orderNo,
        plateNumber: newOrder.assignedVehiclePlate || '',
        cargoName: newOrder.cargoName,
        actualDistance: newOrder.estimatedDistance,
        actualDuration: newOrder.estimatedDuration,
        baseAmount: billingResult.baseAmount,
        distanceAmount: billingResult.distanceAmount,
        tempAdjustment: billingResult.tempAdjustment,
        totalAmount: billingResult.totalAmount,
        appliedRule: billingRule.name,
        isStartPriceApplied: billingResult.isStartPriceApplied,
        isCapPriceApplied: billingResult.isCapPriceApplied,
        temperatureCompliance: billingResult.temperatureCompliance,
        createTime: new Date().toISOString(),
        status: 'pending' as const,
        details: billingResult.details
      };

      setBills(prev => [newBill!, ...prev]);
      console.log('[AppContext] 自动生成账单:', {
        billNo: newBill.billNo,
        totalAmount: newBill.totalAmount,
        items: newBill.details.length
      });
    }

    setOrders(prev => [newOrder, ...prev]);
    console.log('[AppContext] 提交订单:', {
      orderNo: newOrder.orderNo,
      assigned: newOrder.assignedVehiclePlate || '未分配',
      status: newOrder.status
    });

    return { order: newOrder, dispatchResult, bill: newBill };
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
