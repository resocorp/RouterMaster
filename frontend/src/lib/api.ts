const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.setToken(null);
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Request failed: ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    role: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    tenantId: string;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Subscriber {
  id: string;
  username: string;
  accountType: string;
  status: string;
  enabled: boolean;
  verified: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
  alertSent: boolean;
  macCpe?: string;
  macCm?: string;
  macLock: boolean;
  ipModeCpe: string;
  ipModeCm: string;
  staticIpCpe?: string;
  staticIpCm?: string;
  simUse: number;
  planId?: string;
  plan?: ServicePlan;
  managerId?: string;
  manager?: { id: string; username: string };
  groupId?: string;
  group?: { id: string; name: string };
  dlLimitBytes: string;
  ulLimitBytes: string;
  totalLimitBytes: string;
  timeLimitSecs: number;
  expiryDate?: string;
  balance: number;
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  state?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  vatId?: string;
  contractId?: string;
  contractExpiry?: string;
  latitude?: number;
  longitude?: number;
  language: string;
  comment?: string;
  pinFailures: number;
  verifyFailures: number;
  smsSentCount: number;
  customAttrs: any[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ServicePlan {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  availableUcp: boolean;
  planType: string;
  capDownload: boolean;
  capUpload: boolean;
  capTotal: boolean;
  capExpiry: boolean;
  capTime: boolean;
  rateDl: number;
  rateUl: number;
  ciscoPolicyDl?: string;
  ciscoPolicyUl?: string;
  burstEnabled: boolean;
  burstLimitDl: number;
  burstLimitUl: number;
  burstThreshDl: number;
  burstThreshUl: number;
  burstTimeDl: number;
  burstTimeUl: number;
  priority: number;
  dailyDlMb: string;
  dailyUlMb: string;
  dailyTotalMb: string;
  dailyTimeSecs: number;
  ipPool?: string;
  nextDisabledId?: string;
  nextExpiredId?: string;
  nextDailyId?: string;
  ignoreStaticIp: boolean;
  customAttrs: any[];
  generateTftp: boolean;
  advancedCm?: string;
  allowedNasIds: string[];
  allowedManagerIds: string[];
  postpaidCalcDl: boolean;
  postpaidCalcUl: boolean;
  postpaidCalcTime: boolean;
  isMonthly: boolean;
  autoRenew: boolean;
  carryOver: boolean;
  resetOnExpiry: boolean;
  resetOnNegative: boolean;
  additionalCredits: boolean;
  netUnitPrice: number;
  grossUnitPrice: number;
  netAddPrice: number;
  grossAddPrice: number;
  dateAddMode: string;
  timeAddMode: string;
  trafficAddMode: string;
  expiryUnit: string;
  timeUnit: string;
  initialExpiryVal: number;
  initialTimeSecs: number;
  dlTrafficUnitMb: string;
  ulTrafficUnitMb: string;
  totalTrafficUnitMb: string;
  initialDlMb: string;
  initialUlMb: string;
  initialTotalMb: string;
  minBaseAmount: number;
  addTrafficUnitMb: string;
  minAddAmount: number;
  createdAt: string;
}

export interface Manager {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  state?: string;
  phone?: string;
  mobile?: string;
  vatId?: string;
  language?: string;
  comment?: string;
  isSuper: boolean;
  enabled: boolean;
  balance: number;
  permissions: Record<string, boolean>;
  createdAt: string;
}

export interface NasDevice {
  id: string;
  name: string;
  ipAddress: string;
  type: string;
  secret: string;
  nasPassword?: string;
  dynamicRate: string;
  apiUsername?: string;
  apiPassword?: string;
  apiVersion: string;
  ciscoBw: string;
  description?: string;
  createdAt: string;
}

export interface DashboardData {
  subscribers: {
    total: number;
    active: number;
    disabled: number;
    expired: number;
    online: number;
  };
  todayRevenue: number;
  monthRevenue: number;
}

export interface Invoice {
  id: string;
  invoiceNumber?: number;
  subscriberId?: string;
  type: string;
  serviceName?: string;
  grossPrice: number;
  netPrice: number;
  vatAmount: number;
  quantity: number;
  remark?: string;
  createdAt: string;
}
