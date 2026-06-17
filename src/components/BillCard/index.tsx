import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import Tag from '../Tag';
import type { Bill } from '@/types/bill';

interface BillCardProps {
  bill: Bill;
  onClick?: () => void;
}

const statusMap = {
  pending: { text: '待付款', type: 'warning' as const },
  paid: { text: '已付款', type: 'success' as const },
  overdue: { text: '已逾期', type: 'error' as const }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const BillCard: React.FC<BillCardProps> = ({ bill, onClick }) => {
  const status = statusMap[bill.status];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/order-detail/index?id=${bill.orderId}`
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View>
          <Text className={styles.billNo}>{bill.billNo}</Text>
          <Text className={styles.orderRef}>关联订单：{bill.orderNo}</Text>
        </View>
        <Tag text={status.text} type={status.type} size="md" />
      </View>

      <View className={styles.cargoRow}>
        <Text className={styles.cargoName}>{bill.cargoName}</Text>
        <Text className={styles.plate}>🚛 {bill.plateNumber}</Text>
      </View>

      <View className={styles.infoGrid}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>运输里程</Text>
          <Text className={styles.infoValue}>{bill.actualDistance.toFixed(1)} km</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>温控达标</Text>
          <Text className={classnames(
            styles.infoValue,
            bill.temperatureCompliance >= 95 ? styles.good :
            bill.temperatureCompliance >= 80 ? styles.warn : styles.bad
          )}>{bill.temperatureCompliance}%</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>计费规则</Text>
          <Text className={styles.infoValue}>{bill.appliedRule}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>出账日期</Text>
          <Text className={styles.infoValue}>{formatDate(bill.createTime)}</Text>
        </View>
      </View>

      <View className={styles.priceTags}>
        {bill.isStartPriceApplied && <Tag text="起步价生效" type="startPrice" />}
        {bill.isCapPriceApplied && <Tag text="封顶价拦截" type="capPrice" />}
      </View>

      <View className={styles.footer}>
        <View className={styles.breakdown}>
          <View className={styles.breakItem}>
            <Text className={styles.breakLabel}>起步</Text>
            <Text className={styles.breakValue}>¥{bill.baseAmount}</Text>
          </View>
          {bill.distanceAmount > 0 && (
            <View className={styles.breakItem}>
              <Text className={styles.breakLabel}>里程</Text>
              <Text className={styles.breakValue}>¥{bill.distanceAmount}</Text>
            </View>
          )}
          {bill.tempAdjustment !== 0 && (
            <View className={styles.breakItem}>
              <Text className={styles.breakLabel}>温控</Text>
              <Text className={classnames(styles.breakValue, bill.tempAdjustment > 0 ? styles.good : styles.bad)}>
                {bill.tempAdjustment > 0 ? '+' : ''}¥{bill.tempAdjustment}
              </Text>
            </View>
          )}
        </View>
        <View className={styles.totalWrap}>
          <Text className={styles.totalLabel}>合计</Text>
          <Text className={styles.totalPrice}>¥{bill.totalAmount.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

export default BillCard;
