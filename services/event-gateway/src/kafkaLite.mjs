/**
 * Tiny Kafka-compatible client: ApiVersions probe + Produce v0.
 * Used when REDPANDA_BROKER is set. Not a replacement for KafkaJS in production.
 */
import net from 'node:net';
import { crc32 } from 'node:zlib';

const PROBE_TTL_MS = 15_000;

function int8(n) {
  return Buffer.from([n & 0xff]);
}
function int16(n) {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(n);
  return buf;
}
function int32(n) {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(n);
  return buf;
}
function int64(n) {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(n));
  return buf;
}
function kafkaString(value) {
  const body = Buffer.from(String(value), 'utf8');
  return Buffer.concat([int16(body.length), body]);
}
function kafkaBytes(buf) {
  if (buf == null) return int32(-1);
  return Buffer.concat([int32(buf.length), buf]);
}
function frame(payload) {
  return Buffer.concat([int32(payload.length), payload]);
}
function header(apiKey, apiVersion, correlationId, clientId = 'signalroom') {
  return Buffer.concat([int16(apiKey), int16(apiVersion), int32(correlationId), kafkaString(clientId)]);
}

export function parseBroker(broker) {
  if (!broker) return null;
  const raw = String(broker).replace(/^kafka:\/\//i, '').replace(/^PLAINTEXT:\/\//i, '');
  const hostPort = raw.includes('://') ? new URL(raw).host : raw;
  const [host, port] = hostPort.split(':');
  if (!host) return null;
  return { host, port: Number(port || 9092) };
}

export function createKafkaLite({ broker, connectImpl, timeoutMs = 700 } = {}) {
  let last = { ok: false, at: 0, error: 'unprobed', protocol: 'kafka' };

  function withSocket(payload) {
    const target = parseBroker(broker);
    if (!target) return Promise.reject(new Error('broker unconfigured'));
    return new Promise((resolve, reject) => {
      const socket = connectImpl
        ? connectImpl(target)
        : net.connect({ host: target.host, port: target.port });
      const chunks = [];
      const timer = setTimeout(() => {
        socket.destroy();
        reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
      }, timeoutMs);
      const finish = (error, data) => {
        clearTimeout(timer);
        try { socket.destroy(); } catch { /* ignore */ }
        if (error) reject(error);
        else resolve(data);
      };
      socket.on('connect', () => {
        try { socket.write(payload); } catch (error) { finish(error); }
      });
      socket.on('data', (chunk) => {
        chunks.push(chunk);
        const buf = Buffer.concat(chunks);
        if (buf.length >= 4 && buf.length >= 4 + buf.readInt32BE(0)) finish(null, buf);
      });
      socket.on('error', (error) => finish(error));
      socket.on('end', () => {
        if (chunks.length) finish(null, Buffer.concat(chunks));
      });
    });
  }

  async function probe() {
    if (!broker) {
      last = { ok: false, at: Date.now(), error: 'unconfigured', protocol: 'kafka' };
      return last;
    }
    if (last.at && Date.now() - last.at < PROBE_TTL_MS && last.error !== 'unprobed') return last;
    try {
      await withSocket(frame(header(18, 0, 1)));
      last = { ok: true, at: Date.now(), error: null, protocol: 'kafka' };
    } catch (error) {
      last = { ok: false, at: Date.now(), error: error.code || error.message || 'unreachable', protocol: 'kafka' };
    }
    return last;
  }

  async function send({ topic, messages }) {
    const status = await probe();
    if (!status.ok) throw new Error(`kafka broker not reachable: ${status.error}`);
    const message = messages?.[0];
    if (!message?.value) throw new Error('kafka produce requires a message value');
    const value = Buffer.from(typeof message.value === 'string' ? message.value : JSON.stringify(message.value));
    const key = message.key != null ? Buffer.from(String(message.key)) : null;
    const inner = Buffer.concat([int8(0), int8(0), kafkaBytes(key), kafkaBytes(value)]);
    const crc = crc32(inner);
    const packed = Buffer.concat([int32(crc >>> 0), inner]);
    const messageSet = Buffer.concat([int64(0), int32(packed.length), packed]);
    const partition = Buffer.concat([int32(0), int32(messageSet.length), messageSet]);
    const topicBlock = Buffer.concat([kafkaString(topic), int32(1), partition]);
    const body = Buffer.concat([header(0, 0, 2), int16(1), int32(1500), int32(1), topicBlock]);
    await withSocket(frame(body));
    last = { ok: true, at: Date.now(), error: null, protocol: 'kafka', lastTopic: topic };
    return { topic, count: messages.length };
  }

  return {
    probe,
    send,
    last: () => ({ ...last }),
    configured: Boolean(broker),
  };
}
