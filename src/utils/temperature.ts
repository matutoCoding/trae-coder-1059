import type { TemperatureRecord } from '@/types/order';

export const generateTemperatureRecords = (
  startTime: string,
  endTime: string,
  targetMin: number,
  targetMax: number,
  anomalyRate: number = 0.05
): TemperatureRecord[] => {
  const records: TemperatureRecord[] = [];
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const interval = 15 * 60 * 1000;

  for (let t = start; t <= end; t += interval) {
    const date = new Date(t);
    const progress = (t - start) / (end - start);

    let baseTemp = (targetMin + targetMax) / 2;
    const wave = Math.sin(progress * Math.PI * 4) * ((targetMax - targetMin) * 0.2);
    let temp = baseTemp + wave;

    if (Math.random() < anomalyRate) {
      const anomalyDirection = Math.random() > 0.5 ? 1 : -1;
      temp += anomalyDirection * (targetMax - targetMin + 2 + Math.random() * 3);
    }

    temp = Math.round(temp * 10) / 10;

    const humidity = Math.round((75 + Math.random() * 15) * 10) / 10;

    records.push({
      timestamp: date.toISOString(),
      temperature: temp,
      humidity,
      location: progress < 0.1 ? '起点仓库' : progress > 0.9 ? '目的地仓库' : '运输途中'
    });
  }

  console.log('[Temperature] 生成温度记录:', {
    records: records.length,
    timeRange: `${startTime} ~ ${endTime}`
  });

  return records;
};

export const getTemperatureStatus = (
  temp: number,
  minTemp: number,
  maxTemp: number
): 'normal' | 'warning' | 'danger' => {
  const buffer = (maxTemp - minTemp) * 0.1;
  if (temp < minTemp - buffer || temp > maxTemp + buffer) return 'danger';
  if (temp < minTemp || temp > maxTemp) return 'warning';
  return 'normal';
};

export const getTempStats = (records: TemperatureRecord[]) => {
  if (!records || records.length === 0) {
    return { min: 0, max: 0, avg: 0 };
  }
  const temps = records.map(r => r.temperature);
  return {
    min: Math.min(...temps),
    max: Math.max(...temps),
    avg: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10
  };
};
