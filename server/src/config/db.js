import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { redactMongoUri } from '../utils/redact.js';

const execAsync = promisify(exec);

const STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersAttached = false;

function connectionKind(uri) {
  if (uri.startsWith('mongodb+srv://') || uri.includes('mongodb.net')) {
    return 'atlas';
  }
  return 'local';
}

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB runtime error: ${redactMongoUri(err.message)}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}

export async function resolveSrvToDirectUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return null;

  try {
    const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
    if (!match) return null;

    const [, user, pass, host, db = '', query = ''] = match;
    const srvCmd = process.platform === 'win32'
      ? `nslookup -type=SRV _mongodb._tcp.${host}`
      : `dig +short SRV _mongodb._tcp.${host} || host -t SRV _mongodb._tcp.${host}`;

    const { stdout: srvOut } = await execAsync(srvCmd, { timeout: 7000 });

    const hosts = [];
    const hostRegex = /(?:svr hostname\s*=\s*|\d+\s+\d+\s+\d+\s+)([a-zA-Z0-9.-]+\.mongodb\.net)/gi;
    let m;
    while ((m = hostRegex.exec(srvOut)) !== null) {
      const hostname = m[1].replace(/\.$/, '');
      if (!hosts.includes(`${hostname}:27017`)) {
        hosts.push(`${hostname}:27017`);
      }
    }

    if (hosts.length === 0) return null;

    const params = new URLSearchParams();
    params.set('ssl', 'true');
    params.set('authSource', 'admin');

    try {
      const txtCmd = process.platform === 'win32'
        ? `nslookup -type=TXT ${host}`
        : `dig +short TXT ${host} || host -t TXT ${host}`;
      const { stdout: txtOut } = await execAsync(txtCmd, { timeout: 5000 });
      const txtMatch = txtOut.match(/"([^"]+)"/);
      if (txtMatch) {
        const txtParams = new URLSearchParams(txtMatch[1]);
        for (const [key, val] of txtParams.entries()) {
          params.set(key, val);
        }
      }
    } catch {
      // TXT lookup optional
    }

    if (query) {
      const userParams = new URLSearchParams(query.replace(/^\?/, ''));
      for (const [key, val] of userParams.entries()) {
        if (key !== 'appName') {
          params.set(key, val);
        }
      }
    }

    return `mongodb://${user}:${pass}@${hosts.join(',')}${db}?${params.toString()}`;
  } catch (err) {
    logger.warn(`SRV auto-resolution fallback error: ${err.message}`);
    return null;
  }
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  const kind = connectionKind(uri);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    attachConnectionListeners();
    logger.info(`MongoDB connected successfully (${kind}, db=${mongoose.connection.name})`);
    return mongoose.connection;
  } catch (error) {
    if (uri.startsWith('mongodb+srv://') && (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED'))) {
      logger.warn('querySrv lookup failed (local network/Windows DNS restriction). Attempting automatic resolution to direct replica-set hosts...');
      const fallbackUri = await resolveSrvToDirectUri(uri);
      if (fallbackUri) {
        try {
          await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 10000,
          });
          attachConnectionListeners();
          logger.info(`MongoDB connected successfully via fallback direct URI (atlas, db=${mongoose.connection.name})`);
          return mongoose.connection;
        } catch (fallbackError) {
          logger.error(`Fallback connection also failed: ${redactMongoUri(fallbackError.message)}`);
        }
      }
    }

    logger.error(`MongoDB connection failed: ${redactMongoUri(error.message)}`);
    throw error;
  }
}

export function getDatabaseStatus() {
  const readyState = mongoose.connection.readyState;
  return {
    readyState,
    status: STATE_LABELS[readyState] || 'unknown',
    connected: readyState === 1,
  };
}

export async function pingDatabase() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return false;
  }
  const result = await mongoose.connection.db.admin().command({ ping: 1 });
  return result?.ok === 1;
}

export default connectDB;

