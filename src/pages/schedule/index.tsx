import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import VehicleCard from '@/components/VehicleCard';
import type { VehicleStatus, ScheduleItem } from '@/types/vehicle';

const FILTERS: Array<{ key: VehicleStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'idle', label: '空闲' },
  { key: 'running', label: '运输中' },
  { key: 'maintain', label: '维护中' }
];

const fmtTimeShort = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtDate = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return fmtDate(d);
};

const getDaySchedules = (items: ScheduleItem[], dateStr: string) => {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = new Date(`${dateStr}T23:59:59`).getTime();
  return items.filter(s => {
    const sStart = new Date(s.startTime).getTime();
    const sEnd = new Date(s.endTime).getTime();
    return sEnd >= dayStart && sStart <= dayEnd;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

const calcTimelineStyle = (sch: ScheduleItem, dateStr: string) => {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const totalMs = 24 * 60 * 60 * 1000;
  const sStart = Math.max(dayStart, new Date(sch.startTime).getTime());
  const sEnd = Math.min(dayStart + totalMs, new Date(sch.endTime).getTime());
  const left = ((sStart - dayStart) / totalMs) * 100;
  const width = Math.max(2, ((sEnd - sStart) / totalMs) * 100);
  return { left: `${left}%`, width: `${width}%` };
};

const HOUR_MARKS = [0, 6, 12, 18, 24];

const SchedulePage: React.FC = () => {
  const { vehicles, orders } = useAppContext();
  const [filter, setFilter] = useState<VehicleStatus | 'all'>('all');
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});
  const [viewDate, setViewDate] = useState(fmtDate(new Date()));
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

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

  const toggleExpand = (vId: string) => {
    setExpandedVehicles(prev => ({ ...prev, [vId]: !prev[vId] }));
  };

  const getOrderBySchedule = (sch: ScheduleItem) => {
    return orders.find(o => o.id === sch.orderId);
  };

  const statusLabelMap = {
    upcoming: { text: '待执行', cls: 'upcoming' },
    ongoing: { text: '进行中', cls: 'ongoing' },
    completed: { text: '已完成', cls: 'completed' }
  };

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
          {sortedVehicles.map(v => (
            <View key={v.id} className={styles.vehicleBlock}>
              <View onClick={() => toggleExpand(v.id)}>
                <VehicleCard vehicle={v} />
              </View>

              {v.scheduleItems.length > 0 && (
                <View
                  className={classnames(
                    styles.scheduleExpand,
                    expandedVehicles[v.id] && styles.open
                  )}
                >
                  <View className={styles.expandHeader}>
                    <Text className={styles.expandTitle}>
                      📅 排期任务（{v.scheduleItems.length}）
                    </Text>
                    <Text className={styles.expandArrow}>
                      {expandedVehicles[v.id] ? '▲' : '▼'}
                    </Text>
                  </View>

                  {expandedVehicles[v.id] && (
                    <>
                      <View className={styles.dateToolbar}>
                        <View className={styles.dateNav} onClick={() => setViewDate(addDays(viewDate, -1))}>
                          <Text>◀ 前一天</Text>
                        </View>
                        <Picker
                          mode="date"
                          value={viewDate}
                          onChange={e => setViewDate(e.detail.value)}
                        >
                          <View className={styles.datePickerText}>
                            📆 {viewDate}
                          </View>
                        </Picker>
                        <View className={styles.dateNav} onClick={() => setViewDate(addDays(viewDate, 1))}>
                          <Text>后一天 ▶</Text>
                        </View>
                      </View>

                      <View className={styles.viewToggle}>
                        <View
                          className={classnames(styles.viewTab, viewMode === 'list' && styles.active)}
                          onClick={() => setViewMode('list')}
                        >列表</View>
                        <View
                          className={classnames(styles.viewTab, viewMode === 'timeline' && styles.active)}
                          onClick={() => setViewMode('timeline')}
                        >时间轴</View>
                      </View>

                      {viewMode === 'list' && (
                        <View className={styles.scheduleList}>
                          {getDaySchedules(v.scheduleItems, viewDate).length === 0 ? (
                            <View className={styles.emptyDayList}>
                              <Text style={{ color: '#90A4AE', fontSize: 24 }}>📭 {viewDate} 当天无运输任务，车辆空闲</Text>
                            </View>
                          ) : (
                            getDaySchedules(v.scheduleItems, viewDate).map(sch => {
                              const order = getOrderBySchedule(sch);
                              const st = statusLabelMap[sch.status];
                              return (
                                <View
                                  key={sch.id}
                                  className={classnames(styles.schItem, styles[st.cls])}
                                  onClick={() => {
                                    if (order) {
                                      Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` });
                                    }
                                  }}
                                >
                                  <View className={styles.schLeft}>
                                    <View className={styles.schStatusDot} />
                                    <View className={styles.schTimes}>
                                      <Text className={styles.schTime}>
                                        <Text className={styles.schTimeLabel}>装货</Text>
                                        {fmtTimeShort(sch.startTime)}
                                      </Text>
                                      <Text className={styles.schTime}>
                                        <Text className={styles.schTimeLabel}>送达</Text>
                                        {fmtTimeShort(sch.endTime)}
                                      </Text>
                                    </View>
                                  </View>
                                  <View className={styles.schRight}>
                                    <Text className={styles.schRoute}>
                                      {sch.origin} → {sch.destination}
                                    </Text>
                                    <Text className={styles.schOrderNo}>
                                      {order?.orderNo || sch.orderId}
                                    </Text>
                                    {order?.cargoName && (
                                      <Text className={styles.schCargo}>📦 {order.cargoName}</Text>
                                    )}
                                  </View>
                                  <Text className={styles.schStatusTag}>{st.text}</Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}

                      {viewMode === 'timeline' && (
                        <View className={styles.timelineWrap}>
                          <View className={styles.timelineHeader}>
                            {HOUR_MARKS.map(h => (
                              <Text key={h} className={styles.timelineHour}>{String(h).padStart(2, '0')}</Text>
                            ))}
                          </View>
                          <View className={styles.timelineTrack}>
                            {getDaySchedules(v.scheduleItems, viewDate).length === 0 && (
                              <View className={styles.emptyDay}>
                                <Text style={{ color: '#90A4AE', fontSize: 24 }}>📭 当天无运输任务，车辆空闲</Text>
                              </View>
                            )}
                            {getDaySchedules(v.scheduleItems, viewDate).map(sch => {
                              const order = getOrderBySchedule(sch);
                              const st = statusLabelMap[sch.status];
                              const style = calcTimelineStyle(sch, viewDate);
                              return (
                                <View
                                  key={sch.id}
                                  className={classnames(styles.tlBlock, styles[st.cls])}
                                  style={style}
                                  onClick={() => {
                                    if (order) {
                                      Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` });
                                    }
                                  }}
                                >
                                  <Text className={styles.tlRoute}>{sch.origin}→{sch.destination}</Text>
                                  <Text className={styles.tlTime}>
                                    {fmtTimeShort(sch.startTime).split(' ')[1]} - {fmtTimeShort(sch.endTime).split(' ')[1]}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                          <View className={styles.timelineFooter}>
                            <Text style={{ color: '#90A4AE', fontSize: 22 }}>
                              🔵 空档可预约 · 点击任务块查看订单详情
                            </Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      <Button className={styles.addBtn} onClick={goAdd}>+ 新增车辆</Button>
    </ScrollView>
  );
};

export default SchedulePage;
