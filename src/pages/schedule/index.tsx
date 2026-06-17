import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import VehicleCard from '@/components/VehicleCard';
import type { VehicleStatus } from '@/types/vehicle';

const FILTERS: Array<{ key: VehicleStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'idle', label: '空闲' },
  { key: 'running', label: '运输中' },
  { key: 'maintain', label: '维护中' }
];

const SchedulePage: React.FC = () => {
  const { vehicles } = useAppContext();
  const [filter, setFilter] = useState<VehicleStatus | 'all'>('all');

  const statusStats = useMemo(() => ({
    idle: vehicles.filter(v => v.status === 'idle').length,
    running: vehicles.filter(v => v.status === 'running').length,
    maintain: vehicles.filter(v => v.status === 'maintain').length
  }), [vehicles]);

  const avgUtil = useMemo(() => Math.round(
    vehicles.reduce((s, v) => s + v.utilizationRate, 0) / (vehicles.length || 1)
  ), [vehicles]);

  const sortedVehicles = useMemo(() => {
    const list = filter === 'all' ? vehicles : vehicles.filter(v => v.status === filter);
    return [...list].sort((a, b) => {
      const order = { idle: 0, running: 1, maintain: 2 };
      return order[a.status] - order[b.status];
    });
  }, [vehicles, filter]);

  const getFillClass = (rate: number) =>
    rate >= 80 ? styles.fillHigh : rate >= 50 ? styles.fillMid : styles.fillLow;

  const goAdd = () => Taro.navigateTo({ url: '/pages/vehicle-add/index' });

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.content}>
        <View className={styles.overview}>
          <View className={classnames(styles.overviewCard, styles.idle)}>
            <Text className={styles.overviewNum}>{statusStats.idle}</Text>
            <Text className={styles.overviewLabel}>空闲车辆</Text>
          </View>
          <View className={classnames(styles.overviewCard, styles.running)}>
            <Text className={styles.overviewNum}>{statusStats.running}</Text>
            <Text className={styles.overviewLabel}>运输中</Text>
          </View>
          <View className={classnames(styles.overviewCard, styles.maintain)}>
            <Text className={styles.overviewNum}>{statusStats.maintain}</Text>
            <Text className={styles.overviewLabel}>维护中</Text>
          </View>
        </View>

        <View className={styles.utilSection}>
          <View className={styles.utilHeader}>
            <Text className={styles.utilTitle}>📊 资源利用率</Text>
            <Text className={styles.utilValue}>{avgUtil}%</Text>
          </View>
          <View className={styles.utilBars}>
            {vehicles.slice(0, 6).map(v => (
              <View key={v.id} className={styles.utilBarRow}>
                <Text className={styles.utilBarLabel}>{v.plateNumber}</Text>
                <View className={styles.utilBarTrack}>
                  <View
                    className={classnames(styles.utilBarFill, getFillClass(v.utilizationRate))}
                    style={{ width: `${v.utilizationRate}%` }}
                  />
                </View>
                <Text className={styles.utilBarPercent}>{v.utilizationRate}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.filterBar}>
          {FILTERS.map(f => (
            <View
              key={f.key}
              className={classnames(styles.filterBtn, filter === f.key && styles.active)}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </View>
          ))}
        </View>

        <View className="sectionTitle">冷藏车资源（{sortedVehicles.length}辆）</View>

        <View className={styles.vehicleList}>
          {sortedVehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
        </View>
      </View>

      <Button className={styles.addBtn} onClick={goAdd}>+ 新增车辆</Button>
    </ScrollView>
  );
};

export default SchedulePage;
