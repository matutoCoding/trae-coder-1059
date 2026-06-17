import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppContext } from '@/store/AppContext';
import Tag from '@/components/Tag';
import ScheduleTimeline from '@/components/ScheduleTimeline';

const statusMap = {
  idle: { text: '空闲', type: 'success' as const },
  running: { text: '运输中', type: 'primary' as const },
  maintain: { text: '维护中', type: 'warning' as const }
};

const VehicleDetailPage: React.FC = () => {
  const router = useRouter();
  const { getVehicleById } = useAppContext();
  const vehicleId = router.params.id || '';
  const vehicle = useMemo(() => getVehicleById(vehicleId), [vehicleId, getVehicleById]);

  if (!vehicle) {
    return (
      <View style={{ padding: 100, textAlign: 'center' }}>
        <Text style={{ color: '#90A4AE' }}>车辆不存在</Text>
      </View>
    );
  }

  const status = statusMap[vehicle.status];

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.content}>
        <View className={styles.heroCard}>
          <Text className={styles.plateBig}>{vehicle.plateNumber}</Text>
          <Text className={styles.vehicleTypeBig}>{vehicle.vehicleType}</Text>
          <View className={styles.heroTags}>
            <View className={styles.heroTag}>制冷等级 {vehicle.refrigerationLevel}</View>
            <View className={styles.heroTag}>📍 {vehicle.currentLocation}</View>
            <View className={styles.heroTag}>总里程 {vehicle.totalMileage.toLocaleString()}km</View>
          </View>
        </View>

        <View className={styles.infoGrid}>
          <View style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 28, fontWeight: 600 }}>基础信息</Text>
            <Tag text={status.text} type={status.type} size="md" />
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>载重能力</Text>
            <Text className={styles.infoValue}>{vehicle.loadCapacity} 吨</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>货箱容积</Text>
            <Text className={styles.infoValue}>{vehicle.volume} m³</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>制冷温度</Text>
            <Text className={styles.infoValue}>{vehicle.minTemp}℃ ~ {vehicle.maxTemp}℃</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>资源利用率</Text>
            <Text className={styles.infoValue}>
              {vehicle.utilizationRate}%
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>购车日期</Text>
            <Text className={styles.infoValue}>{vehicle.purchaseDate}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>上次保养</Text>
            <Text className={styles.infoValue}>{vehicle.maintenanceDate}</Text>
          </View>
        </View>

        <View className={styles.driverCard}>
          <Text className={styles.cardTitle}>👤 司机信息</Text>
          <View className={styles.driverInfo}>
            <View className={styles.avatar}>
              <Text className={styles.avatarText}>{vehicle.driverName[0]}</Text>
            </View>
            <View className={styles.driverMeta}>
              <Text className={styles.driverName}>{vehicle.driverName}</Text>
              <Text className={styles.driverPhone}>📱 {vehicle.driverPhone}</Text>
            </View>
          </View>
        </View>

        <View className="sectionTitle">📅 排期时间轴</View>
        <ScheduleTimeline items={vehicle.scheduleItems} />
      </View>
    </ScrollView>
  );
};

export default VehicleDetailPage;
