'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ServicePlan } from '@/lib/api';
import ServicePlanForm, { ServicePlanFormData } from '@/components/ServicePlanForm';

export default function EditServicePlanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [plan, setPlan] = useState<ServicePlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ServicePlan>(`/service-plans/${id}`)
      .then(setPlan)
      .catch(() => router.push('/dashboard/service-plans'))
      .finally(() => setLoading(false));
  }, [id, router]);

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
    await api.put(`/service-plans/${id}`, payload);
    router.push('/dashboard/service-plans');
  };

  const handleDelete = async () => {
    await api.delete(`/service-plans/${id}`);
    router.push('/dashboard/service-plans');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!plan) return null;

  const totalDailySecs = plan.dailyTimeSecs || 0;
  const dailyTimeHours = Math.floor(totalDailySecs / 3600);
  const dailyTimeMinutes = Math.floor((totalDailySecs % 3600) / 60);
  const dailyTimeSeconds = totalDailySecs % 60;

  const initialData: Partial<ServicePlanFormData> = {
    name: plan.name,
    description: plan.description || '',
    enabled: plan.enabled,
    availableUcp: plan.availableUcp,
    planType: plan.planType,
    capDownload: plan.capDownload,
    capUpload: plan.capUpload,
    capTotal: plan.capTotal,
    capExpiry: plan.capExpiry,
    capTime: plan.capTime,
    rateDl: plan.rateDl,
    rateUl: plan.rateUl,
    ciscoPolicyDl: plan.ciscoPolicyDl || '',
    ciscoPolicyUl: plan.ciscoPolicyUl || '',
    dailyDlMb: parseInt(plan.dailyDlMb) || 0,
    dailyUlMb: parseInt(plan.dailyUlMb) || 0,
    dailyTotalMb: parseInt(plan.dailyTotalMb) || 0,
    dailyTimeHours,
    dailyTimeMinutes,
    dailyTimeSeconds,
    burstEnabled: plan.burstEnabled,
    burstLimitDl: plan.burstLimitDl,
    burstLimitUl: plan.burstLimitUl,
    burstThreshDl: plan.burstThreshDl,
    burstThreshUl: plan.burstThreshUl,
    burstTimeDl: plan.burstTimeDl,
    burstTimeUl: plan.burstTimeUl,
    priority: plan.priority,
    ipPool: plan.ipPool || '',
    nextDisabledId: plan.nextDisabledId || '',
    nextExpiredId: plan.nextExpiredId || '',
    nextDailyId: plan.nextDailyId || '',
    ignoreStaticIp: plan.ignoreStaticIp,
    customAttrs: Array.isArray(plan.customAttrs) ? plan.customAttrs.join('\n') : '',
    generateTftp: plan.generateTftp,
    advancedCm: !!plan.advancedCm,
    allowedNasIds: plan.allowedNasIds || [],
    allowedManagerIds: plan.allowedManagerIds || [],
    // Accounting fields
    postpaidCalcDl: plan.postpaidCalcDl ?? false,
    postpaidCalcUl: plan.postpaidCalcUl ?? false,
    postpaidCalcTime: plan.postpaidCalcTime ?? false,
    isMonthly: plan.isMonthly ?? false,
    autoRenew: plan.autoRenew ?? false,
    carryOver: plan.carryOver ?? false,
    resetOnExpiry: plan.resetOnExpiry ?? true,
    resetOnNegative: plan.resetOnNegative ?? false,
    additionalCredits: plan.additionalCredits ?? false,
    netUnitPrice: Number(plan.netUnitPrice) || 0,
    grossUnitPrice: Number(plan.grossUnitPrice) || 0,
    netAddPrice: Number(plan.netAddPrice) || 0,
    grossAddPrice: Number(plan.grossAddPrice) || 0,
    dateAddMode: plan.dateAddMode || 'reset',
    timeAddMode: plan.timeAddMode || 'reset',
    trafficAddMode: plan.trafficAddMode || 'reset',
    expiryUnit: plan.expiryUnit || 'days',
    expiryUnitValue: 0,
    initialExpiryVal: plan.initialExpiryVal || 0,
    timeUnit: plan.timeUnit || 'minutes',
    timeUnitValue: 0,
    initialTimeSecs: plan.initialTimeSecs || 0,
    dlTrafficUnitMb: parseInt(plan.dlTrafficUnitMb) || 0,
    initialDlMb: parseInt(plan.initialDlMb) || 0,
    ulTrafficUnitMb: parseInt(plan.ulTrafficUnitMb) || 0,
    initialUlMb: parseInt(plan.initialUlMb) || 0,
    totalTrafficUnitMb: parseInt(plan.totalTrafficUnitMb) || 0,
    initialTotalMb: parseInt(plan.initialTotalMb) || 0,
    minBaseAmount: Number(plan.minBaseAmount) || 1,
    addTrafficUnitMb: parseInt(plan.addTrafficUnitMb) || 1,
    minAddAmount: Number(plan.minAddAmount) || 1,
  };

  return (
    <ServicePlanForm
      initialData={initialData}
      isEdit
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
