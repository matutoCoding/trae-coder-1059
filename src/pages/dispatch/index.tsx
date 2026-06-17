import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import StatCard from '@/components/StatCard';
import VehicleCard from '@/components/VehicleCard';
import Tag from '@/components/Tag';
import { findMatchingVehicles, getLoadBalancingStats, DispatchCandidate } from '@/utils/dispatch';
import type { Order } from '@/types/order';

const DispatchPage: React.FC = () => {
  const { orders, vehicles } = useAppContext();
  const [matchingFor, setMatchingFor] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DispatchCandidate[]>([]);

  const pendingOrders = useMemo(
    () => orders.filter(o => o.status === 'pending'),
    [orders]
  );
  const idleVehicles = useMemo(
    () => vehicles.filter(v => v.status === 'idle'),
    [vehicles]
  );
  const lbStats = useMemo(() => getLoadBalancingStats(vehicles), [vehicles]);

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
            <Text className={styles.poolTitle}>🚛 空闲冷藏车池</Text>
            <Text className={styles.poolCount}>共 {idleVehicles.length} 辆可用</Text>
          </View>
          {idleVehicles.length === 0 ? (
            <View style={{ padding: '40rpx 0', textAlign: 'center' }}>
              <Text style={{ color: '#90A4AE', fontSize: '26rpx' }}>暂无空闲车辆</Text>
            </View>
          ) : (
            idleVehicles.map(v => <VehicleCard key={v.id} vehicle={v} compact />)
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default DispatchPage;
