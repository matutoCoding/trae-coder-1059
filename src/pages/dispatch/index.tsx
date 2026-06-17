import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import StatCard from '@/components/StatCard';
import VehicleCard from '@/components/VehicleCard';
import Tag from '@/components/Tag';
import { findMatchingVehicles, getLoadBalancingStats, DispatchCandidate } from '@/utils/dispatch';
import type { Order } from '@/types/order';

const TEMP_ZONE_OPTIONS = [
  { key: 'all', label: '全部温区' },
  { key: 'frozen', label: '冷冻（≤-10℃）' },
  { key: 'chilled', label: '冷藏（-10~0℃）' },
  { key: 'fresh', label: '保鲜（0~10℃）' },
  { key: 'all_temp', label: '全温区' }
];

const LOAD_OPTIONS = [
  { key: 'all', label: '全部载重' },
  { key: 'light', label: '轻型（≤5吨）' },
  { key: 'medium', label: '中型（5-15吨）' },
  { key: 'heavy', label: '重型（≥15吨）' }
];

const DispatchPage: React.FC = () => {
  const { orders, vehicles } = useAppContext();
  const [matchingFor, setMatchingFor] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DispatchCandidate[]>([]);
  const [filterTempZone, setFilterTempZone] = useState('all');
  const [filterLoad, setFilterLoad] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const locationOptions = useMemo(() => {
    const locs = new Set(vehicles.map(v => v.currentLocation).filter(Boolean));
    return [{ key: 'all', label: '全部位置' }, ...[...locs].map(l => ({ key: l, label: l }))];
  }, [vehicles]);

  const pendingOrders = useMemo(
    () => orders.filter(o => o.status === 'pending'),
    [orders]
  );
  const idleVehicles = useMemo(
    () => vehicles.filter(v => v.status === 'idle'),
    [vehicles]
  );
  const lbStats = useMemo(() => getLoadBalancingStats(vehicles), [vehicles]);

  const filteredIdleVehicles = useMemo(() => {
    let list = idleVehicles;

    if (filterTempZone !== 'all') {
      list = list.filter(v => {
        if (filterTempZone === 'frozen') return v.maxTemp <= -10;
        if (filterTempZone === 'chilled') return v.minTemp <= -10 && v.maxTemp >= 0;
        if (filterTempZone === 'fresh') return v.minTemp >= 0 && v.maxTemp <= 10;
        if (filterTempZone === 'all_temp') return v.minTemp <= -18 && v.maxTemp >= 10;
        return true;
      });
    }

    if (filterLoad !== 'all') {
      list = list.filter(v => {
        const cap = v.cargoCapacity;
        if (filterLoad === 'light') return cap <= 5;
        if (filterLoad === 'medium') return cap > 5 && cap < 15;
        if (filterLoad === 'heavy') return cap >= 15;
        return true;
      });
    }

    if (filterLocation !== 'all') {
      list = list.filter(v => v.currentLocation === filterLocation);
    }

    return list;
  }, [idleVehicles, filterTempZone, filterLoad, filterLocation]);

  const activeFilterCount = [filterTempZone, filterLoad, filterLocation].filter(f => f !== 'all').length;

  const handleMatch = (order: Order) => {
    console.log('[Dispatch] 开始匹配:', order.orderNo);
    const result = findMatchingVehicles(order, vehicles);
    setMatchingFor(order.id);
    setCandidates(result);
    if (result.length === 0) {
      Taro.showToast({ title: '暂无匹配车辆', icon: 'none' });
    }
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.content}>
        <View className={styles.statsGrid}>
          <StatCard
            title="待分配需求"
            value={pendingOrders.length}
            unit="单"
            subValue="需系统择优分配"
            color="orange"
          />
          <StatCard
            title="空闲车辆池"
            value={idleVehicles.length}
            unit="辆"
            subValue="可参与分配"
            color="green"
          />
        </View>

        <View className={styles.loadBalance}>
          <View className={styles.lbHeader}>
            <Text className={styles.lbTitle}>⚖️ 负载均衡监控</Text>
            <Text className={styles.lbValue}>{lbStats.avgUtil}%</Text>
          </View>
          <View className={styles.lbBars}>
            <View className={styles.lbRow}>
              <Text className={styles.lbLabel}>空闲车辆</Text>
              <View className={styles.lbTrack}>
                <View className={classnames(styles.lbFill, styles.idle)}
                  style={{ width: `${(lbStats.idle / lbStats.totalVehicles) * 100}%` }} />
              </View>
              <Text className={styles.lbPct}>{lbStats.idle}辆</Text>
            </View>
            <View className={styles.lbRow}>
              <Text className={styles.lbLabel}>运输中</Text>
              <View className={styles.lbTrack}>
                <View className={classnames(styles.lbFill, styles.running)}
                  style={{ width: `${(lbStats.running / lbStats.totalVehicles) * 100}%` }} />
              </View>
              <Text className={styles.lbPct}>{lbStats.running}辆</Text>
            </View>
            <View className={styles.lbRow}>
              <Text className={styles.lbLabel}>维护中</Text>
              <View className={styles.lbTrack}>
                <View className={classnames(styles.lbFill, styles.maintain)}
                  style={{ width: `${(lbStats.maintain / lbStats.totalVehicles) * 100}%` }} />
              </View>
              <Text className={styles.lbPct}>{lbStats.maintain}辆</Text>
            </View>
            <View className={styles.lbRow}>
              <Text className={styles.lbLabel}>碎片风险</Text>
              <View className={styles.lbTrack}>
                <View className={classnames(styles.lbFill, styles.fragment)}
                  style={{ width: `${lbStats.fragmentRisk}%` }} />
              </View>
              <Text className={styles.lbPct}>{lbStats.fragmentRisk}%</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className="sectionTitle">待分配需求池（{pendingOrders.length}）</View>

          {pendingOrders.length === 0 ? (
            <View style={{
              padding: '60rpx 0', textAlign: 'center',
              background: '#fff', borderRadius: '16rpx', boxShadow: '0 2rpx 12rpx rgba(0,0,0,0.04)'
            }}>
              <Text style={{ color: '#90A4AE', fontSize: '28rpx' }}>
                ✅ 所有运输需求已分配完成
              </Text>
            </View>
          ) : (
            pendingOrders.map(order => (
              <View key={order.id} className={styles.pendingItem}>
                <View className={styles.piHeader}>
                  <View>
                    <Text className={styles.piOrder}>{order.orderNo}</Text>
                    <Text className={styles.piCargo}>
                      {order.cargoName} · {order.cargoWeight}吨 · ❄️ {order.requirement.minTemp}~{order.requirement.maxTemp}℃
                    </Text>
                  </View>
                  <Tag text="待分配" type="warning" size="md" />
                </View>

                <View className={styles.piRoute}>
                  <View className={classnames(styles.piDot, styles.orig)} />
                  <View className={styles.piPoints}>
                    <Text className={styles.piCity}>{order.origin}</Text>
                    <Text className={styles.piAddr}>{order.originAddress}</Text>
                  </View>
                  <View className={styles.piDivider} />
                  <View className={classnames(styles.piDot, styles.dest)} />
                  <View className={styles.piPoints}>
                    <Text className={styles.piCity}>{order.destination}</Text>
                    <Text className={styles.piAddr}>{order.destinationAddress}</Text>
                  </View>
                </View>

                <Button className={styles.piMatchBtn} onClick={() => handleMatch(order)}>
                  🤖 智能择优分配
                </Button>

                {matchingFor === order.id && candidates.length > 0 && (
                  <View className={styles.candidatesCard}>
                    <Text className={styles.candidatesTitle}>
                      🏆 候选匹配结果（按匹配度排序）
                    </Text>
                    {candidates.slice(0, 3).map((c, idx) => (
                      <View key={c.vehicle.id} className={classnames(
                        styles.candidateItem, idx === 0 && styles.best
                      )}>
                        <View className={styles.ciHeader}>
                          <View>
                            <Text className={styles.ciPlate}>
                              {idx === 0 && '👑 '}{c.vehicle.plateNumber}
                            </Text>
                            <Text style={{ fontSize: '22rpx', color: '#90A4AE', marginLeft: '12rpx' }}>
                              {c.vehicle.vehicleType} · 预估装载{c.estimatedLoad}%
                            </Text>
                          </View>
                          <Text className={styles.ciScore}>
                            {c.matchScore}<Text className={styles.max}>/100</Text>
                          </Text>
                        </View>
                        <View className={styles.ciReasons}>
                          {c.matchReasons.map((r, i) => (
                            <Text key={i} className={styles.ciReason}>✓ {r}</Text>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View className={styles.idlePool}>
          <View className={styles.poolHeader}>
            <View style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text className={styles.poolTitle}>🚛 空闲冷藏车池</Text>
              {activeFilterCount > 0 && (
                <Tag text={`${activeFilterCount}个筛选`} type="primary" size="sm" />
              )}
            </View>
            <View
              className={styles.filterToggle}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Text>{showFilters ? '收起筛选 ▲' : '筛选 ▼'}</Text>
            </View>
          </View>

          {showFilters && (
            <View className={styles.filterPanel}>
              <View className={styles.filterRow}>
                <Text className={styles.filterLabel}>❄️ 温区</Text>
                <View className={styles.filterChips}>
                  {TEMP_ZONE_OPTIONS.map(opt => (
                    <View
                      key={opt.key}
                      className={classnames(
                        styles.filterChip,
                        filterTempZone === opt.key && styles.active
                      )}
                      onClick={() => setFilterTempZone(opt.key)}
                    >
                      {opt.label}
                    </View>
                  ))}
                </View>
              </View>
              <View className={styles.filterRow}>
                <Text className={styles.filterLabel}>⚖️ 载重</Text>
                <View className={styles.filterChips}>
                  {LOAD_OPTIONS.map(opt => (
                    <View
                      key={opt.key}
                      className={classnames(
                        styles.filterChip,
                        filterLoad === opt.key && styles.active
                      )}
                      onClick={() => setFilterLoad(opt.key)}
                    >
                      {opt.label}
                    </View>
                  ))}
                </View>
              </View>
              <View className={styles.filterRow}>
                <Text className={styles.filterLabel}>📍 位置</Text>
                <Picker
                  mode="selector"
                  range={locationOptions.map(o => o.label)}
                  value={locationOptions.findIndex(o => o.key === filterLocation)}
                  onChange={e => setFilterLocation(locationOptions[Number(e.detail.value)].key)}
                >
                  <View className={styles.locationPicker}>
                    {locationOptions.find(o => o.key === filterLocation)?.label || '全部位置'}
                  </View>
                </Picker>
              </View>
              <View className={styles.filterResetRow}>
                <View
                  className={styles.resetBtn}
                  onClick={() => {
                    setFilterTempZone('all');
                    setFilterLoad('all');
                    setFilterLocation('all');
                  }}
                >
                  🔄 重置筛选
                </View>
                <Text className={styles.filterResult}>
                  筛选后 {filteredIdleVehicles.length} 辆可用
                </Text>
              </View>
            </View>
          )}

          {filteredIdleVehicles.length === 0 ? (
            <View style={{ padding: '40rpx 0', textAlign: 'center' }}>
              <Text style={{ color: '#90A4AE', fontSize: '26rpx' }}>
                {activeFilterCount > 0 ? '没有符合筛选条件的车辆' : '暂无空闲车辆'}
              </Text>
            </View>
          ) : (
            filteredIdleVehicles.map(v => <VehicleCard key={v.id} vehicle={v} compact />)
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default DispatchPage;
