import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { Radpostauth } from './entities/radpostauth.entity';

export interface DiagnosticCheck {
  check: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  message: string;
  detail?: any;
}

@Injectable()
export class RadiusDiagnosticService {
  private readonly logger = new Logger(RadiusDiagnosticService.name);

  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(NasDevice)
    private readonly nasRepo: Repository<NasDevice>,
    @InjectRepository(Radpostauth)
    private readonly radpostauthRepo: Repository<Radpostauth>,
  ) {}

  async diagnose(
    username: string,
    tenantId: string,
    nasIp?: string,
    password?: string,
  ): Promise<{ checks: DiagnosticCheck[]; summary: string }> {
    const checks: DiagnosticCheck[] = [];

    // 1. Check NAS device registration
    if (nasIp) {
      const nas = await this.nasRepo.findOne({ where: { ipAddress: nasIp } });
      if (nas) {
        checks.push({
          check: 'NAS Device Lookup',
          status: 'pass',
          message: `NAS found: "${nas.name}" (type: ${nas.type})`,
          detail: { id: nas.id, name: nas.name, type: nas.type, tenantId: nas.tenantId },
        });

        // Check if NAS tenant matches
        if (nas.tenantId !== tenantId) {
          checks.push({
            check: 'NAS Tenant Match',
            status: 'warn',
            message: `NAS belongs to tenant ${nas.tenantId}, your session tenant is ${tenantId}`,
          });
        } else {
          checks.push({
            check: 'NAS Tenant Match',
            status: 'pass',
            message: 'NAS tenant matches your session tenant',
          });
        }
      } else {
        checks.push({
          check: 'NAS Device Lookup',
          status: 'fail',
          message: `No NAS device found with IP "${nasIp}". FreeRADIUS authorize will log "Unknown NAS" and reject.`,
        });

        // List all NAS devices
        const allNas = await this.nasRepo.find({ where: { tenantId } });
        checks.push({
          check: 'Registered NAS Devices',
          status: 'info',
          message: `You have ${allNas.length} NAS device(s) registered`,
          detail: allNas.map(n => ({ name: n.name, ip: n.ipAddress, type: n.type })),
        });
      }
    } else {
      checks.push({
        check: 'NAS Device Lookup',
        status: 'info',
        message: 'No NAS IP provided for check. In production, FreeRADIUS sends NAS-IP-Address automatically.',
      });
    }

    // 2. Check subscriber exists
    const subscriber = await this.subscriberRepo.findOne({
      where: { username, tenantId },
      relations: ['plan'],
    });

    if (!subscriber) {
      // Try without tenant filter
      const anyTenantSub = await this.subscriberRepo.findOne({ where: { username } });
      if (anyTenantSub) {
        checks.push({
          check: 'Subscriber Lookup',
          status: 'fail',
          message: `User "${username}" exists but in tenant ${anyTenantSub.tenantId}, not ${tenantId}. This is likely the cause of auth failure — the NAS tenant doesn't match.`,
          detail: { foundTenantId: anyTenantSub.tenantId, expectedTenantId: tenantId },
        });
      } else {
        checks.push({
          check: 'Subscriber Lookup',
          status: 'fail',
          message: `User "${username}" not found in any tenant. Check spelling/case.`,
        });
      }

      return {
        checks,
        summary: `User "${username}" not found. Authentication will fail.`,
      };
    }

    checks.push({
      check: 'Subscriber Lookup',
      status: 'pass',
      message: `User "${username}" found (id: ${subscriber.id})`,
    });

    // 3. Check subscriber status
    if (!subscriber.enabled) {
      checks.push({
        check: 'Account Enabled',
        status: 'fail',
        message: 'Account is disabled (enabled=false). Will be rejected.',
      });
    } else {
      checks.push({
        check: 'Account Enabled',
        status: 'pass',
        message: 'Account is enabled',
      });
    }

    if (subscriber.status === 'disabled') {
      checks.push({
        check: 'Account Status',
        status: 'fail',
        message: 'Account status is "disabled". Will be rejected unless fallback plan configured.',
      });
    } else {
      checks.push({
        check: 'Account Status',
        status: 'pass',
        message: `Account status: ${subscriber.status}`,
      });
    }

    // 4. Check plan
    if (!subscriber.plan) {
      checks.push({
        check: 'Service Plan',
        status: 'fail',
        message: 'No service plan assigned. Will be rejected with "No service plan assigned".',
      });
    } else {
      checks.push({
        check: 'Service Plan',
        status: 'pass',
        message: `Plan: "${subscriber.plan.name}" (id: ${subscriber.plan.id})`,
      });

      // Check expiry
      if (subscriber.plan.capExpiry && subscriber.expiryDate) {
        if (new Date(subscriber.expiryDate) < new Date()) {
          checks.push({
            check: 'Account Expiry',
            status: 'warn',
            message: `Account expired on ${subscriber.expiryDate}`,
          });
        } else {
          checks.push({
            check: 'Account Expiry',
            status: 'pass',
            message: `Expires: ${subscriber.expiryDate}`,
          });
        }
      }
    }

    // 5. Check password
    if (password) {
      if (subscriber.passwordPlain) {
        const match = password === subscriber.passwordPlain;
        checks.push({
          check: 'Password (Plaintext)',
          status: match ? 'pass' : 'fail',
          message: match
            ? 'Password matches (plaintext comparison)'
            : `Password DOES NOT match. Stored plaintext: "${subscriber.passwordPlain.substring(0, 2)}***" (${subscriber.passwordPlain.length} chars)`,
        });
      } else if (subscriber.passwordHash) {
        const match = await bcrypt.compare(password, subscriber.passwordHash);
        checks.push({
          check: 'Password (bcrypt)',
          status: match ? 'pass' : 'fail',
          message: match
            ? 'Password matches (bcrypt comparison)'
            : 'Password DOES NOT match the stored bcrypt hash',
        });
      } else {
        checks.push({
          check: 'Password',
          status: 'fail',
          message: 'No password stored (neither plaintext nor hash). Authentication will always fail.',
        });
      }
    } else {
      // Report password storage method
      if (subscriber.passwordPlain) {
        checks.push({
          check: 'Password Storage',
          status: 'pass',
          message: `Plaintext password stored (${subscriber.passwordPlain.length} chars). FreeRADIUS will use Cleartext-Password for comparison.`,
        });
      } else if (subscriber.passwordHash) {
        checks.push({
          check: 'Password Storage',
          status: 'info',
          message: 'Only bcrypt hash stored. PAP auth (typical for hotspot) requires the authenticate endpoint to do bcrypt comparison.',
        });
      } else {
        checks.push({
          check: 'Password Storage',
          status: 'fail',
          message: 'No password stored at all. Authentication will always fail.',
        });
      }
    }

    // 6. Check MAC lock
    if (subscriber.macLock) {
      checks.push({
        check: 'MAC Lock',
        status: 'info',
        message: subscriber.macCpe
          ? `MAC lock enabled, locked to: ${subscriber.macCpe}`
          : 'MAC lock enabled but no MAC stored yet (will auto-lock on first auth)',
      });
    }

    // 7. Check sim-use limit
    if (subscriber.simUse > 0) {
      checks.push({
        check: 'Simultaneous Use',
        status: 'info',
        message: `Limited to ${subscriber.simUse} concurrent session(s)`,
      });
    }

    // 8. Recent auth attempts from radpostauth
    const recentAuth = await this.radpostauthRepo
      .createQueryBuilder('rpa')
      .where('rpa.username = :username', { username })
      .orderBy('rpa.auth_date', 'DESC')
      .take(10)
      .getMany();

    if (recentAuth.length > 0) {
      checks.push({
        check: 'Recent Auth Attempts',
        status: 'info',
        message: `${recentAuth.length} recent auth attempt(s) found`,
        detail: recentAuth.map(a => ({
          date: a.authDate,
          reply: a.reply,
          nasIp: a.nasIp,
          callingStation: a.callingStation,
        })),
      });
    } else {
      checks.push({
        check: 'Recent Auth Attempts',
        status: 'warn',
        message: 'No auth attempts found in radpostauth. This means FreeRADIUS has NEVER processed a request for this user, or the post-auth hook is not working.',
      });
    }

    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    let summary: string;
    if (failCount > 0) {
      summary = `${failCount} issue(s) found that would cause authentication failure.`;
    } else if (warnCount > 0) {
      summary = `No blocking issues, but ${warnCount} warning(s) to review.`;
    } else {
      summary = 'All checks passed. If auth still fails, check FreeRADIUS shared secret and network connectivity.';
    }

    return { checks, summary };
  }

  async getRecentPostAuth(tenantId: string, limit: number) {
    return this.radpostauthRepo.find({
      where: { tenantId },
      order: { authDate: 'DESC' },
      take: limit,
    });
  }
}
