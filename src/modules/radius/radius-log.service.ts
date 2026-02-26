import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface RadiusLogEntry {
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

@Injectable()
export class RadiusLogService {
  private readonly logSubject = new Subject<RadiusLogEntry>();
  private readonly recentLogs: RadiusLogEntry[] = [];
  private readonly MAX_RECENT = 500;
  private counter = 0;

  emit(entry: Omit<RadiusLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: RadiusLogEntry = {
      ...entry,
      id: `rlog-${Date.now()}-${++this.counter}`,
      timestamp: new Date().toISOString(),
    };
    this.recentLogs.push(fullEntry);
    if (this.recentLogs.length > this.MAX_RECENT) {
      this.recentLogs.shift();
    }
    this.logSubject.next(fullEntry);
  }

  getStream(): Observable<RadiusLogEntry> {
    return this.logSubject.asObservable();
  }

  getRecentLogs(limit = 100): RadiusLogEntry[] {
    return this.recentLogs.slice(-limit);
  }

  clearLogs(): void {
    this.recentLogs.length = 0;
  }
}
