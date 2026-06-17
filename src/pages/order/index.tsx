import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import OrderCard from '@/components/OrderCard';
import StatCard from '@/components/StatCard';
import type { OrderStatus } from '@/types/order';

const ORDER_TABS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待分配' },
  { key: 'assigned', label: '已分配' },
  { key: 'transit', label: '运输中' },
  { key: 'completed', label: '已完成' }
];

const OrderPage: React.FC = () => {
  const { orders } = useAppContext();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      transit: orders.filter(o => ['assigned', 'loading', 'transit'].includes(o.status)).length,
      completed: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'transit') {
      return orders.filter(o => ['assigned', 'loading', 'transit'].includes(o.status));
    }
    return orders.filter(o => o.status === activeTab);
  }, [orders, activeTab]);

  const goSubmit = () => {
    Taro.navigateTo({ url: '/pages/order-submit/index' });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <View className={styles.welcomeRow}>
          <View className={styles.welcomeText}>
            <Text className={styles.title}>冷链智运</Text>
            <Text className={styles.subtitle}>智能调度 · 全程温控 · 安全送达</Text>
          </View>
          <Button className={styles.quickBtn} onClick={goSubmit}>
            + 新建
          </Button>
        </View>

        <View className={styles.statsRow}>
          <StatCard title="订单总数" value={stats.total} color="blue" />
          <StatCard title="待分配" value={stats.pending} color="orange" />
          <StatCard title="运输中" value={stats.transit} color="purple" />
          <StatCard title="已完成" value={stats.completed} color="green" />
        </View>
      </View>

      <View className={styles.listSection}>
        <ScrollView scrollX className={styles.tabsRow}>
          {ORDER_TABS.map(tab => (
            <View
              key={tab.key}
              className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </View>
          ))}
        </ScrollView>

        <View className={styles.sectionTitle}>订单列表（{filteredOrders.length}）</View>

        {filteredOrders.length === 0 ? (
          <View style={{ padding: '80rpx 0', textAlign: 'center' }}>
            <Text style={{ color: '#90A4AE', fontSize: '28rpx' }}>暂无相关订单</Text>
          </View>
        ) : (
          filteredOrders.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </View>

      <View className={styles.fab} onClick={goSubmit}>+</View>
    </ScrollView>
  );
};

export default OrderPage;
