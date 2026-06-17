import React, { useState } from 'react';
import { View, Text, Input, Textarea, Picker, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppContext } from '@/store/AppContext';
import type { VehicleStatus, RefrigerationLevel } from '@/types/vehicle';

const VEHICLE_TYPES = ['4.2米冷藏车', '6.8米冷藏车', '9.6米冷藏车', '13米冷藏车', '17.5米冷藏车', '医药冷藏车'];
const REFRIGERATION_LEVELS: RefrigerationLevel[] = ['A', 'B', 'C', 'D', 'E', 'F'];
const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'idle', label: '空闲' },
  { value: 'running', label: '运输中' },
  { value: 'maintain', label: '维护中' }
];
const LOCATIONS = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆'];

interface FormState {
  plateNumber: string;
  vehicleType: string;
  loadCapacity: string;
  volume: string;
  minTemp: string;
  maxTemp: string;
  refrigerationLevel: RefrigerationLevel;
  status: VehicleStatus;
  driverName: string;
  driverPhone: string;
  purchaseDate: string;
  maintenanceDate: string;
  currentLocation: string;
}

const initialForm: FormState = {
  plateNumber: '',
  vehicleType: '',
  loadCapacity: '',
  volume: '',
  minTemp: '-20',
  maxTemp: '8',
  refrigerationLevel: 'C',
  status: 'idle',
  driverName: '',
  driverPhone: '',
  purchaseDate: '2024-01-01',
  maintenanceDate: '2025-06-01',
  currentLocation: '上海'
};

const VehicleAddPage: React.FC = () => {
  const { addVehicle } = useAppContext();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!form.plateNumber.trim()) return '请输入车牌号';
    if (!/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5,6}$/.test(form.plateNumber.toUpperCase())) {
      return '车牌号格式不正确';
    }
    if (!form.vehicleType) return '请选择车型';
    if (!form.loadCapacity || Number(form.loadCapacity) <= 0) return '请输入有效载重';
    if (!form.volume || Number(form.volume) <= 0) return '请输入有效容积';
    const minT = Number(form.minTemp);
    const maxT = Number(form.maxTemp);
    if (isNaN(minT) || isNaN(maxT)) return '请输入有效温度值';
    if (minT >= maxT) return '最低温度必须小于最高温度';
    if (maxT > 25) return '冷藏车最高温度不能超过25℃';
    if (minT < -40) return '冷藏车最低温度不能低于-40℃';
    if (!form.driverName.trim()) return '请输入司机姓名';
    if (!form.driverPhone.trim() || !/^1[3-9]\d{9}$/.test(form.driverPhone)) return '请输入正确的手机号';
    if (!form.currentLocation) return '请选择所在城市';
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
      await Taro.showLoading({ title: '保存中...', mask: true });

      addVehicle({
        plateNumber: form.plateNumber.toUpperCase(),
        vehicleType: form.vehicleType,
        loadCapacity: Number(form.loadCapacity),
        volume: Number(form.volume),
        minTemp: Number(form.minTemp),
        maxTemp: Number(form.maxTemp),
        refrigerationLevel: form.refrigerationLevel,
        status: form.status,
        driverName: form.driverName.trim(),
        driverPhone: form.driverPhone.trim(),
        purchaseDate: form.purchaseDate,
        maintenanceDate: form.maintenanceDate,
        currentLocation: form.currentLocation
      });

      Taro.hideLoading();
      Taro.showToast({ title: '建档成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1200);
    } catch (e) {
      Taro.hideLoading();
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    Taro.showModal({
      title: '确认重置',
      content: '确定清空已填写的内容吗？',
      success: (res) => {
        if (res.confirm) setForm(initialForm);
      }
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.content}>
        <View className={styles.tipsCard}>
          <Text className={styles.tipsTitle}>📋 建档须知</Text>
          <Text className={styles.tipsText}>
            请准确填写冷藏车的温度参数和制冷等级，系统将根据温控能力智能匹配运输订单。制冷等级A-F对应不同温度区间，F级为深冷级。
          </Text>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>车辆基础信息</Text>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>车牌号
            </Text>
            <Input
              className={styles.formInput}
              placeholder="例如：沪A88888"
              placeholderClass={styles.pickerPlaceholder}
              value={form.plateNumber}
              onInput={(e) => updateField('plateNumber', e.detail.value)}
              maxlength={8}
            />
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>车型
            </Text>
            <View className={styles.vehicleTypes}>
              {VEHICLE_TYPES.map(t => (
                <View
                  key={t}
                  className={`${styles.typeTag} ${form.vehicleType === t ? styles.active : ''}`}
                  onClick={() => updateField('vehicleType', t)}
                >
                  {t}
                </View>
              ))}
            </View>
          </View>

          <View className={styles.rowGrid}>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>载重(吨)
              </Text>
              <Input
                className={styles.formInput}
                type="digit"
                placeholder="例如：10"
                placeholderClass={styles.pickerPlaceholder}
                value={form.loadCapacity}
                onInput={(e) => updateField('loadCapacity', e.detail.value)}
              />
            </View>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>容积(m³)
              </Text>
              <Input
                className={styles.formInput}
                type="digit"
                placeholder="例如：38"
                placeholderClass={styles.pickerPlaceholder}
                value={form.volume}
                onInput={(e) => updateField('volume', e.detail.value)}
              />
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>❄️ 制冷参数配置</Text>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>温度范围(℃)
            </Text>
            <View className={styles.tempRangeRow}>
              <View className={styles.tempInputWrap}>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="最低温"
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
                  placeholder="最高温"
                  placeholderClass={styles.pickerPlaceholder}
                  value={form.maxTemp}
                  onInput={(e) => updateField('maxTemp', e.detail.value)}
                />
              </View>
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>制冷等级（A-F级）
            </Text>
            <View className={styles.levelOptions}>
              {REFRIGERATION_LEVELS.map(l => (
                <View
                  key={l}
                  className={`${styles.levelOption} ${form.refrigerationLevel === l ? styles.active : ''}`}
                  onClick={() => updateField('refrigerationLevel', l)}
                >
                  {l}级
                </View>
              ))}
            </View>
          </View>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>当前状态</Text>
            <View className={styles.statusOptions}>
              {STATUS_OPTIONS.map(s => (
                <View
                  key={s.value}
                  className={`${styles.statusOption} ${s.value} ${form.status === s.value ? styles.active : ''}`}
                  onClick={() => updateField('status', s.value)}
                >
                  {s.label}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>👤 司机信息</Text>

          <View className={styles.rowGrid}>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>司机姓名
              </Text>
              <Input
                className={styles.formInput}
                placeholder="请输入姓名"
                placeholderClass={styles.pickerPlaceholder}
                value={form.driverName}
                onInput={(e) => updateField('driverName', e.detail.value)}
                maxlength={10}
              />
            </View>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>联系电话
              </Text>
              <Input
                className={styles.formInput}
                type="number"
                placeholder="11位手机号"
                placeholderClass={styles.pickerPlaceholder}
                value={form.driverPhone}
                onInput={(e) => updateField('driverPhone', e.detail.value)}
                maxlength={11}
              />
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>📍 位置与维护</Text>

          <View className={styles.formItem}>
            <Text className={styles.formLabel}>
              <Text className={styles.required}>*</Text>当前所在城市
            </Text>
            <Picker
              mode="selector"
              range={LOCATIONS}
              value={LOCATIONS.indexOf(form.currentLocation)}
              onChange={(e) => updateField('currentLocation', LOCATIONS[Number(e.detail.value)])}
            >
              <View className={styles.pickerWrap}>
                <View className={styles.pickerValue}>
                  <Text className={form.currentLocation ? '' : styles.pickerPlaceholder}>
                    {form.currentLocation || '请选择城市'}
                  </Text>
                  <Text className={styles.pickerArrow}>›</Text>
                </View>
              </View>
            </Picker>
          </View>

          <View className={styles.rowGrid}>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>购车日期</Text>
              <Picker
                mode="date"
                value={form.purchaseDate}
                onChange={(e) => updateField('purchaseDate', e.detail.value)}
              >
                <View className={styles.pickerWrap}>
                  <View className={styles.pickerValue}>
                    <Text>{form.purchaseDate}</Text>
                    <Text className={styles.pickerArrow}>›</Text>
                  </View>
                </View>
              </Picker>
            </View>
            <View className={`${styles.formItem} ${styles.rowItem}`}>
              <Text className={styles.formLabel}>上次保养</Text>
              <Picker
                mode="date"
                value={form.maintenanceDate}
                onChange={(e) => updateField('maintenanceDate', e.detail.value)}
              >
                <View className={styles.pickerWrap}>
                  <View className={styles.pickerValue}>
                    <Text>{form.maintenanceDate}</Text>
                    <Text className={styles.pickerArrow}>›</Text>
                  </View>
                </View>
              </Picker>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.submitBar}>
        <View className={styles.btnReset} onClick={handleReset}>重置</View>
        <View
          className={styles.btnSubmit}
          onClick={handleSubmit}
          style={submitting ? { opacity: 0.6 } : {}}
        >
          {submitting ? '保存中...' : '确认建档'}
        </View>
      </View>
    </ScrollView>
  );
};

export default VehicleAddPage;
