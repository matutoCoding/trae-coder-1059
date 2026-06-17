import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import Tag from '../Tag';
import type { Vehicle, VehicleStatus } from '@/types/vehicle';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  compact?: boolean;
}

const statusMap: Record<VehicleStatus, { text: string; type: 'success' | 'primary' | 'warning' }> = {
  idle: { text: '空闲', type: 'success' },
  running: { text: '运输中', type: 'primary' },
  maintain: { text: '维护中', type: 'warning' }
};

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onClick, compact }) => {
  const status = statusMap[vehicle.status];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/vehicle-detail/index?id=${vehicle.id}`
      });
    }
  };

  return (
    <View
      className={classnames(styles.card, compact && styles.compact)}
      onClick={handleClick}
    >
      <View className={styles.header}>
        <View className={styles.plateRow}>
          <Text className={styles.plate}>{vehicle.plateNumber}</Text>
          <Tag text={status.text} type={status.type} />
        </View>
        <Text className={styles.type}>{vehicle.vehicleType}</Text>
      </View>

      <View className={styles.infoGrid}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>载重</Text>
          <Text className={styles.infoValue}>{vehicle.loadCapacity}吨</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>容积</Text>
          <Text className={styles.infoValue}>{vehicle.volume}m³</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>温度</Text>
          <Text className={styles.infoValue}>{vehicle.minTemp}~{vehicle.maxTemp}℃</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>制冷</Text>
          <Text className={styles.infoValue}>{vehicle.refrigerationLevel}级</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <View className={styles.driverInfo}>
          <View className={styles.avatar}>
            <Text className={styles.avatarText}>{vehicle.driverName[0]}</Text>
          </View>
          <View>
            <Text className={styles.driverName}>{vehicle.driverName}</Text>
            <Text className={styles.location}>📍 {vehicle.currentLocation}</Text>
          </View>
        </View>
        <View className={styles.utilWrap}>
          <Text className={styles.utilLabel}>利用率</Text>
          <View className={styles.utilBar}>
            <View
              className={classnames(
                styles.utilFill,
                vehicle.utilizationRate >= 80 ? styles.high : vehicle.utilizationRate >= 50 ? styles.mid : styles.low
              )}
              style={{ width: `${vehicle.utilizationRate}%` }}
            />
          </View>
          <Text className={styles.utilValue}>{vehicle.utilizationRate}%</Text>
        </View>
      </View>
    </View>
  );
};

export default VehicleCard;
