import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Radacct } from './entities/radacct.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import * as dgram from 'dgram';
import * as crypto from 'crypto';

const RADIUS_CODE_DISCONNECT_REQUEST = 40;
const RADIUS_ATTR_USER_NAME = 1;
const RADIUS_ATTR_NAS_IP_ADDRESS = 4;
const RADIUS_ATTR_ACCT_SESSION_ID = 44;

@Injectable()
export class RadiusDisconnectService {
  private readonly logger = new Logger(RadiusDisconnectService.name);

  constructor(
    @InjectRepository(Radacct)
    private readonly radacctRepo: Repository<Radacct>,
    @InjectRepository(NasDevice)
    private readonly nasRepo: Repository<NasDevice>,
  ) {}

  async disconnectUser(username: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const sessions = await this.radacctRepo.find({
      where: { username, tenantId, stopTime: IsNull() },
    });

    if (sessions.length === 0) {
      return { success: true, message: 'No active sessions found' };
    }

    const results: string[] = [];
    for (const session of sessions) {
      try {
        const nas = session.nasId
          ? await this.nasRepo.findOne({ where: { id: session.nasId } })
          : null;

        if (!nas) {
          this.logger.warn(`NAS not found for session ${session.sessionId}`);
          results.push(`Session ${session.sessionId}: NAS not found`);
          continue;
        }

        await this.sendDisconnectRequest(
          nas.ipAddress,
          nas.type === 'mikrotik' ? 1700 : 3799,
          nas.secret,
          username,
          session.sessionId,
          nas.ipAddress,
        );
        results.push(`Session ${session.sessionId}: disconnect sent`);
      } catch (err) {
        this.logger.error(`Failed to disconnect session ${session.sessionId}: ${err.message}`);
        results.push(`Session ${session.sessionId}: failed - ${err.message}`);
      }
    }

    return { success: true, message: results.join('; ') };
  }

  async disconnectSession(sessionId: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const session = await this.radacctRepo.findOne({
      where: { id: sessionId, tenantId, stopTime: IsNull() },
    });

    if (!session) {
      return { success: false, message: 'Active session not found' };
    }

    const nas = session.nasId
      ? await this.nasRepo.findOne({ where: { id: session.nasId } })
      : null;

    if (!nas) {
      return { success: false, message: 'NAS device not found' };
    }

    try {
      await this.sendDisconnectRequest(
        nas.ipAddress,
        nas.type === 'mikrotik' ? 1700 : 3799,
        nas.secret,
        session.username,
        session.sessionId,
        nas.ipAddress,
      );
      return { success: true, message: 'Disconnect request sent' };
    } catch (err) {
      return { success: false, message: `Failed: ${err.message}` };
    }
  }

  private sendDisconnectRequest(
    nasIp: string,
    port: number,
    secret: string,
    username: string,
    acctSessionId: string,
    nasIpAddress: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.close();
        reject(new Error('Disconnect request timed out'));
      }, 5000);

      const client = dgram.createSocket('udp4');

      const packet = this.buildDisconnectPacket(
        secret,
        username,
        acctSessionId,
        nasIpAddress,
      );

      client.send(packet, 0, packet.length, port, nasIp, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.close();
          reject(err);
          return;
        }
      });

      client.on('message', (msg) => {
        clearTimeout(timeout);
        client.close();
        const code = msg[0];
        if (code === 41) {
          resolve();
        } else if (code === 42) {
          reject(new Error('Disconnect NAK received'));
        } else {
          resolve();
        }
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        client.close();
        reject(err);
      });
    });
  }

  private buildDisconnectPacket(
    secret: string,
    username: string,
    acctSessionId: string,
    nasIp: string,
  ): Buffer {
    const identifier = crypto.randomInt(0, 256);
    const authenticator = crypto.randomBytes(16);

    const attrs: Buffer[] = [];

    const userNameBuf = Buffer.from(username, 'utf8');
    const userNameAttr = Buffer.alloc(2 + userNameBuf.length);
    userNameAttr[0] = RADIUS_ATTR_USER_NAME;
    userNameAttr[1] = 2 + userNameBuf.length;
    userNameBuf.copy(userNameAttr, 2);
    attrs.push(userNameAttr);

    const sessionIdBuf = Buffer.from(acctSessionId, 'utf8');
    const sessionIdAttr = Buffer.alloc(2 + sessionIdBuf.length);
    sessionIdAttr[0] = RADIUS_ATTR_ACCT_SESSION_ID;
    sessionIdAttr[1] = 2 + sessionIdBuf.length;
    sessionIdBuf.copy(sessionIdAttr, 2);
    attrs.push(sessionIdAttr);

    const ipParts = nasIp.split('.').map(Number);
    const nasIpAttr = Buffer.alloc(6);
    nasIpAttr[0] = RADIUS_ATTR_NAS_IP_ADDRESS;
    nasIpAttr[1] = 6;
    nasIpAttr[2] = ipParts[0] || 0;
    nasIpAttr[3] = ipParts[1] || 0;
    nasIpAttr[4] = ipParts[2] || 0;
    nasIpAttr[5] = ipParts[3] || 0;
    attrs.push(nasIpAttr);

    const attrsLength = attrs.reduce((sum, a) => sum + a.length, 0);
    const packetLength = 20 + attrsLength;

    const packet = Buffer.alloc(packetLength);
    packet[0] = RADIUS_CODE_DISCONNECT_REQUEST;
    packet[1] = identifier;
    packet.writeUInt16BE(packetLength, 2);
    authenticator.copy(packet, 4);

    let offset = 20;
    for (const attr of attrs) {
      attr.copy(packet, offset);
      offset += attr.length;
    }

    const hash = crypto.createHash('md5');
    hash.update(packet);
    hash.update(Buffer.from(secret, 'utf8'));
    const responseAuth = hash.digest();
    responseAuth.copy(packet, 4);

    return packet;
  }
}
