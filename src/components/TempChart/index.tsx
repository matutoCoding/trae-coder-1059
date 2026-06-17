import React from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import type { TemperatureRecord } from '@/types/order';
import { getTemperatureStatus, getTempStats } from '@/utils/temperature';

interface TempChartProps {
  records: TemperatureRecord[];
  minTemp: number;
  maxTemp: number;
  height?: number;
}

const TempChart: React.FC<TempChartProps> = ({ records, minTemp, maxTemp, height = 200 }) => {
  const stats = getTempStats(records);
  const canvasId = `temp_canvas_${Date.now()}`;

  React.useEffect(() => {
    if (records.length === 0) return;

    const query = Taro.createSelectorQuery();
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = Taro.getSystemInfoSync().pixelRatio;
        const w = res[0].width;
        const h = res[0].height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        const temps = records.map(r => r.temperature);
        const actualMin = Math.min(stats.min - 3, minTemp - 2);
        const actualMax = Math.max(stats.max + 3, maxTemp + 2);
        const tempRange = actualMax - actualMin;

        const safeTop = padding.top + ((actualMax - maxTemp) / tempRange) * chartH;
        const safeBottom = padding.top + ((actualMax - minTemp) / tempRange) * chartH;
        ctx.fillStyle = 'rgba(67, 160, 71, 0.1)';
        ctx.fillRect(padding.left, safeTop, chartW, safeBottom - safeTop);

        ctx.strokeStyle = 'rgba(67, 160, 71, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, safeTop);
        ctx.lineTo(w - padding.right, safeTop);
        ctx.moveTo(padding.left, safeBottom);
        ctx.lineTo(w - padding.right, safeBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#BBDEFB';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padding.top + (chartH / 4) * i;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(w - padding.right, y);
          ctx.stroke();
        }

        ctx.fillStyle = '#90A4AE';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
          const y = padding.top + (chartH / 4) * i;
          const temp = actualMax - (tempRange / 4) * i;
          ctx.fillText(temp.toFixed(0) + '℃', padding.left - 6, y + 3);
        }

        const points = records.map((r, i) => {
          const x = padding.left + (records.length === 1 ? chartW / 2 : (i / (records.length - 1)) * chartW);
          const y = padding.top + ((actualMax - r.temperature) / tempRange) * chartH;
          return { x, y, temp: r.temperature };
        });

        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        grad.addColorStop(0, 'rgba(30, 136, 229, 0.2)');
        grad.addColorStop(1, 'rgba(30, 136, 229, 0.02)');
        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = '#1E88E5';
        ctx.lineWidth = 2;
        ctx.stroke();

        points.forEach((p, i) => {
          const status = getTemperatureStatus(p.temp, minTemp, maxTemp);
          ctx.beginPath();
          ctx.arc(p.x, p.y, status === 'normal' ? 2 : 4, 0, Math.PI * 2);
          ctx.fillStyle = status === 'normal' ? '#1E88E5' : status === 'warning' ? '#FB8C00' : '#E53935';
          ctx.fill();
        });
      });
  }, [records, minTemp, maxTemp, canvasId]);

  if (records.length === 0) {
    return (
      <View className={styles.empty}>
        <Text className={styles.emptyText}>暂无温度记录</Text>
      </View>
    );
  }

  const compliantCount = records.filter(
    r => r.temperature >= minTemp && r.temperature <= maxTemp
  ).length;
  const compliance = Math.round((compliantCount / records.length) * 100);

  return (
    <View className={styles.container}>
      <View className={styles.statsRow}>
        <View className={styles.statItem}>
          <Text className={styles.statLabel}>平均温度</Text>
          <Text className={styles.statValue}>{stats.avg}℃</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statLabel}>最低/最高</Text>
          <Text className={styles.statValue}>{stats.min} / {stats.max}℃</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statLabel}>达标率</Text>
          <Text className={
            compliance >= 95 ? `${styles.statValue} ${styles.good}` :
            compliance >= 80 ? `${styles.statValue} ${styles.warn}` : `${styles.statValue} ${styles.bad}`
          }>{compliance}%</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statLabel}>记录点数</Text>
          <Text className={styles.statValue}>{records.length}</Text>
        </View>
      </View>
      <View className={styles.canvasWrap}>
        <Canvas
          id={canvasId}
          type="2d"
          style={`width: 100%; height: ${height}rpx;`}
          className={styles.canvas}
        />
      </View>
      <View className={styles.legend}>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ background: '#43A047' }} />
          <Text className={styles.legendText}>安全区间 {minTemp}~{maxTemp}℃</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ background: '#E53935' }} />
          <Text className={styles.legendText}>异常温度点</Text>
        </View>
      </View>
    </View>
  );
};

export default TempChart;
