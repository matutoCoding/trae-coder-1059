import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Vehicle } from '@/types/vehicle';
import type { Order, TemperatureRecord } from '@/types/order';
import type { Bill } from '@/types/bill';
import { mockVehicles } from '@/data/vehicles';
import { mockOrders } from '@/data/orders';
import { mockBills } from '@/data/bills';
import { assignVehicle, DispatchResult } from '@/utils/dispatch';
import { calculateFreight, getRuleByCargoType } from '@/utils/billing';
import { generateTemperatureRecords } from '@/utils/temperature';
import Taro from '@tarojs/taro';

const STORAGE_KEYS = {
  vehicles: 'cc_vehicles',
  orders: 'cc_orders',
  bills: 'cc_bills',
  initFlag: 'cc_data_init'
};

interface AppContextType {
  vehicles: Vehicle[];
  orders: Order[];
  bills: Bill[];
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'scheduleItems' | 'utilizationRate' | 'totalMileage'>) => void;
  submitOrder: (
    order: Omit<Order, 'id' | 'orderNo' | 'status' | 'createTime' | 'temperatureRecords'>,
    options?: { presetTemperatureRecords?: TemperatureRecord[] }
  ) => {
    order: Order;
    dispatchResult: DispatchResult;
    bill?: Bill;
  };
  getOrderById: (id: string) => Order | undefined;
  getVehicleById: (id: string) => Vehicle | undefined;
  getBillByOrderId: (orderId: string) => Bill | undefined;
  cancelOrder: (orderId: string) => boolean;
  rescheduleOrder: (orderId: string, newStartTime: string, newEndTime: string) => {
    success: boolean;
    message?: string;
    needReassign?: boolean;
  };
  resetData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const data = Taro.getStorageSync(key);
    if (data) {
      return typeof data === 'string' ? JSON.parse(data) : data;
    }
  } catch (e) {
    console.warn('[AppContext] 读取缓存失败:', key, e);
  }
  return fallback;
};

const saveToStorage = (key: string, value: any) => {
  try {
    Taro.setStorageSync(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[AppContext] 写入缓存失败:', key, e);
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadFromStorage(STORAGE_KEYS.vehicles, mockVehicles));
  const [orders, setOrders] = useState<Order[]>(() => loadFromStorage(STORAGE_KEYS.orders, mockOrders));
  const [bills, setBills] = useState<Bill[]>(() => loadFromStorage(STORAGE_KEYS.bills, mockBills));

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.vehicles, vehicles);
  }, [vehicles]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.orders, orders);
  }, [orders]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.bills, bills);
  }, [bills]);

  useEffect(() => {
    console.log('[AppContext] 初始化完成:', {
      vehicles: vehicles.length,
      orders: orders.length,
      bills: bills.length,
      storage: '已启用持久化'
    });
  }, []);

  const resetData = useCallback(() => {
    setVehicles(mockVehicles);
    setOrders(mockOrders);
    setBills(mockBills);
    Taro.showToast({ title: '已重置为初始数据', icon: 'success' });
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

  const submitOrder: AppContextType['submitOrder'] = (data, options) => {
    const timestamp = Date.now();
    const tempRecords = options?.presetTemperatureRecords?.length
      ? options.presetTemperatureRecords
      : generateTemperatureRecords(
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

  const cancelOrder = (orderId: string): boolean => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;
    if (order.status === 'completed' || order.status === 'cancelled') return false;

    if (order.assignedVehicleId) {
      setVehicles(prev => prev.map(v => {
        if (v.id !== order.assignedVehicleId) return v;
        const newScheduleItems = v.scheduleItems.filter(s => s.orderId !== orderId);
        const upcomingCount = newScheduleItems.filter(s => s.status !== 'completed').length;
        const newUtilization = Math.max(0, Math.round(v.utilizationRate * 0.7 - 25));
        return {
          ...v,
          scheduleItems: newScheduleItems,
          status: upcomingCount === 0 ? 'idle' : v.status,
          utilizationRate: Math.max(0, Math.min(100, newUtilization))
        };
      }));
    }

    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled' as const } : o
    ));

    setBills(prev => prev.map(b =>
      b.orderId === orderId ? { ...b, status: 'overdue' as const } : b
    ));

    console.log('[AppContext] 取消订单:', order.orderNo);
    return true;
  };

  const rescheduleOrder = (
    orderId: string,
    newStartTime: string,
    newEndTime: string
  ): { success: boolean; message?: string; needReassign?: boolean } => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { success: false, message: '订单不存在' };
    if (order.status === 'completed' || order.status === 'cancelled') {
      return { success: false, message: '该订单状态不支持改期' };
    }
    if (new Date(newEndTime) <= new Date(newStartTime)) {
      return { success: false, message: '结束时间必须晚于开始时间' };
    }

    let needReassign = false;

    if (order.assignedVehicleId) {
      const vehicle = vehicles.find(v => v.id === order.assignedVehicleId);
      if (vehicle) {
        const hasConflict = vehicle.scheduleItems.some(s => {
          if (s.orderId === orderId) return false;
          if (s.status === 'completed') return false;
          const sStart = new Date(s.startTime).getTime();
          const sEnd = new Date(s.endTime).getTime();
          const nStart = new Date(newStartTime).getTime();
          const nEnd = new Date(newEndTime).getTime();
          return !(nEnd <= sStart || nStart >= sEnd);
        });

        if (hasConflict) {
          needReassign = true;
          setVehicles(prev => prev.map(v => {
            if (v.id !== order.assignedVehicleId) return v;
            const newScheduleItems = v.scheduleItems.filter(s => s.orderId !== orderId);
            const upcomingCount = newScheduleItems.filter(s => s.status !== 'completed').length;
            const newUtilization = Math.max(0, Math.round(v.utilizationRate * 0.7 - 25));
            return {
              ...v,
              scheduleItems: newScheduleItems,
              status: upcomingCount === 0 ? 'idle' : v.status,
              utilizationRate: Math.max(0, Math.min(100, newUtilization))
            };
          }));
        } else {
          setVehicles(prev => prev.map(v => {
            if (v.id !== order.assignedVehicleId) return v;
            return {
              ...v,
              scheduleItems: v.scheduleItems.map(s =>
                s.orderId === orderId
                  ? { ...s, startTime: newStartTime, endTime: newEndTime }
                  : s
              )
            };
          }));
        }
      }
    }

    const newTempRecords = generateTemperatureRecords(
      newStartTime,
      newEndTime,
      order.requirement.minTemp,
      order.requirement.maxTemp
    );

    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        transportStartTime: newStartTime,
        transportEndTime: newEndTime,
        temperatureRecords: newTempRecords,
        status: needReassign ? 'pending' as const : o.status,
        assignedVehicleId: needReassign ? undefined : o.assignedVehicleId,
        assignedVehiclePlate: needReassign ? undefined : o.assignedVehiclePlate
      };
    }));

    if (!needReassign) {
      const billingRule = getRuleByCargoType(order.cargoType);
      const newBilling = calculateFreight(
        order.estimatedDistance,
        billingRule,
        newTempRecords,
        order.requirement.minTemp,
        order.requirement.maxTemp
      );
      setBills(prev => prev.map(b =>
        b.orderId === orderId
          ? {
              ...b,
              totalAmount: newBilling.totalAmount,
              tempAdjustment: newBilling.tempAdjustment,
              temperatureCompliance: newBilling.temperatureCompliance,
              details: newBilling.details
            }
          : b
      ));
    }

    console.log('[AppContext] 订单改期:', {
      orderNo: order.orderNo,
      needReassign,
      newTime: `${newStartTime} ~ ${newEndTime}`
    });

    return {
      success: true,
      needReassign,
      message: needReassign ? '改期后与该车排期冲突，已释放车辆，请重新分配' : '改期成功'
    };
  };

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
        getBillByOrderId,
        cancelOrder,
        rescheduleOrder,
        resetData
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
