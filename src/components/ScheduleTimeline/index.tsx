import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import type { ScheduleItem } from '@/types/vehicle';

interface ScheduleTimelineProps {
  items: ScheduleItem[];
  days?: number;
}

const formatHour = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const statusMap = {
  upcoming: { text: '待执行', className: 'upcoming' },
  ongoing: { text: '进行中', className: 'ongoing' },
  completed: { text: '已完成', className: 'completed' }
};

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ items, days = 5 }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysArr = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const sortedItems = [...items].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <View className={styles.container}>
      <View className={styles.daysHeader}>
        {daysArr.map((d, i) => (
          <View key={i} className={classnames(styles.dayCell, i === 0 && styles.today)}>
            <Text className={styles.dayLabel}>
              {i === 0 ? '今天' : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]}
            </Text>
            <Text className={styles.dateLabel}>
              {d.getMonth() + 1}/{d.getDate()}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.timelineBody} style={{ height: `${items.length * 120 + 80}rpx` }}>
        <View className={styles.itemsWrap}>
          {sortedItems.length === 0 ? (
            <View className={styles.empty}>
              <Text className={styles.emptyText}>暂无排期任务</Text>
            </View>
          ) : (
            sortedItems.map((item, idx) => {
              const status = statusMap[item.status];
              return (
                <View key={item.id} className={styles.itemRow}>
                  <View className={styles.timeCol}>
                    <Text className={styles.timeStart}>{formatHour(item.startTime)}</Text>
                    <View className={styles.timeLine} />
                    <Text className={styles.timeEnd}>{formatHour(item.endTime)}</Text>
                  </View>
                  <View className={styles.contentCol}>
                    <View className={classnames(styles.itemCard, styles[status.className])}>
                      <View className={styles.itemHeader}>
                        <View className={classnames(styles.statusDot, styles[status.className])} />
                        <Text className={styles.statusText}>{status.text}</Text>
                        <Text className={styles.dateTag}>{formatDateLabel(item.startTime)}</Text>
                      </View>
                      <Text className={styles.itemTitle}>
                        {item.origin} → {item.destination}
                      </Text>
                      <Text className={styles.itemOrder}>订单号：{item.orderId}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ScheduleTimeline;
