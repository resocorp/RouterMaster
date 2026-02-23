'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ServicePlanForm, { ServicePlanFormData } from '@/components/ServicePlanForm';

export default function NewServicePlanPage() {
  const router = useRouter();

  const handleSubmit = async (data: ServicePlanFormData) => {
    const dailyTimeSecs = data.dailyTimeHours * 3600 + data.dailyTimeMinutes * 60 + data.dailyTimeSeconds;
    const payload: any = {
      name: data.name,
      description: data.description || undefined,
      enabled: data.enabled,
      availableUcp: data.availableUcp,
      planType: data.planType,
      capDownload: data.capDownload,
      capUpload: data.capUpload,
      capTotal: data.capTotal,
      capExpiry: data.capExpiry,
      capTime: data.capTime,
      rateDl: data.rateDl,
      rateUl: data.rateUl,
      ciscoPolicyDl: data.ciscoPolicyDl || undefined,
      ciscoPolicyUl: data.ciscoPolicyUl || undefined,
      dailyDlMb: data.dailyDlMb,
      dailyUlMb: data.dailyUlMb,
      dailyTotalMb: data.dailyTotalMb,
      dailyTimeSecs,
      burstEnabled: data.burstEnabled,
      burstLimitDl: data.burstLimitDl,
      burstLimitUl: data.burstLimitUl,
      burstThreshDl: data.burstThreshDl,
      burstThreshUl: data.burstThreshUl,
      burstTimeDl: data.burstTimeDl,
      burstTimeUl: data.burstTimeUl,
      priority: data.priority,
      ipPool: data.ipPool || undefined,
      nextDisabledId: data.nextDisabledId || null,
      nextExpiredId: data.nextExpiredId || null,
      nextDailyId: data.nextDailyId || null,
      ignoreStaticIp: data.ignoreStaticIp,
      customAttrs: data.customAttrs ? data.customAttrs.split('\n').filter(Boolean) : [],
      generateTftp: data.generateTftp,
      advancedCm: data.advancedCm ? 'enabled' : null,
      allowedNasIds: data.allowedNasIds,
      allowedManagerIds: data.allowedManagerIds,
      // Accounting fields
      postpaidCalcDl: data.postpaidCalcDl,
      postpaidCalcUl: data.postpaidCalcUl,
      postpaidCalcTime: data.postpaidCalcTime,
      isMonthly: data.isMonthly,
      autoRenew: data.autoRenew,
      carryOver: data.carryOver,
      resetOnExpiry: data.resetOnExpiry,
      resetOnNegative: data.resetOnNegative,
      additionalCredits: data.additionalCredits,
      netUnitPrice: data.netUnitPrice,
      grossUnitPrice: data.grossUnitPrice,
      netAddPrice: data.netAddPrice,
      grossAddPrice: data.grossAddPrice,
      dateAddMode: data.dateAddMode,
      timeAddMode: data.timeAddMode,
      trafficAddMode: data.trafficAddMode,
      expiryUnit: data.expiryUnit,
      initialExpiryVal: data.initialExpiryVal,
      timeUnit: data.timeUnit,
      initialTimeSecs: data.initialTimeSecs,
      dlTrafficUnitMb: data.dlTrafficUnitMb,
      initialDlMb: data.initialDlMb,
      ulTrafficUnitMb: data.ulTrafficUnitMb,
      initialUlMb: data.initialUlMb,
      totalTrafficUnitMb: data.totalTrafficUnitMb,
      initialTotalMb: data.initialTotalMb,
      minBaseAmount: data.minBaseAmount,
      addTrafficUnitMb: data.addTrafficUnitMb,
      minAddAmount: data.minAddAmount,
    };
    await api.post('/service-plans', payload);
    router.push('/dashboard/service-plans');
  };

  return <ServicePlanForm onSubmit={handleSubmit} />;
}
