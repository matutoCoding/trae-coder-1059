import React, { useState, useMemo, useRef } from 'react';
import { View, Text, Input, Textarea, Picker, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppContext } from '@/store/AppContext';
import type { CargoType, TemperatureRecord } from '@/types/order';
import { getRuleByCargoType, calculateFreight } from '@/utils/billing';
import { estimateDistance } from '@/utils/dispatch';
import { generateTemperatureRecords } from '@/utils/temperature';

const CARGO_OPTIONS: { value: CargoType; label: string; icon: string }[] = [
  { value: 'frozen', label: '冷冻品', icon: '🧊' },
  { value: 'chilled', label: '冷藏品', icon: '🥗' },
  { value: 'fresh', label: '鲜活品', icon: '🐟' },
  { value: 'medical', label: '医药品', icon: '💊' },
  { value: 'other', label: '其他', icon: '📦' }
];

const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆', '苏州', '天津', '长沙', '郑州', '青岛', '宁波'];

const TEMP_PRESETS: { label: string; min: number; max: number }[] = [
  { label: '深冷 -25~-15℃', min: -25, max: -15 },
  { label: '冷冻 -18~-10℃', min: -18, max: -10 },
  { label: '冷藏 0~5℃', min: 0, max: 5 },
  { label: '保鲜 2~8℃', min: 2, max: 8 },
  { label: '恒温 15~22℃', min: 15, max: 22 }
];

interface FormState {
  cargoName: string;
  cargoType: CargoType;
  cargoWeight: string;
  cargoVolume: string;
  origin: string;
  originAddress: string;
  destination: string;
  destinationAddress: string;
  transportStartTime: string;
  transportEndTime: string;
  minTemp: string;
  maxTemp: string;
  humidity: string;
  specialInstructions: string;
  shipperName: string;
  shipperPhone: string;
  receiverName: string;
  receiverPhone: string;
  needInsurance: boolean;
}

const YEARS = ['2025', '2026'];
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const DAYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'];
const HOURS = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
const MINUTES = ['00', '30'];

const TIME_RANGE = [YEARS, MONTHS, DAYS, HOURS, MINUTES];

const parseTimeToPickerValue = (timeStr: string): number[] => {
  if (!timeStr) return [1, 5, 18, 8, 0];
  const match = timeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return [1, 5, 18, 8, 0];
  const [, year, month, day, hour, minute] = match;
  return [
    Math.max(0, YEARS.indexOf(year)),
    Math.max(0, parseInt(month, 10) - 1),
    Math.max(0, parseInt(day, 10) - 1),
    Math.max(0, parseInt(hour, 10)),
    minute === '30' ? 1 : 0
  ];
};

const getDefaultTimes = () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
  };
  return {
    start: fmt(tomorrow),
    end: fmt(dayAfter)
  };
};

const defaultTimes = getDefaultTimes();

const initialForm: FormState = {
  cargoName: '',
  cargoType: 'frozen',
  cargoWeight: '',
  cargoVolume: '',
  origin: '上海',
  originAddress: '',
  destination: '杭州',
  destinationAddress: '',
  transportStartTime: defaultTimes.start,
  transportEndTime: defaultTimes.end,
  minTemp: '-18',
  maxTemp: '-10',
  humidity: '',
  specialInstructions: '',
  shipperName: '',
  shipperPhone: '',
  receiverName: '',
  receiverPhone: '',
  needInsurance: true
};

const OrderSubmitPage: React.FC = () => {
  const { submitOrder, vehicles } = useAppContext();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const estimated = useMemo(() => {
    if (form.origin && form.destination && form.origin !== form.destination) {
      const dist = estimateDistance(form.origin, form.destination);
      const hours = Math.max(2, Math.round(dist / 60));
      return { distance: dist, duration: hours };
    }
    return { distance: 0, duration: 0 };
  }, [form.origin, form.destination]);

  const billingRule = useMemo(() => getRuleByCargoType(form.cargoType), [form.cargoType]);

  const previewTempRecords = useMemo<TemperatureRecord[]>(() => {
    if (!form.transportStartTime || !form.transportEndTime) return [];
    try {
      return generateTemperatureRecords(
        form.transportStartTime,
        form.transportEndTime,
        Number(form.minTemp),
        Number(form.maxTemp)
      );
    } catch (e) {
      return [];
    }
  }, [form.transportStartTime, form.transportEndTime, form.minTemp, form.maxTemp]);

  const pricePreview = useMemo(() => {
    if (estimated.distance <= 0) return null;
    try {
      const result = calculateFreight(
        estimated.distance,
        billingRule,
        previewTempRecords,
        Number(form.minTemp),
        Number(form.maxTemp)
      );
      return result;
    } catch (e) {
      return null;
    }
  }, [estimated.distance, billingRule, previewTempRecords, form.minTemp, form.maxTemp]);

  const validate = (): string | null => {
    if (!form.cargoName.trim()) return '请输入货物名称';
    if (!form.cargoWeight || Number(form.cargoWeight) <= 0) return '请输入有效货物重量';
    if (!form.cargoVolume || Number(form.cargoVolume) <= 0) return '请输入有效货物体积';
    if (!form.origin || !form.destination) return '请选择起点和终点城市';
    if (form.origin === form.destination) return '起点与终点不能相同';
    if (!form.originAddress.trim()) return '请输入起点详细地址';
    if (!form.destinationAddress.trim()) return '请输入终点详细地址';
    if (!form.transportStartTime || !form.transportEndTime) return '请选择运输时间';
    if (new Date(form.transportEndTime) <= new Date(form.transportStartTime)) {
      return '运输结束时间必须晚于开始时间';
    }
    const minT = Number(form.minTemp);
    const maxT = Number(form.maxTemp);
    if (isNaN(minT) || isNaN(maxT)) return '请输入有效温度值';
    if (minT >= maxT) return '最低温度必须小于最高温度';
    if (!form.shipperName.trim()) return '请输入发货人姓名';
    if (!/^1[3-9]\d{9}$/.test(form.shipperPhone)) return '请输入发货人正确手机号';
    if (!form.receiverName.trim()) return '请输入收货人姓名';
    if (!/^1[3-9]\d{9}$/.test(form.receiverPhone)) return '请输入收货人正确手机号';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      Taro.showToast({ title: error, icon: 'none', duration: 2000 });
      return;
    }

    setSubmitting(true);
    try {
      await Taro.showLoading({ title: '智能匹配中...', mask: true });

      const { order, dispatchResult, bill } = submitOrder(
        {
          cargoName: form.cargoName.trim(),
          cargoType: form.cargoType,
          cargoWeight: Number(form.cargoWeight),
          cargoVolume: Number(form.cargoVolume),
          origin: form.origin,
          originAddress: form.originAddress.trim(),
          destination: form.destination,
          destinationAddress: form.destinationAddress.trim(),
          transportStartTime: form.transportStartTime,
          transportEndTime: form.transportEndTime,
          requirement: {
            minTemp: Number(form.minTemp),
            maxTemp: Number(form.maxTemp),
            humidity: form.humidity ? Number(form.humidity) : undefined,
            specialInstructions: form.specialInstructions.trim() || undefined
          },
          estimatedDistance: estimated.distance,
          estimatedDuration: estimated.duration,
          shipperName: form.shipperName.trim(),
          shipperPhone: form.shipperPhone.trim(),
          receiverName: form.receiverName.trim(),
          receiverPhone: form.receiverPhone.trim()
        },
        { presetTemperatureRecords: previewTempRecords }
      );

      Taro.hideLoading();

      if (dispatchResult.success && bill) {
        Taro.showModal({
          title: '✅ 智能匹配成功',
          content: `订单号：${order.orderNo}\n已为您分配最优车辆：${dispatchResult.assignedVehicle?.plateNumber}\n综合匹配度：${(dispatchResult.score || 0).toFixed(1)}分\n预估运费：¥${bill.totalAmount.toFixed(2)}\n计费规则：${bill.appliedRule}\n\n点击确认查看订单详情`,
          showCancel: true,
          cancelText: '返回列表',
          confirmText: '查看详情',
          confirmColor: '#1E88E5',
          success: (res) => {
            if (res.confirm) {
              Taro.redirectTo({ url: `/pages/order-detail/index?id=${order.id}` });
            } else {
              Taro.switchTab({ url: '/pages/order/index' });
            }
          }
        });
      } else {
        Taro.showModal({
          title: '⚠️ 订单已提交',
          content: `订单号：${order.orderNo}\n当前无符合条件的空闲车辆，已进入待分配池，系统将持续为您自动匹配。\n\n${dispatchResult.message || ''}`,
          showCancel: true,
          cancelText: '返回列表',
          confirmText: '去分配池',
          confirmColor: '#FB8C00',
          success: (res) => {
            if (res.confirm) {
              Taro.switchTab({ url: '/pages/dispatch/index' });
            } else {
              Taro.switchTab({ url: '/pages/order/index' });
            }
          }
        });
      }
    } catch (e: any) {
      Taro.hideLoading();
      Taro.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const applyTempPreset = (p: typeof TEMP_PRESETS[number]) => {
    updateField('minTemp', String(p.min));
    updateField('maxTemp', String(p.max));
  };

  const fmtDate = (dt: string) => dt.replace(' ', 'T').slice(0, 16);
  const fmtDisplay = (dt: string) => dt;

  const idleCount = vehicles.filter(v => v.status === 'idle').length;

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.content}>
        <View className={styles.intelligentCard}>
          <View className={styles.intelligentIcon}>🤖</View>
          <View className={styles.intelligentContent}>
            <Text className={styles.intelligentTitle}>
              AI 智能分配
              <Text className={styles.intelligentBadge}>无需指定车辆</Text>
            </Text>
            <Text className={styles.intelligentText}>
              您只需提交运输需求和时间，系统将从 {idleCount} 辆空闲冷藏车中，基于{' '}
              温度匹配度、装载率、负载均衡、地理距离 等多维度评分，自动选择最优车辆，避免资源碎片。
            </Text>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>📍 路线信息</Text>
          <View className={styles.routeCard}>
            <View className={styles.routeConnector} />
            <View className={styles.routeLine}>
              <View className={`${styles.routeDot} ${styles.origin}`} />
              <View className={styles.routeContent}>
                <Text className={styles.routeLabel}>装货城市</Text>
                <Picker
                  mode="selector"
                  range={CITIES}
                  value={CITIES.indexOf(form.origin)}
                  onChange={(e) => updateField('origin', CITIES[Number(e.detail.value)])}
                >
                  <View className={styles.pickerWrap}>
                    <View style={{ paddingVertical: 4 }}>
                      <Text className={styles.routeCity}>{form.origin} ›</Text>
                    </View>
                  </View>
                </Picker>
              </View>
            </View>
            <View className={styles.routeLine}>
              <View className={`${styles.routeDot} ${styles.dest}`} />
              <View className={styles.routeContent}>
                <Text className={styles.routeLabel}>卸货城市</Text>
                <Picker
                  mode="selector"
                  range={CITIES}
                  value={CITIES.indexOf(form.destination)}
                  onChange={(e) => updateField('destination', CITIES[Number(e.detail.value)])}
                >
                  <View className={styles.pickerWrap}>
                    <View style={{ paddingVertical: 4 }}>
                      <Text className={styles.routeCity}>{form.destination} ›</Text>
                    </View>
                  </View>
                </Picker>
              </View>
            </View>
          </View>

          {estimated.distance > 0 && (
            <View className={styles.estimateInfo}>
              <View className={styles.estimateItem}>
                <Text className={styles.estimateNum}>{estimated.distance} km</Text>
                <Text className={styles.estimateLabel}>预估里程</Text>
              </View>
              <View className={styles.estimateItem}>
                <Text className={styles.estimateNum}>{estimated.duration} h</Text>
                <Text className={styles.estimateLabel}>预估时长</Text>
              </View>
            </View>
          )}

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>装货详细地址
            </Text>
            <Input
              className={styles.formInput}
              placeholder="请输入装货地址（含仓库/厂区/门牌号）"
              placeholderClass={styles.pickerPlaceholder}
              value={form.originAddress}
              onInput={(e) => updateField('originAddress', e.detail.value)}
            />
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>卸货详细地址
            </Text>
            <Input
              className={styles.formInput}
              placeholder="请输入卸货地址（含仓库/厂区/门牌号）"
              placeholderClass={styles.pickerPlaceholder}
              value={form.destinationAddress}
              onInput={(e) => updateField('destinationAddress', e.detail.value)}
            />
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>📦 货物信息</Text>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>货物类型
            </Text>
            <View className={styles.cargoTypes}>
              {CARGO_OPTIONS.map(c => (
                <View
                  key={c.value}
                  className={`${styles.cargoTypeTag} ${form.cargoType === c.value ? styles.active : ''}`}
                  onClick={() => updateField('cargoType', c.value)}
                >
                  <Text>{c.icon}</Text>
                  <Text>{c.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>货物名称
            </Text>
            <Input
              className={styles.formInput}
              placeholder="例如：冷冻鸡胸肉、疫苗、草莓"
              placeholderClass={styles.pickerPlaceholder}
              value={form.cargoName}
              onInput={(e) => updateField('cargoName', e.detail.value)}
            />
          </View>

          <View className={styles.rowGrid}>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>重量(吨)
              </Text>
              <Input
                className={styles.formInput}
                type="digit"
                placeholder="例如：3.5"
                placeholderClass={styles.pickerPlaceholder}
                value={form.cargoWeight}
                onInput={(e) => updateField('cargoWeight', e.detail.value)}
              />
            </View>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>体积(m³)
              </Text>
              <Input
                className={styles.formInput}
                type="digit"
                placeholder="例如：12"
                placeholderClass={styles.pickerPlaceholder}
                value={form.cargoVolume}
                onInput={(e) => updateField('cargoVolume', e.detail.value)}
              />
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>⏰ 运输时间</Text>
          <View className={styles.rowGrid}>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>预计装货时间
              </Text>
              <Picker
                mode="multiSelector"
                range={TIME_RANGE}
                value={parseTimeToPickerValue(form.transportStartTime)}
                onChange={(e) => {
                  const [yIdx, mIdx, dIdx, hIdx, mmIdx] = e.detail.value as number[];
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const year = YEARS[yIdx];
                  const month = pad(mIdx + 1);
                  const day = pad(dIdx + 1);
                  const hour = pad(hIdx);
                  const minute = MINUTES[mmIdx];
                  updateField('transportStartTime', `${year}-${month}-${day} ${hour}:${minute}`);
                }}
              >
                <View className={styles.pickerWrap}>
                  <View className={styles.pickerValue}>
                    <Text>{fmtDisplay(form.transportStartTime)}</Text>
                    <Text className={styles.pickerArrow}>›</Text>
                  </View>
                </View>
              </Picker>
            </View>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>要求送达时间
              </Text>
              <Picker
                mode="multiSelector"
                range={TIME_RANGE}
                value={parseTimeToPickerValue(form.transportEndTime)}
                onChange={(e) => {
                  const [yIdx, mIdx, dIdx, hIdx, mmIdx] = e.detail.value as number[];
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const year = YEARS[yIdx];
                  const month = pad(mIdx + 1);
                  const day = pad(dIdx + 1);
                  const hour = pad(hIdx);
                  const minute = MINUTES[mmIdx];
                  updateField('transportEndTime', `${year}-${month}-${day} ${hour}:${minute}`);
                }}
              >
                <View className={styles.pickerWrap}>
                  <View className={styles.pickerValue}>
                    <Text>{fmtDisplay(form.transportEndTime)}</Text>
                    <Text className={styles.pickerArrow}>›</Text>
                  </View>
                </View>
              </Picker>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>❄️ 温控要求</Text>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>温度范围(℃)
            </Text>
            <View className={styles.tempRangeRow}>
              <View className={styles.tempInputWrap}>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="最低温度"
                  placeholderClass={styles.pickerPlaceholder}
                  value={form.minTemp}
                  onInput={(e) => updateField('minTemp', e.detail.value)}
                />
              </View>
              <Text className={styles.tempSeparator}>~</Text>
              <View className={styles.tempInputWrap}>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="最高温度"
                  placeholderClass={styles.pickerPlaceholder}
                  value={form.maxTemp}
                  onInput={(e) => updateField('maxTemp', e.detail.value)}
                />
              </View>
            </View>
            <View className={styles.tempPresetRow}>
              {TEMP_PRESETS.map(p => (
                <View key={p.label} className={styles.tempPreset} onClick={() => applyTempPreset(p)}>
                  {p.label}
                </View>
              ))}
            </View>
          </View>

          <View className={styles.rowGrid}>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>湿度要求(%RH)</Text>
              <Input
                className={styles.formInput}
                type="number"
                placeholder="选填"
                placeholderClass={styles.pickerPlaceholder}
                value={form.humidity}
                onInput={(e) => updateField('humidity', e.detail.value)}
              />
            </View>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>货物保价</Text>
              <View className={styles.switchRow} style={{ height: 80, paddingLeft: 0 }}>
                <Text className={styles.switchLabel}>冷链货运险</Text>
                <Switch
                  checked={form.needInsurance}
                  onChange={(e) => updateField('needInsurance', e.detail.value)}
                  color="#1E88E5"
                />
              </View>
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>特殊说明</Text>
            <Textarea
              className={styles.formTextarea}
              placeholder="选填：如装卸要求、禁混装货物、优先配送等"
              placeholderClass={styles.pickerPlaceholder}
              value={form.specialInstructions}
              onInput={(e) => updateField('specialInstructions', e.detail.value)}
              maxlength={200}
            />
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>👥 联系人信息</Text>

          <View className={styles.personCard}>
            <View className={`${styles.personAvatar} ${styles.shipper}`}>发</View>
            <View className={styles.personFields}>
              <Text className={styles.formLabel} style={{ marginBottom: 0 }}>发货人</Text>
              <View className={styles.personInputs}>
                <Input
                  className={styles.formInput}
                  style={{ flex: 1 }}
                  placeholder="姓名"
                  placeholderClass={styles.pickerPlaceholder}
                  value={form.shipperName}
                  onInput={(e) => updateField('shipperName', e.detail.value)}
                />
                <Input
                  className={styles.formInput}
                  style={{ flex: 1.2 }}
                  type="number"
                  placeholder="手机号"
                  placeholderClass={styles.pickerPlaceholder}
                  value={form.shipperPhone}
                  onInput={(e) => updateField('shipperPhone', e.detail.value)}
                  maxlength={11}
                />
              </View>
            </View>
          </View>

          <View className={styles.personCard}>
            <View className={`${styles.personAvatar} ${styles.receiver}`}>收</View>
            <View className={styles.personFields}>
              <Text className={styles.formLabel} style={{ marginBottom: 0 }}>收货人</Text>
              <View className={styles.personInputs}>
                <Input
                  className={styles.formInput}
                  style={{ flex: 1 }}
                  placeholder="姓名"
                  placeholderClass={styles.pickerPlaceholder}
                  value={form.receiverName}
                  onInput={(e) => updateField('receiverName', e.detail.value)}
                />
                <Input
                  className={styles.formInput}
                  style={{ flex: 1.2 }}
                  type="number"
                  placeholder="手机号"
                  placeholderClass={styles.pickerPlaceholder}
                  value={form.receiverPhone}
                  onInput={(e) => updateField('receiverPhone', e.detail.value)}
                  maxlength={11}
                />
              </View>
            </View>
          </View>
        </View>

        {pricePreview && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>💰 费用预估</Text>
            <View className={styles.pricePreview}>
              <View className={styles.priceRow}>
                <Text className={styles.priceLabel}>计费规则</Text>
                <Text className={styles.priceValue}>{billingRule.name}</Text>
              </View>
              <View className={styles.priceRow}>
                <Text className={styles.priceLabel}>
                  <Text className={`${styles.tagMini} ${styles.start}`}>起步</Text>
                  {estimated.distance <= billingRule.baseDistance ? '(含全程)' : `(含前${billingRule.baseDistance}km)`}
                </Text>
                <Text className={styles.priceValue}>¥{pricePreview.startPrice.toFixed(2)}</Text>
              </View>
              {pricePreview.mileagePrice > 0 && (
                <View className={styles.priceRow}>
                  <Text className={styles.priceLabel}>
                    超里程 × {billingRule.pricePerKm}元
                  </Text>
                  <Text className={styles.priceValue}>¥{pricePreview.mileagePrice.toFixed(2)}</Text>
                </View>
              )}
              {pricePreview.appliedCap && (
                <View className={styles.priceRow}>
                  <Text className={styles.priceLabel}>
                    <Text className={`${styles.tagMini} ${styles.cap}`}>封顶</Text>
                    长途封顶拦截
                  </Text>
                  <Text className={styles.priceValue} style={{ color: '#7B1FA2' }}>
                    -¥{(pricePreview.startPrice + pricePreview.mileagePrice - billingRule.capPrice).toFixed(2)}
                  </Text>
                </View>
              )}
              <View className={styles.priceRow}>
                <Text className={styles.priceLabel}>
                  <Text className={`${styles.tagMini} ${styles.reward}`}>温控</Text>
                  预估温度奖励
                </Text>
                <Text className={styles.priceValue} style={{ color: '#43A047' }}>
                  +¥{(billingRule.basePrice * 0.03).toFixed(2)}
                </Text>
              </View>
              <View className={`${styles.priceRow} ${styles.highlight}`}>
                <Text className={styles.priceLabel} style={{ fontSize: 28, fontWeight: 600 }}>预估运费</Text>
                <Text className={`${styles.priceValue} ${styles.big}`}>
                  ¥{(pricePreview.totalAmount + billingRule.basePrice * 0.03).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View className={styles.submitBar}>
        <View
          className={styles.btnSubmit}
          onClick={handleSubmit}
          style={submitting ? { opacity: 0.6 } : {}}
        >
          {submitting ? '智能匹配车辆中...' : '提交需求 · AI自动分配车辆'}
        </View>
      </View>
    </ScrollView>
  );
};

export default OrderSubmitPage;
