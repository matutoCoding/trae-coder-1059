import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import BillCard from '@/components/BillCard';
import { billingRules } from '@/utils/billing';
import type { OrderStatus } from '@/types/order';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'paid', label: '已付款' },
  { key: 'pending', label: '待付款' }
] as const;

const STATUS_OPTIONS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部状态' },
  { key: 'pending', label: '待分配' },
  { key: 'assigned', label: '已分配' },
  { key: 'transit', label: '运输中' },
  { key: 'delivered', label: '已送达' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
];

const BillPage: React.FC = () => {
  const { bills, orders, vehicles } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'reconcile'>('list');
  const [filterPlate, setFilterPlate] = useState('all');
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterOrderStatus, setFilterOrderStatus] = useState<OrderStatus | 'all'>('all');

  const plateOptions = useMemo(() => {
    const plates = new Set(
      bills
        .map(b => orders.find(o => o.id === b.orderId)?.assignedVehiclePlate)
        .filter(Boolean) as string[]
    );
    return [{ key: 'all', label: '全部车牌' }, ...[...plates].map(p => ({ key: p, label: p }))];
  }, [bills, orders]);

  const routeOptions = useMemo(() => {
    const routes = new Set(
      bills.map(b => {
        const o = orders.find(ord => ord.id === b.orderId);
        return o ? `${o.origin}→${o.destination}` : '';
      }).filter(Boolean)
    );
    return [{ key: 'all', label: '全部线路' }, ...[...routes].map(r => ({ key: r, label: r }))];
  }, [bills, orders]);

  const summary = useMemo(() => {
    const total = bills.reduce((s, b) => s + b.totalAmount, 0);
    const paid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0);
    const pending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.totalAmount, 0);
    const startPriceCount = bills.filter(b => b.isStartPriceApplied).length;
    const capPriceCount = bills.filter(b => b.isCapPriceApplied).length;
    return { total, paid, pending, startPriceCount, capPriceCount };
  }, [bills]);

  const filteredBills = useMemo(() => {
    let list = bills;
    if (filter !== 'all') {
      list = list.filter(b => b.status === filter);
    }
    if (filterPlate !== 'all') {
      list = list.filter(b => {
        const o = orders.find(ord => ord.id === b.orderId);
        return o?.assignedVehiclePlate === filterPlate;
      });
    }
    if (filterRoute !== 'all') {
      list = list.filter(b => {
        const o = orders.find(ord => ord.id === b.orderId);
        return o ? `${o.origin}→${o.destination}` === filterRoute : false;
      });
    }
    if (filterOrderStatus !== 'all') {
      list = list.filter(b => {
        const o = orders.find(ord => ord.id === b.orderId);
        return o?.status === filterOrderStatus;
      });
    }
    return list;
  }, [bills, filter, filterPlate, filterRoute, filterOrderStatus, orders]);

  const goOrderDetail = (orderId: string) => {
    Taro.navigateTo({ url: `/pages/order-detail/index?id=${orderId}` });
  };

  const goVehicleDetail = (vehicleId: string) => {
    Taro.navigateTo({ url: `/pages/vehicle-detail/index?id=${vehicleId}` });
  };

  const getOrderByBill = (billId: string) => orders.find(o => o.id === billId);
  const getVehicleByPlate = (plate: string) => vehicles.find(v => v.plateNumber === plate);

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.content}>
        <View className={styles.summaryCard}>
          <Text className={styles.sumLabel}>累计账单金额</Text>
          <Text className={styles.sumAmount}>
            <Text className={styles.yuan}>¥</Text>{summary.total.toFixed(2)}
          </Text>
          <View className={styles.sumBreakdown}>
            <View className={styles.sumItem}>
              <Text className={styles.num}>¥{summary.paid.toFixed(0)}</Text>
              <Text className={styles.lbl}>已收款</Text>
            </View>
            <View className={styles.sumItem}>
              <Text className={styles.num}>¥{summary.pending.toFixed(0)}</Text>
              <Text className={styles.lbl}>待收款</Text>
            </View>
            <View className={styles.sumItem}>
              <Text className={styles.num}>{bills.length}</Text>
              <Text className={styles.lbl}>账单数</Text>
            </View>
          </View>
        </View>

        <View className={styles.rulesSection}>
          <Text className={styles.rulesTitle}>📋 计费规则说明</Text>
          {billingRules.map(rule => (
            <View key={rule.id} className={styles.ruleItem}>
              <View className={styles.ruleHeader}>
                <Text className={styles.ruleName}>{rule.name}</Text>
                <Text className={styles.ruleDate}>生效 {rule.effectiveDate}</Text>
              </View>
              <View className={styles.ruleGrid}>
                <View className={styles.ruleCell}>
                  <Text className={styles.ruleCellLabel}>起步价</Text>
                  <Text className={classnames(styles.ruleCellValue, styles.start)}>
                    ¥{rule.basePrice}（≤{rule.baseDistance}km）
                  </Text>
                </View>
                <View className={styles.ruleCell}>
                  <Text className={styles.ruleCellLabel}>封顶价</Text>
                  <Text className={classnames(styles.ruleCellValue, styles.cap)}>
                    ¥{rule.capPrice}（≥{rule.capDistance}km）
                  </Text>
                </View>
                <View className={styles.ruleCell}>
                  <Text className={styles.ruleCellLabel}>里程单价</Text>
                  <Text className={styles.ruleCellValue}>¥{rule.pricePerKm}/km</Text>
                </View>
                <View className={styles.ruleCell}>
                  <Text className={styles.ruleCellLabel}>温控奖惩</Text>
                  <Text className={styles.ruleCellValue}>
                    +¥{rule.tempBonus}/-¥{rule.tempPenalty}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View className={styles.boundaryExplain}>
            <Text className={styles.boundaryTitle}>🚦 边界金额校验规则</Text>
            <Text className={styles.boundaryDesc}>
              计费引擎严格按照起步价和封顶价进行边界处理，确保费用合理透明：
            </Text>
            <View className={styles.boundaryList}>
              <Text className={styles.boundaryItem}>
                短途运输（≤基础里程）：按起步价收取，不额外计算里程费
              </Text>
              <Text className={styles.boundaryItem}>
                中途运输（基础~封顶区间）：起步价 + 超里程 × 单价
              </Text>
              <Text className={styles.boundaryItem}>
                长途运输（≥封顶里程）：按封顶价收取，超出部分自动拦截
              </Text>
              <Text className={styles.boundaryItem}>
                温控达标率≥95%：额外奖励；{`<80%`}：扣款处理
              </Text>
              <Text className={styles.boundaryItem}>
                最终金额必须在 [起步价, 封顶价+奖励] 区间内，否则校验失败
              </Text>
            </View>
          </View>

          <View style={{ marginTop: '24rpx', display: 'flex', gap: '24rpx', flexWrap: 'wrap' }}>
            <View style={{
              display: 'flex', alignItems: 'center', gap: '8rpx',
              padding: '8rpx 16rpx', borderRadius: '8rpx',
              background: 'rgba(255, 143, 0, 0.1)'
            }}>
              <Text style={{ color: '#FF8F00', fontSize: '24rpx', fontWeight: 600 }}>
                起步价生效：{summary.startPriceCount}单
              </Text>
            </View>
            <View style={{
              display: 'flex', alignItems: 'center', gap: '8rpx',
              padding: '8rpx 16rpx', borderRadius: '8rpx',
              background: 'rgba(123, 31, 162, 0.1)'
            }}>
              <Text style={{ color: '#7B1FA2', fontSize: '24rpx', fontWeight: 600 }}>
                封顶价拦截：{summary.capPriceCount}单
              </Text>
            </View>
          </View>
        </View>

        <View className={styles.viewModeToggle}>
          <View
            className={classnames(styles.viewTab, viewMode === 'list' && styles.active)}
            onClick={() => setViewMode('list')}
          >📄 账单列表</View>
          <View
            className={classnames(styles.viewTab, viewMode === 'reconcile' && styles.active)}
            onClick={() => setViewMode('reconcile')}
          >🔗 对账视图</View>
        </View>

        <View className={styles.filterRow}>
          {FILTERS.map(f => (
            <View
              key={f.key}
              className={classnames(styles.filterTab, filter === f.key && styles.active)}
              onClick={() => setFilter(f.key)}
            >
              {f.label}（{f.key === 'all' ? bills.length : bills.filter(b => b.status === f.key).length}）
            </View>
          ))}
        </View>

        {viewMode === 'reconcile' && (
          <View className={styles.reconcileFilters}>
            <Picker
              mode="selector"
              range={plateOptions.map(o => o.label)}
              value={plateOptions.findIndex(o => o.key === filterPlate)}
              onChange={e => setFilterPlate(plateOptions[Number(e.detail.value)].key)}
            >
              <View className={styles.filterPicker}>
                🚛 {plateOptions.find(o => o.key === filterPlate)?.label || '全部车牌'}
              </View>
            </Picker>
            <Picker
              mode="selector"
              range={routeOptions.map(o => o.label)}
              value={routeOptions.findIndex(o => o.key === filterRoute)}
              onChange={e => setFilterRoute(routeOptions[Number(e.detail.value)].key)}
            >
              <View className={styles.filterPicker}>
                🛣️ {routeOptions.find(o => o.key === filterRoute)?.label || '全部线路'}
              </View>
            </Picker>
            <Picker
              mode="selector"
              range={STATUS_OPTIONS.map(o => o.label)}
              value={STATUS_OPTIONS.findIndex(o => o.key === filterOrderStatus)}
              onChange={e => setFilterOrderStatus(STATUS_OPTIONS[Number(e.detail.value)].key as OrderStatus | 'all')}
            >
              <View className={styles.filterPicker}>
                📋 {STATUS_OPTIONS.find(o => o.key === filterOrderStatus)?.label || '全部状态'}
              </View>
            </Picker>
          </View>
        )}

        <View className="sectionTitle">
          {viewMode === 'list' ? '账单列表' : '对账明细'}（{filteredBills.length}）
        </View>

        {viewMode === 'list' && (
          <View className={styles.billList}>
            {filteredBills.length === 0 ? (
              <View style={{
                padding: '60rpx 0', textAlign: 'center',
                background: '#fff', borderRadius: '16rpx'
              }}>
                <Text style={{ color: '#90A4AE', fontSize: '28rpx' }}>暂无相关账单</Text>
              </View>
            ) : (
              filteredBills.map(bill => <BillCard key={bill.id} bill={bill} />)
            )}
          </View>
        )}

        {viewMode === 'reconcile' && (
          <View className={styles.reconcileList}>
            {filteredBills.length === 0 ? (
              <View style={{
                padding: '60rpx 0', textAlign: 'center',
                background: '#fff', borderRadius: '16rpx'
              }}>
                <Text style={{ color: '#90A4AE', fontSize: '28rpx' }}>暂无相关对账数据</Text>
              </View>
            ) : (
              filteredBills.map(bill => {
                const order = getOrderByBill(bill.orderId);
                const vehicle = order?.assignedVehiclePlate ? getVehicleByPlate(order.assignedVehiclePlate) : undefined;
                return (
                  <View key={bill.id} className={styles.reconcileCard}>
                    <View className={styles.recHeader}>
                      <View className={styles.recOrderNo}>📦 {order?.orderNo || bill.orderId}</View>
                      <View
                        className={classnames(
                          styles.recStatus,
                          bill.status === 'paid' && styles.paid,
                          bill.status !== 'paid' && styles.pending
                        )}
                      >
                        {bill.status === 'paid' ? '已付款' : '待付款'}
                      </View>
                    </View>

                    <View className={styles.recRoute}>
                      🚩 {order?.origin} → 🏁 {order?.destination}
                    </View>

                    <View className={styles.recLinks}>
                      <View
                        className={styles.recLinkItem}
                        onClick={() => order && goOrderDetail(order.id)}
                      >
                        <Text className={styles.recLinkIcon}>📋</Text>
                        <Text className={styles.recLinkText}>订单详情</Text>
                      </View>
                      {vehicle && (
                        <View
                          className={styles.recLinkItem}
                          onClick={() => goVehicleDetail(vehicle.id)}
                        >
                          <Text className={styles.recLinkIcon}>🚛</Text>
                          <Text className={styles.recLinkText}>
                            {order?.assignedVehiclePlate}
                          </Text>
                        </View>
                      )}
                      <View className={styles.recLinkItem}>
                        <Text className={styles.recLinkIcon}>📅</Text>
                        <Text className={styles.recLinkText}>
                          {order ? order.transportStartTime.split('T')[0] : '-'}
                        </Text>
                      </View>
                    </View>

                    <View className={styles.recAmount}>
                      <Text className={styles.recAmountLabel}>账单金额</Text>
                      <Text className={styles.recAmountValue}>¥{bill.totalAmount.toFixed(2)}</Text>
                    </View>

                    <View className={styles.recDetails}>
                      <View className={styles.recDetailItem}>
                        <Text className={styles.recDetailLabel}>里程费</Text>
                        <Text className={styles.recDetailVal}>
                          ¥{(bill.details.find(d => d.label.includes('里程费'))?.value || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View className={styles.recDetailItem}>
                        <Text className={styles.recDetailLabel}>温控调整</Text>
                        <Text
                          className={classnames(
                            styles.recDetailVal,
                            bill.tempAdjustment > 0 && styles.positive,
                            bill.tempAdjustment < 0 && styles.negative
                          )}
                        >
                          {bill.tempAdjustment >= 0 ? '+' : ''}¥{bill.tempAdjustment.toFixed(2)}
                        </Text>
                      </View>
                      <View className={styles.recDetailItem}>
                        <Text className={styles.recDetailLabel}>达标率</Text>
                        <Text className={styles.recDetailVal}>
                          {bill.temperatureCompliance?.toFixed(0) || 100}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default BillPage;
