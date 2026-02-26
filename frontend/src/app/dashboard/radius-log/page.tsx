'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RadiusLogEntry {
  id: string;
  timestamp: string;
  type: 'authorize' | 'authenticate' | 'accounting' | 'post-auth' | 'diagnostic';
  level: 'info' | 'warn' | 'error' | 'debug';
  username?: string;
  nasIp?: string;
  callingStation?: string;
  result: 'accept' | 'reject' | 'info';
  message: string;
  details?: Record<string, any>;
}

interface DiagnosticCheck {
  check: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  message: string;
  detail?: any;
}

interface PostAuthEntry {
  id: string;
  username: string;
  pass?: string;
  reply: string;
  nasIp: string;
  callingStation?: string;
  authDate: string;
}

type Tab = 'live' | 'diagnose' | 'auth-log';
type LogFilter = 'all' | 'authorize' | 'authenticate' | 'accounting' | 'post-auth';

export default function RadiusLogPage() {
  const [tab, setTab] = useState<Tab>('live');
  const [logs, setLogs] = useState<RadiusLogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [paused, setPaused] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Diagnostic state
  const [diagUsername, setDiagUsername] = useState('');
  const [diagNasIp, setDiagNasIp] = useState('');
  const [diagPassword, setDiagPassword] = useState('');
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<{ checks: DiagnosticCheck[]; summary: string } | null>(null);

  // Auth log state
  const [authLog, setAuthLog] = useState<PostAuthEntry[]>([]);
  const [authLogLoading, setAuthLogLoading] = useState(false);

  // Connect SSE
  useEffect(() => {
    if (tab !== 'live') return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Load recent logs first
    api.get<RadiusLogEntry[]>('/radius-log/recent?limit=200').then(setLogs).catch(() => {});

    const url = `${API_BASE}/radius-log/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener('radius-log', (e) => {
      if (paused) return;
      try {
        const entry: RadiusLogEntry = JSON.parse(e.data);
        setLogs((prev) => {
          const next = [...prev, entry];
          return next.length > 1000 ? next.slice(-500) : next;
        });
      } catch {}
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [tab, paused]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filtered logs
  const filteredLogs = logs.filter((l) => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (searchText && !l.message.toLowerCase().includes(searchText.toLowerCase()) && 
        !(l.username || '').toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const clearLogs = useCallback(() => {
    setLogs([]);
    api.delete('/radius-log/clear').catch(() => {});
  }, []);

  const runDiagnostic = async () => {
    if (!diagUsername) return;
    setDiagRunning(true);
    setDiagResult(null);
    try {
      const result = await api.post<{ checks: DiagnosticCheck[]; summary: string }>('/radius-log/diagnose', {
        username: diagUsername,
        nasIp: diagNasIp || undefined,
        password: diagPassword || undefined,
      });
      setDiagResult(result);
    } catch (err: any) {
      setDiagResult({ checks: [], summary: `Error: ${err.message}` });
    } finally {
      setDiagRunning(false);
    }
  };

  const loadAuthLog = useCallback(async () => {
    setAuthLogLoading(true);
    try {
      const data = await api.get<PostAuthEntry[]>('/radius-log/auth-log?limit=100');
      setAuthLog(data);
    } catch {}
    setAuthLogLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'auth-log') loadAuthLog();
  }, [tab, loadAuthLog]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RADIUS Log Console</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time RADIUS authentication & accounting debug logs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-6">
          {([
            { id: 'live' as Tab, label: 'Live Logs', icon: '⚡' },
            { id: 'diagnose' as Tab, label: 'Diagnostics', icon: '🔍' },
            { id: 'auth-log' as Tab, label: 'Auth History (DB)', icon: '📋' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 py-3 px-1 border-b-2 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Live Logs Tab */}
      {tab === 'live' && (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as LogFilter)}
              className="text-sm border border-gray-300 rounded-md px-2.5 py-1.5 bg-white"
            >
              <option value="all">All Types</option>
              <option value="authorize">Authorize</option>
              <option value="authenticate">Authenticate</option>
              <option value="accounting">Accounting</option>
              <option value="post-auth">Post-Auth</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2.5 py-1.5 bg-white"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
            </select>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2.5 py-1.5 w-52"
            />
            <div className="flex-1" />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            <button
              onClick={() => setPaused(!paused)}
              className={cn(
                'text-sm px-3 py-1.5 rounded-md font-medium',
                paused ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              )}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={clearLogs}
              className="text-sm px-3 py-1.5 rounded-md font-medium bg-red-100 text-red-700 hover:bg-red-200"
            >
              Clear
            </button>
            <span className="text-xs text-gray-400">{filteredLogs.length} entries</span>
          </div>

          {/* Log Console */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="h-[600px] overflow-y-auto p-3 font-mono text-xs space-y-0.5" id="log-scroll">
              {filteredLogs.length === 0 && (
                <div className="text-gray-500 text-center py-20">
                  {logs.length === 0
                    ? 'No RADIUS log entries yet. Try authenticating through your MikroTik hotspot...'
                    : 'No entries match current filters.'}
                </div>
              )}
              {filteredLogs.map((entry) => (
                <LogLine key={entry.id} entry={entry} />
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Tab */}
      {tab === 'diagnose' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">RADIUS Auth Diagnostic</h3>
            <p className="text-sm text-gray-500 mb-4">
              Test authentication for a specific user. This checks NAS registration, subscriber existence, 
              password validity, plan assignment, and recent auth attempts.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={diagUsername}
                  onChange={(e) => setDiagUsername(e.target.value)}
                  placeholder="e.g. nedu"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NAS IP (optional)</label>
                <input
                  type="text"
                  value={diagNasIp}
                  onChange={(e) => setDiagNasIp(e.target.value)}
                  placeholder="e.g. 10.5.50.1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password (optional)</label>
                <input
                  type="password"
                  value={diagPassword}
                  onChange={(e) => setDiagPassword(e.target.value)}
                  placeholder="Test password match"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={runDiagnostic}
              disabled={!diagUsername || diagRunning}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {diagRunning ? 'Running...' : 'Run Diagnostic'}
            </button>
          </div>

          {/* Diagnostic Results */}
          {diagResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <div className={cn(
                'p-3 rounded-md text-sm font-medium',
                diagResult.checks.some(c => c.status === 'fail')
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : diagResult.checks.some(c => c.status === 'warn')
                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    : 'bg-green-50 text-green-800 border border-green-200'
              )}>
                {diagResult.summary}
              </div>

              <div className="space-y-2">
                {diagResult.checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-gray-50">
                    <span className={cn(
                      'mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0',
                      check.status === 'pass' ? 'bg-green-100 text-green-700' :
                      check.status === 'fail' ? 'bg-red-100 text-red-700' :
                      check.status === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    )}>
                      {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : check.status === 'warn' ? '!' : 'i'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{check.check}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{check.message}</div>
                      {check.detail && (
                        <pre className="mt-2 text-xs bg-gray-100 rounded p-2 overflow-x-auto text-gray-700">
                          {JSON.stringify(check.detail, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auth History Tab */}
      {tab === 'auth-log' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Recent authentication attempts from the <code className="bg-gray-100 px-1 rounded">radpostauth</code> database table</p>
            <button
              onClick={loadAuthLog}
              className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reply</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NAS IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calling Station</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {authLogLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : authLog.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No auth log entries found</td></tr>
                ) : authLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(entry.authDate).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{entry.username}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                        entry.reply === 'Access-Accept' ? 'bg-green-100 text-green-700' :
                        entry.reply === 'Access-Reject' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {entry.reply || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{entry.nasIp || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{entry.callingStation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LogLine({ entry }: { entry: RadiusLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });

  const levelColors: Record<string, string> = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-gray-500',
  };

  const resultBg: Record<string, string> = {
    accept: 'text-green-400',
    reject: 'text-red-400',
    info: 'text-gray-400',
  };

  const typeBadgeColors: Record<string, string> = {
    authorize: 'bg-blue-900/50 text-blue-300',
    authenticate: 'bg-purple-900/50 text-purple-300',
    accounting: 'bg-cyan-900/50 text-cyan-300',
    'post-auth': 'bg-orange-900/50 text-orange-300',
    diagnostic: 'bg-gray-700 text-gray-300',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2 py-0.5 px-1 rounded hover:bg-gray-800/50 cursor-pointer leading-relaxed',
        entry.result === 'reject' && 'bg-red-950/30',
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <span className="text-gray-500 select-none whitespace-nowrap">{time}</span>
      <span className={cn('uppercase w-12 text-center select-none', levelColors[entry.level])}>{entry.level}</span>
      <span className={cn('px-1.5 py-0 rounded text-[10px] font-semibold uppercase whitespace-nowrap', typeBadgeColors[entry.type] || typeBadgeColors.diagnostic)}>
        {entry.type}
      </span>
      <span className={cn('flex-1', resultBg[entry.result])}>
        {entry.message}
        {expanded && entry.details && (
          <pre className="mt-1 text-gray-500 text-[10px] pl-2 border-l border-gray-700">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        )}
      </span>
    </div>
  );
}
