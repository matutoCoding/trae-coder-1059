import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import Tag from '@/components/Tag';
import TempChart from '@/components/TempChart';
import { getRuleByCargoType, calculateFreight } from '@/utils/billing';
import type { OrderStatus } from '@/types/order';

const STATUS_INFO: Record<OrderStatus, { text: string; cls: string }> = {
  pending: { text: '⏳ 等待系统分配车辆', cls: styles.statusPending },
  assigned: { text: '✅ 已匹配最优冷藏车', cls: styles.statusAssigned },
  loading: { text: '📦 货物装货中', cls: styles.statusAssigned },
  transit: { text: '🚛 冷链运输中', cls: styles.statusTransit },
  delivered: { text: '📬 货物已送达', cls: styles.statusDone },
  completed: { text: '🎉 运输任务完成', cls: styles.statusDone },
  cancelled: { text: '❌ 已取消', cls: styles.statusPending }
};

const CARGO_TYPE_MAP = {
  frozen: '冷冻货物',
  chilled: '冷藏货物',
  fresh: '新鲜果蔬',
  medical: '医药冷链',
  other: '其他货物'
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const { getOrderById, getVehicleById, getBillByOrderId } = useAppContext();
  const orderId = router.params.id || '';
  const order = useMemo(() => getOrderById(orderId), [orderId, getOrderById]);
  const vehicle = useMemo(
    () => order?.assignedVehicleId ? getVehicleById(order.assignedVehicleId) : undefined,
    [order, getVehicleById]
  );
  const bill = useMemo(
    () => getBillByOrderId(orderId),
    [orderId, getBillByOrderId]
  );

  const estBill = useMemo(() => {
    if (!order) return null;
    const rule = getRuleByCargoType(order.cargoType);
    return calculateFreight(
      order.estimatedDistance, rule, order.temperatureRecords,
      order.requirement.minTemp, order.requirement.maxTemp
    );
  }, [order]);

  if (!order) {
    return (
      <View style={{ padding: 100, textAlign: 'center' }}>
        <Text style={{ color: '#90A4AE' }}>订单不存在</Text>
      </View>
    );
  }

  const st = STATUS_INFO[order.status];
  const needTemp = order.temperatureRecords.length > 0;

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.content}>
        <View className={classnames(styles.statusBanner, st.cls)}>
          <Text className={styles.statusText}>{st.text}</Text>
          <Text className={styles.orderNoSmall}>订单号：{order.orderNo}</Text>
        </View>

        <View className={styles.sectionCard}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionName}>📍 运输路线</Text>
            <Tag text={`${order.estimatedDistance.toFixed(0)}km`} type="info" />
          </View>
          <View className={styles.routeFlow}>
            <View className={styles.routeCol}>
              <Text className={styles.routePointLabel}>起运地</Text>
              <Text className={styles.routeCity}>{order.origin}</Text>
              <Text className={styles.routeAddr}>{order.originAddress}</Text>
              <Text style={{ marginTop: 12, fontSize: 22, color: '#90A4AE' }}>
                🕒 {fmtDate(order.transportStartTime)}
              </Text>
            </View>
            <View className={styles.routeArrow}>
              <Text className={styles.arrowIcon}>➤➤</Text>
              <Text className={styles.arrowInfo}>{order.estimatedDuration}h</Text>
            </View>
            <View className={styles.routeCol}>
              <Text className={styles.routePointLabel}>目的地</Text>
              <Text className={styles.routeCity}>{order.destination}</Text>
              <Text className={styles.routeAddr}>{order.destinationAddress}</Text>
              <Text style={{ marginTop: 12, fontSize: 22, color: '#90A4AE' }}>
                🕒 {fmtDate(order.transportEndTime)}
              </Text>
            </View>
          </View>
        </View>

        <View className={styles.sectionCard}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionName}>❄️ 货物信息</Text>
            <Tag text={CARGO_TYPE_MAP[order.cargoType]} type="primary" />
          </View>
          <View className={styles.infoPair}>
            <Text className={styles.infoKey}>货物名称</Text>
            <Text className={styles.infoVal}>{order.cargoName}</Text>
          </View>
          <View className={styles.infoPair}>
            <Text className={styles.infoKey}>货物规格</Text>
            <Text className={styles.infoVal}>{order.cargoWeight} 吨 / {order.cargoVolume} m³</Text>
          </View>
          <View className={styles.infoPair}>
            <Text className={styles.infoKey}>温度要求</Text>
            <View className={styles.tempBadge}>❄️ {order.requirement.minTemp} ~ {order.requirement.maxTemp} ℃</View>
          </View>
          {order.requirement.humidity && (
            <View className={styles.infoPair}>
              <Text className={styles.infoKey}>湿度要求</Text>
              <Text className={styles.infoVal}>{order.requirement.humidity}% RH</Text>
            </View>
          )}
          {order.requirement.specialInstructions && (
            <View className={styles.infoPair}>
              <Text className={styles.infoKey}>特殊要求</Text>
              <Text className={styles.infoVal} style={{ maxWidth: 400, textAlign: 'right' }}>
                {order.requirement.specialInstructions}
              </Text>
            </View>
          )}
        </View>

        {vehicle && (
          <View className={styles.sectionCard}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionName}>🚛 分配车辆</Text>
              <Tag text="智能匹配最优" type="success" />
            </View>
            <View className={styles.infoPair}>
              <Text className={styles.infoKey}>车牌号</Text>
              <Text className={styles.infoVal} style={{ color: '#1E88E5', fontWeight: 700 }}>
                {vehicle.plateNumber}
              </Text>
            </View>
            <View className={styles.infoPair}>
              <Text className={styles.infoKey}>车型</Text>
              <Text className={styles.infoVal}>{vehicle.vehicleType}</Text>
            </View>
            <View className={styles.infoPair}>
              <Text className={styles.infoKey}>制冷等级</Text>
              <Text className={styles.infoVal}>{vehicle.refrigerationLevel} 级（{vehicle.minTemp}~{vehicle.maxTemp}℃）</Text>
            </View>
            <View className={styles.infoPair}>
              <Text className={styles.infoKey}>司机</Text>
              <Text className={styles.infoVal}>{vehicle.driverName} · {vehicle.driverPhone}</Text>
            </View>
          </View>
        )}

        {needTemp && (
          <View style={{ marginBottom: 24 }}>
            <View className="sectionTitle">🌡️ 全程温度监控</View>
            <TempChart
              records={order.temperatureRecords}
              minTemp={order.requirement.minTemp}
              maxTemp={order.requirement.maxTemp}
              height={320}
            />
          </View>
        )}

        {(bill || estBill) && (
          <View className={styles.sectionCard}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionName}>💰 费用明细</Text>
              {bill ? <Tag text="已对账" type="success" /> : <Tag text="预估" type="warning" />}
            </View>
            <View className={styles.billPreview}>
              {(bill || estBill)?.details.map((d, i) => (
                <View key={i} className={styles.billRow}>
                  <Text className={styles.billLabel}>{d.label}</Text>
                  <Text className={styles.billValue}>
                    {d.value >= 0 ? '+' : ''}¥{d.value.toFixed(2)}
                    {d.unit && d.unit !== '元' ? ` (${d.unit})` : ''}
                  </Text>
                </View>
              ))}
              <View className={classnames(styles.billRow, styles.totalRow)}>
                <Text className={styles.billLabel}>合计运费</Text>
                <Text className={styles.billValue}>¥{(bill?.totalAmount ?? estBill?.totalAmount ?? 0).toFixed(2)}</Text>
              </View>
            </View>
            <View style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              {(bill?.isStartPriceApplied || estBill?.isStartPriceApplied) && (
                <Tag text="起步价生效" type="startPrice" />
              )}
              {(bill?.isCapPriceApplied || estBill?.isCapPriceApplied) && (
                <Tag text="封顶价拦截" type="capPrice" />
              )}
              <Tag text={`温控达标 ${bill?.temperatureCompliance ?? estBill?.temperatureCompliance ?? 100}%`} type="info" />
            </View>
          </View>
        )}

        <View className={styles.sectionCard}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionName}>📞 联系信息</Text>
          </View>
          <View className={styles.infoPair}>
            <Text className={styles.infoKey}>发货人</Text>
            <Text className={styles.infoVal}>{order.shipperName} · {order.shipperPhone}</Text>
          </View>
          <View className={styles.infoPair}>
            <Text className={styles.infoKey}>收货人</Text>
            <Text className={styles.infoVal}>{order.receiverName} · {order.receiverPhone}</Text>
          </View>
          <View className={styles.infoPair}>
            <Text className={styles.infoKey}>创建时间</Text>
            <Text className={styles.infoVal}>{fmtDate(order.createTime)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default OrderDetailPage;
