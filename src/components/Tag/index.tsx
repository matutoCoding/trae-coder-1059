import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

export type TagType = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'startPrice' | 'capPrice';
export type TagSize = 'sm' | 'md';

interface TagProps {
  text: string;
  type?: TagType;
  size?: TagSize;
  className?: string;
}

const Tag: React.FC<TagProps> = ({ text, type = 'primary', size = 'sm', className }) => {
  return (
    <View className={classnames(styles.tag, styles[type], styles[size], className)}>
      <Text className={styles.text}>{text}</Text>
    </View>
  );
};

export default Tag;
