'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ServiceInfo {
  name: string;
  status: 'connected' | 'disconnected';
  latency?: number;
}

interface HealthResponse {
  overall: 'healthy' | 'degraded';
  services: ServiceInfo[];
  timestamp: string;
}

const SERVICE_ICONS: Record<string, string> = {
  API: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2',
  PostgreSQL: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  Redis: 'M13 10V3L4 14h7v7l9-11h-7z',
  FreeRADIUS: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0',
};

const POLL_INTERVAL = 15000;

export default function ServiceStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health/services`, { cache: 'no-store' });
      if (res.ok) {
        const data: HealthResponse = await res.json();
        setHealth(data);
      } else {
        setHealth({
          overall: 'degraded',
          services: [
            { name: 'API', status: 'disconnected' },
            { name: 'PostgreSQL', status: 'disconnected' },
            { name: 'Redis', status: 'disconnected' },
            { name: 'FreeRADIUS', status: 'disconnected' },
          ],
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      setHealth({
        overall: 'degraded',
        services: [
          { name: 'API', status: 'disconnected' },
          { name: 'PostgreSQL', status: 'disconnected' },
          { name: 'Redis', status: 'disconnected' },
          { name: 'FreeRADIUS', status: 'disconnected' },
        ],
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const connectedCount = health?.services.filter((s) => s.status === 'connected').length ?? 0;
  const totalCount = health?.services.length ?? 0;
  const allHealthy = health?.overall === 'healthy';

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          loading
            ? 'bg-gray-100 text-gray-500'
            : allHealthy
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'bg-red-50 text-red-700 hover:bg-red-100'
        }`}
      >
        <span className="relative flex h-2.5 w-2.5">
          {!loading && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                allHealthy ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              loading ? 'bg-gray-400' : allHealthy ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
        </span>
        {loading ? 'Checking...' : allHealthy ? 'All Systems Online' : `${connectedCount}/${totalCount} Services`}
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && health && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Service Health</h3>
            <span className="text-xs text-gray-400">
              Updated {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {health.services.map((service) => (
              <div
                key={service.name}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      service.status === 'connected'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-500'
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={SERVICE_ICONS[service.name] || SERVICE_ICONS['API']}
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p
                      className={`text-xs ${
                        service.status === 'connected' ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {service.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {service.latency !== undefined && service.status === 'connected' && (
                    <span className="text-xs text-gray-400">{service.latency}ms</span>
                  )}
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      service.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">Auto-refreshes every 15s</p>
          </div>
        </div>
      )}
    </div>
  );
}
