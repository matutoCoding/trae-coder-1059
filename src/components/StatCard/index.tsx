import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subValue,
  color = 'blue',
  className
}) => {
  return (
    <View className={classnames(styles.card, styles[color], className)}>
      <Text className={styles.title}>{title}</Text>
      <View className={styles.valueRow}>
        <Text className={styles.value}>{value}</Text>
        {unit && <Text className={styles.unit}>{unit}</Text>}
      </View>
      {subValue && <Text className={styles.subValue}>{subValue}</Text>}
    </View>
  );
};

export default StatCard;
