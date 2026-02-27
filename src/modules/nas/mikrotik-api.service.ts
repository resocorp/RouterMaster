import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as crypto from 'crypto';

export interface MikrotikTestResult {
  success: boolean;
  message: string;
  routerIdentity?: string;
  routerVersion?: string;
  latencyMs?: number;
}

export interface MikrotikCommandResult {
  success: boolean;
  data: Record<string, string>[];
  error?: string;
  latencyMs: number;
}

@Injectable()
export class MikrotikApiService {
  private readonly logger = new Logger(MikrotikApiService.name);

  async testConnection(
    ipAddress: string,
    apiUsername: string,
    apiPassword: string,
    apiVersion: string = '6.45.1+',
    timeoutMs: number = 8000,
  ): Promise<MikrotikTestResult> {
    const startTime = Date.now();
    const port = 8728;

    return new Promise((resolve) => {
      const client = new net.Socket();
      let rxBuf: Buffer = Buffer.alloc(0);
      let stage = apiVersion === '6.45.1+' ? 'direct-login' : 'challenge';
      let resolved = false;
      let identity: string | undefined;
      let version: string | undefined;

      const done = (result: MikrotikTestResult) => {
        if (resolved) return;
        resolved = true;
        client.destroy();
        resolve(result);
      };

      const timer = setTimeout(() => {
        done({
          success: false,
          message: `Connection timed out after ${timeoutMs}ms — router may be unreachable or API service disabled`,
          latencyMs: Date.now() - startTime,
        });
      }, timeoutMs);

      client.on('error', (err: Error) => {
        clearTimeout(timer);
        this.logger.warn(`MikroTik API error (${ipAddress}): ${err.message}`);
        done({
          success: false,
          message: `Connection failed: ${err.message}`,
          latencyMs: Date.now() - startTime,
        });
      });

      client.on('close', () => {
        clearTimeout(timer);
        if (!resolved) {
          done({
            success: false,
            message: 'Connection closed unexpectedly',
            latencyMs: Date.now() - startTime,
          });
        }
      });

      client.connect(port, ipAddress, () => {
        this.logger.debug(`TCP connected to ${ipAddress}:${port}`);
        if (stage === 'direct-login') {
          client.write(
            this.encodeSentence(['/login', `=name=${apiUsername}`, `=password=${apiPassword}`]),
          );
        } else {
          client.write(this.encodeSentence(['/login']));
        }
      });

      client.on('data', (data: Buffer) => {
        rxBuf = Buffer.concat([rxBuf, data]);

        // Parse all complete sentences in the buffer
        while (rxBuf.length > 0) {
          const result = this.decodeSentence(rxBuf);
          if (!result || result.words.length === 0) break;
          rxBuf = result.remaining;
          const words = result.words;

          this.logger.debug(`Stage=${stage} Words=${JSON.stringify(words)}`);

          if (stage === 'direct-login') {
            if (words.includes('!done') && !words.find((w) => w.startsWith('=ret='))) {
              stage = 'identity';
              client.write(this.encodeSentence(['/system/identity/print']));
            } else if (words.includes('!done') && words.find((w) => w.startsWith('=ret='))) {
              stage = 'identity';
              client.write(this.encodeSentence(['/system/identity/print']));
            } else if (words.includes('!trap')) {
              const msg = words.find((w) => w.startsWith('=message='));
              clearTimeout(timer);
              done({
                success: false,
                message: `Authentication failed: ${msg ? msg.substring(9) : 'unknown error'}`,
                latencyMs: Date.now() - startTime,
              });
              return;
            }
          } else if (stage === 'challenge') {
            const retWord = words.find((w) => w.startsWith('=ret='));
            if (retWord) {
              const challenge = retWord.substring(5);
              const challengeBuf = Buffer.from(challenge, 'hex');
              const hash = crypto.createHash('md5');
              hash.update(Buffer.from([0]));
              hash.update(Buffer.from(apiPassword, 'utf-8'));
              hash.update(challengeBuf);
              const response = '00' + hash.digest('hex');
              stage = 'auth';
              client.write(
                this.encodeSentence(['/login', `=name=${apiUsername}`, `=response=${response}`]),
              );
            } else if (words.includes('!trap') || words.includes('!fatal')) {
              const msg = words.find((w) => w.startsWith('=message='));
              clearTimeout(timer);
              this.logger.warn(`Challenge login rejected by ${ipAddress}: ${msg?.substring(9) || 'unknown'}`);
              done({
                success: false,
                message: `Login method not supported — try switching API version to "6.45.1+". ${msg ? msg.substring(9) : ''}`,
                latencyMs: Date.now() - startTime,
              });
              return;
            } else if (words.includes('!done') && !words.find((w) => w.startsWith('=ret='))) {
              clearTimeout(timer);
              this.logger.warn(`Challenge login: router ${ipAddress} returned !done without challenge — likely RouterOS 7.x`);
              done({
                success: false,
                message: 'Router did not send challenge — switch API version to "6.45.1+" for RouterOS 6.45.1+ / 7.x',
                latencyMs: Date.now() - startTime,
              });
              return;
            }
          } else if (stage === 'auth') {
            if (words.includes('!done')) {
              stage = 'identity';
              client.write(this.encodeSentence(['/system/identity/print']));
            } else if (words.includes('!trap')) {
              const msg = words.find((w) => w.startsWith('=message='));
              clearTimeout(timer);
              done({
                success: false,
                message: `Authentication failed: ${msg ? msg.substring(9) : 'unknown error'}`,
                latencyMs: Date.now() - startTime,
              });
              return;
            }
          } else if (stage === 'identity') {
            const nameWord = words.find((w) => w.startsWith('=name='));
            if (nameWord) identity = nameWord.substring(6);

            if (words.includes('!done') || (identity && words.includes('!re'))) {
              if (identity) {
                stage = 'resource';
                client.write(this.encodeSentence(['/system/resource/print']));
              } else {
                clearTimeout(timer);
                done({
                  success: true,
                  message: 'Connected and authenticated',
                  routerIdentity: identity,
                  latencyMs: Date.now() - startTime,
                });
              }
            }
          } else if (stage === 'resource') {
            const versionWord = words.find((w) => w.startsWith('=version='));
            if (versionWord) version = versionWord.substring(9);

            if (words.includes('!done')) {
              clearTimeout(timer);
              done({
                success: true,
                message: `Connected to "${identity || 'unknown'}" running RouterOS ${version || 'unknown'}`,
                routerIdentity: identity,
                routerVersion: version,
                latencyMs: Date.now() - startTime,
              });
            }
          }
        }
      });
    });
  }

  async executeCommand(
    ipAddress: string,
    apiUsername: string,
    apiPassword: string,
    command: string,
    params: Record<string, string> = {},
    apiVersion: string = '6.45.1+',
    timeoutMs: number = 10000,
  ): Promise<MikrotikCommandResult> {
    const startTime = Date.now();
    const port = 8728;

    return new Promise((resolve) => {
      const client = new net.Socket();
      let rxBuf: Buffer = Buffer.alloc(0);
      let stage = apiVersion === '6.45.1+' ? 'direct-login' : 'challenge';
      let resolved = false;
      const rows: Record<string, string>[] = [];

      const done = (result: MikrotikCommandResult) => {
        if (resolved) return;
        resolved = true;
        client.destroy();
        resolve(result);
      };

      const timer = setTimeout(() => {
        done({
          success: false,
          data: rows,
          error: `Command timed out after ${timeoutMs}ms`,
          latencyMs: Date.now() - startTime,
        });
      }, timeoutMs);

      const sendCommand = () => {
        const words = [command];
        for (const [key, value] of Object.entries(params)) {
          words.push(`=${key}=${value}`);
        }
        client.write(this.encodeSentence(words));
        stage = 'command';
      };

      client.on('error', (err: Error) => {
        clearTimeout(timer);
        this.logger.warn(`MikroTik command error (${ipAddress}): ${err.message}`);
        done({
          success: false,
          data: rows,
          error: `Connection failed: ${err.message}`,
          latencyMs: Date.now() - startTime,
        });
      });

      client.on('close', () => {
        clearTimeout(timer);
        if (!resolved) {
          done({
            success: false,
            data: rows,
            error: 'Connection closed unexpectedly',
            latencyMs: Date.now() - startTime,
          });
        }
      });

      client.connect(port, ipAddress, () => {
        this.logger.debug(`executeCommand: TCP connected to ${ipAddress}:${port}`);
        if (stage === 'direct-login') {
          client.write(
            this.encodeSentence(['/login', `=name=${apiUsername}`, `=password=${apiPassword}`]),
          );
        } else {
          client.write(this.encodeSentence(['/login']));
        }
      });

      client.on('data', (data: Buffer) => {
        rxBuf = Buffer.concat([rxBuf, data]);

        while (rxBuf.length > 0) {
          const result = this.decodeSentence(rxBuf);
          if (!result || result.words.length === 0) break;
          rxBuf = result.remaining;
          const words = result.words;

          this.logger.debug(`executeCommand stage=${stage} words=${JSON.stringify(words)}`);

          if (stage === 'direct-login') {
            if (words.includes('!done')) {
              sendCommand();
            } else if (words.includes('!trap')) {
              const msg = words.find((w) => w.startsWith('=message='));
              clearTimeout(timer);
              done({
                success: false,
                data: [],
                error: `Authentication failed: ${msg ? msg.substring(9) : 'unknown error'}`,
                latencyMs: Date.now() - startTime,
              });
              return;
            }
          } else if (stage === 'challenge') {
            const retWord = words.find((w) => w.startsWith('=ret='));
            if (retWord) {
              const challenge = retWord.substring(5);
              const challengeBuf = Buffer.from(challenge, 'hex');
              const hash = crypto.createHash('md5');
              hash.update(Buffer.from([0]));
              hash.update(Buffer.from(apiPassword, 'utf-8'));
              hash.update(challengeBuf);
              const response = '00' + hash.digest('hex');
              stage = 'auth';
              client.write(
                this.encodeSentence(['/login', `=name=${apiUsername}`, `=response=${response}`]),
              );
            } else if (words.includes('!trap') || words.includes('!fatal')) {
              const msg = words.find((w) => w.startsWith('=message='));
              clearTimeout(timer);
              done({
                success: false,
                data: [],
                error: `Login method not supported — switch API version to "6.45.1+". ${msg ? msg.substring(9) : ''}`,
                latencyMs: Date.now() - startTime,
              });
              return;
            } else if (words.includes('!done') && !words.find((w) => w.startsWith('=ret='))) {
              clearTimeout(timer);
              done({
                success: false,
                data: [],
                error: 'Router did not send challenge — switch API version to "6.45.1+" for RouterOS 6.45.1+ / 7.x',
                latencyMs: Date.now() - startTime,
              });
              return;
            }
          } else if (stage === 'auth') {
            if (words.includes('!done')) {
              sendCommand();
            } else if (words.includes('!trap')) {
              const msg = words.find((w) => w.startsWith('=message='));
              clearTimeout(timer);
              done({
                success: false,
                data: [],
                error: `Authentication failed: ${msg ? msg.substring(9) : 'unknown error'}`,
                latencyMs: Date.now() - startTime,
              });
              return;
            }
          } else if (stage === 'command') {
            if (words.includes('!re')) {
              const row: Record<string, string> = {};
              for (const w of words) {
                if (w.startsWith('=') && w !== '!re') {
                  const eqIdx = w.indexOf('=', 1);
                  if (eqIdx > 0) {
                    row[w.substring(1, eqIdx)] = w.substring(eqIdx + 1);
                  }
                }
              }
              if (Object.keys(row).length > 0) rows.push(row);
            } else if (words.includes('!done')) {
              clearTimeout(timer);
              done({
                success: true,
                data: rows,
                latencyMs: Date.now() - startTime,
              });
            } else if (words.includes('!trap')) {
              const msg = words.find((w) => w.startsWith('=message='));
              clearTimeout(timer);
              done({
                success: false,
                data: rows,
                error: msg ? msg.substring(9) : 'Command failed',
                latencyMs: Date.now() - startTime,
              });
              return;
            }
          }
        }
      });
    });
  }

  async checkReachability(ipAddress: string, timeoutMs: number = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timer = setTimeout(() => {
        client.destroy();
        resolve(false);
      }, timeoutMs);

      client.connect(8728, ipAddress, () => {
        clearTimeout(timer);
        client.destroy();
        resolve(true);
      });

      client.on('error', () => {
        clearTimeout(timer);
        client.destroy();
        resolve(false);
      });
    });
  }

  private encodeLength(len: number): Buffer {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x4000) {
      const buf = Buffer.alloc(2);
      buf.writeUInt16BE(len | 0x8000);
      return buf;
    }
    if (len < 0x200000) {
      const buf = Buffer.alloc(3);
      buf[0] = ((len >> 16) & 0x1f) | 0xc0;
      buf[1] = (len >> 8) & 0xff;
      buf[2] = len & 0xff;
      return buf;
    }
    if (len < 0x10000000) {
      const buf = Buffer.alloc(4);
      buf.writeUInt32BE(len | 0xe0000000);
      return buf;
    }
    const buf = Buffer.alloc(5);
    buf[0] = 0xf0;
    buf.writeUInt32BE(len, 1);
    return buf;
  }

  private encodeWord(word: string): Buffer {
    const wordBuf = Buffer.from(word, 'utf-8');
    return Buffer.concat([this.encodeLength(wordBuf.length), wordBuf]);
  }

  private encodeSentence(words: string[]): Buffer {
    const parts = words.map((w) => this.encodeWord(w));
    parts.push(this.encodeWord(''));
    return Buffer.concat(parts);
  }

  private decodeLength(
    buf: Buffer,
    offset: number,
  ): { len: number; next: number } | null {
    if (offset >= buf.length) return null;
    const b = buf[offset];
    if ((b & 0x80) === 0) return { len: b, next: offset + 1 };
    if (offset + 1 >= buf.length) return null;
    if ((b & 0xc0) === 0x80) {
      return { len: ((b & 0x3f) << 8) | buf[offset + 1], next: offset + 2 };
    }
    if (offset + 2 >= buf.length) return null;
    if ((b & 0xe0) === 0xc0) {
      return {
        len: ((b & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2],
        next: offset + 3,
      };
    }
    if (offset + 3 >= buf.length) return null;
    if ((b & 0xf0) === 0xe0) {
      return {
        len:
          ((b & 0x0f) << 24) |
          (buf[offset + 1] << 16) |
          (buf[offset + 2] << 8) |
          buf[offset + 3],
        next: offset + 4,
      };
    }
    if (offset + 4 >= buf.length) return null;
    return {
      len:
        (buf[offset + 1] << 24) |
        (buf[offset + 2] << 16) |
        (buf[offset + 3] << 8) |
        buf[offset + 4],
      next: offset + 5,
    };
  }

  private decodeSentence(
    buf: Buffer,
  ): { words: string[]; remaining: Buffer } | null {
    const words: string[] = [];
    let offset = 0;
    while (offset < buf.length) {
      const result = this.decodeLength(buf, offset);
      if (!result) return null; // incomplete data
      if (result.len === 0) {
        offset = result.next;
        break;
      }
      if (result.next + result.len > buf.length) return null; // incomplete word
      const word = buf.slice(result.next, result.next + result.len).toString('utf-8');
      words.push(word);
      offset = result.next + result.len;
    }
    if (words.length === 0) return null;
    return { words, remaining: buf.slice(offset) };
  }
}
