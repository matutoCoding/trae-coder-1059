import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import BillCard from '@/components/BillCard';
import { billingRules } from '@/utils/billing';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'paid', label: '已付款' },
  { key: 'pending', label: '待付款' }
] as const;

const BillPage: React.FC = () => {
  const { bills } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const summary = useMemo(() => {
    const total = bills.reduce((s, b) => s + b.totalAmount, 0);
    const paid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0);
    const pending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.totalAmount, 0);
    const startPriceCount = bills.filter(b => b.isStartPriceApplied).length;
    const capPriceCount = bills.filter(b => b.isCapPriceApplied).length;
    return { total, paid, pending, startPriceCount, capPriceCount };
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (filter === 'all') return bills;
    return bills.filter(b => b.status === filter);
  }, [bills, filter]);

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

        <View className="sectionTitle">账单列表（{filteredBills.length}）</View>
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
      </View>
    </ScrollView>
  );
};

export default BillPage;
