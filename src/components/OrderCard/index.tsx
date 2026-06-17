import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import Tag from '../Tag';
import type { Order, OrderStatus, CargoType } from '@/types/order';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
}

const statusMap: Record<OrderStatus, { text: string; type: 'primary' | 'success' | 'warning' | 'error' | 'info' }> = {
  pending: { text: '待分配', type: 'warning' },
  assigned: { text: '已分配', type: 'primary' },
  loading: { text: '装货中', type: 'info' },
  transit: { text: '运输中', type: 'primary' },
  delivered: { text: '已送达', type: 'success' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'error' }
};

const cargoTypeMap: Record<CargoType, { text: string; color: string }> = {
  frozen: { text: '冷冻', color: '#1565C0' },
  chilled: { text: '冷藏', color: '#0288D1' },
  fresh: { text: '保鲜', color: '#2E7D32' },
  medical: { text: '医药', color: '#7B1FA2' },
  other: { text: '其他', color: '#546E7A' }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  const status = statusMap[order.status];
  const cargo = cargoTypeMap[order.cargoType];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/order-detail/index?id=${order.id}`
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.headerLeft}>
          <Text className={styles.orderNo}>{order.orderNo}</Text>
          <View className={styles.cargoTypeTag} style={{ background: `${cargo.color}15`, color: cargo.color }}>
            {cargo.text}
          </View>
        </View>
        <Tag text={status.text} type={status.type} size="md" />
      </View>

      <View className={styles.route}>
        <View className={styles.routePoint}>
          <View className={styles.originDot} />
          <View className={styles.routeInfo}>
            <Text className={styles.city}>{order.origin}</Text>
            <Text className={styles.address}>{order.originAddress}</Text>
          </View>
        </View>
        <View className={styles.routeLine}>
          <View className={styles.arrow}>➤</View>
          <View className={styles.distanceTag}>
            {order.estimatedDistance}km · {order.estimatedDuration}h
          </View>
        </View>
        <View className={styles.routePoint}>
          <View className={styles.destDot} />
          <View className={styles.routeInfo}>
            <Text className={styles.city}>{order.destination}</Text>
            <Text className={styles.address}>{order.destinationAddress}</Text>
          </View>
        </View>
      </View>

      <View className={styles.cargoInfo}>
        <View className={styles.cargoRow}>
          <Text className={styles.cargoName}>{order.cargoName}</Text>
          <Text className={styles.cargoSpec}>
            {order.cargoWeight}吨 / {order.cargoVolume}m³
          </Text>
        </View>
        <View className={styles.tempTag}>
          ❄️ {order.requirement.minTemp}~{order.requirement.maxTemp}℃
        </View>
      </View>

      <View className={styles.footer}>
        <View className={styles.timeInfo}>
          🕒 {formatDate(order.transportStartTime)} - {formatDate(order.transportEndTime)}
        </View>
        {order.assignedVehiclePlate && (
          <View className={styles.assignedTag}>
            🚛 {order.assignedVehiclePlate}
          </View>
        )}
      </View>
    </View>
  );
};

export default OrderCard;
