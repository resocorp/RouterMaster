import { Injectable } from '@nestjs/common';
import { ServicePlan } from '../service-plans/entities/service-plan.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';

export interface RadiusReplyAttributes {
  [key: string]: string | number;
}

@Injectable()
export class RadiusReplyBuilder {
  build(
    subscriber: Subscriber,
    plan: ServicePlan,
    nas: NasDevice,
  ): RadiusReplyAttributes {
    const attrs: RadiusReplyAttributes = {};

    this.addBandwidthAttrs(attrs, plan, nas);
    this.addIpAttrs(attrs, subscriber, plan);
    this.addSessionAttrs(attrs, subscriber, plan);
    this.addCustomAttrs(attrs, plan, subscriber);

    return attrs;
  }

  private addBandwidthAttrs(
    attrs: RadiusReplyAttributes,
    plan: ServicePlan,
    nas: NasDevice,
  ): void {
    const rateDl = plan.rateDl;
    const rateUl = plan.rateUl;

    if (rateDl === 0 && rateUl === 0) return;

    switch (nas.type) {
      case 'mikrotik':
        this.addMikrotikRateLimit(attrs, plan);
        break;
      case 'cisco':
        this.addCiscoAttrs(attrs, plan, nas);
        break;
      case 'chillispot':
      case 'pfsense':
        this.addWisprAttrs(attrs, plan);
        break;
      default:
        this.addWisprAttrs(attrs, plan);
        break;
    }
  }

  private addMikrotikRateLimit(
    attrs: RadiusReplyAttributes,
    plan: ServicePlan,
  ): void {
    const ul = plan.rateUl;
    const dl = plan.rateDl;

    if (plan.burstEnabled) {
      const burstUl = plan.burstLimitUl;
      const burstDl = plan.burstLimitDl;
      const threshUl = plan.burstThreshUl;
      const threshDl = plan.burstThreshDl;
      const timeUl = plan.burstTimeUl;
      const timeDl = plan.burstTimeDl;
      const priority = plan.priority;

      attrs['Mikrotik-Rate-Limit'] =
        `${ul}k/${dl}k ${burstUl}k/${burstDl}k ${threshUl}k/${threshDl}k ${timeUl}/${timeDl} ${priority}`;
    } else {
      attrs['Mikrotik-Rate-Limit'] = `${ul}k/${dl}k`;
    }
  }

  private addCiscoAttrs(
    attrs: RadiusReplyAttributes,
    plan: ServicePlan,
    nas: NasDevice,
  ): void {
    if (nas.ciscoBw === 'policy_map') {
      if (plan.ciscoPolicyDl) {
        attrs['Cisco-AVPair'] = `subscriber:sub-qos-policy-in=${plan.ciscoPolicyDl}`;
      }
      if (plan.ciscoPolicyUl) {
        attrs['Cisco-AVPair'] = `subscriber:sub-qos-policy-out=${plan.ciscoPolicyUl}`;
      }
    } else if (nas.ciscoBw === 'rate_limit') {
      const rateDlBps = plan.rateDl * 1000;
      const rateUlBps = plan.rateUl * 1000;
      const burstDl = Math.max(Math.floor(rateDlBps * 0.1), 8000);
      const burstUl = Math.max(Math.floor(rateUlBps * 0.1), 8000);

      attrs['Cisco-AVPair'] =
        `lcp:interface-config#1=rate-limit input ${rateUlBps} ${burstUl} ${burstUl} conform-action transmit exceed-action drop`;
    }
  }

  private addWisprAttrs(
    attrs: RadiusReplyAttributes,
    plan: ServicePlan,
  ): void {
    if (plan.rateDl > 0) {
      attrs['WISPr-Bandwidth-Max-Down'] = plan.rateDl * 1000;
    }
    if (plan.rateUl > 0) {
      attrs['WISPr-Bandwidth-Max-Up'] = plan.rateUl * 1000;
    }
  }

  private addIpAttrs(
    attrs: RadiusReplyAttributes,
    subscriber: Subscriber,
    plan: ServicePlan,
  ): void {
    if (
      !plan.ignoreStaticIp &&
      subscriber.ipModeCpe === 'static' &&
      subscriber.staticIpCpe
    ) {
      attrs['Framed-IP-Address'] = subscriber.staticIpCpe;
    } else if (plan.ipPool) {
      attrs['Framed-Pool'] = plan.ipPool;
    }
  }

  private addSessionAttrs(
    attrs: RadiusReplyAttributes,
    subscriber: Subscriber,
    plan: ServicePlan,
  ): void {
    const timeouts: number[] = [];

    if (plan.capTime && subscriber.timeLimitSecs > 0) {
      timeouts.push(subscriber.timeLimitSecs);
    }

    if (plan.capExpiry && subscriber.expiryDate) {
      const remainingSecs = Math.floor(
        (subscriber.expiryDate.getTime() - Date.now()) / 1000,
      );
      if (remainingSecs > 0) {
        timeouts.push(remainingSecs);
      }
    }

    const dailyTimeSecs = plan.dailyTimeSecs;
    if (dailyTimeSecs > 0) {
      const remaining = dailyTimeSecs - subscriber.dailyTimeUsed;
      if (remaining > 0) {
        timeouts.push(remaining);
      }
    }

    if (timeouts.length > 0) {
      attrs['Session-Timeout'] = Math.min(...timeouts);
    }

    attrs['Acct-Interim-Interval'] = 300;
  }

  private addCustomAttrs(
    attrs: RadiusReplyAttributes,
    plan: ServicePlan,
    subscriber: Subscriber,
  ): void {
    if (Array.isArray(plan.customAttrs)) {
      for (const attr of plan.customAttrs) {
        if (attr.name && attr.value !== undefined) {
          attrs[attr.name] = attr.value;
        }
      }
    }
    if (Array.isArray(subscriber.customAttrs)) {
      for (const attr of subscriber.customAttrs) {
        if (attr.name && attr.value !== undefined) {
          attrs[attr.name] = attr.value;
        }
      }
    }
  }
}
