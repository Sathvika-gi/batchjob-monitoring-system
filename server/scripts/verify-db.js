import '../src/config/loadEnv.js';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { redactMongoUri } from '../src/utils/redact.js';

const COLLECTION = '_connection_probe';

function fail(step, error) {
  console.error(`FAIL ${step}: ${error?.name || 'Error'} — ${redactMongoUri(error?.message || error)}`);
}

async function main() {
  let probes;
  let marker;
  let probeInserted = false;

  try {
    console.log('1. Connect to MongoDB...');
    await connectDB();
    console.log('PASS connect');

    console.log('2. Database ping...');
    const ping = await mongoose.connection.db.admin().command({ ping: 1 });
    if (ping?.ok !== 1) throw new Error('Ping did not return ok=1');
    console.log('PASS ping');

    probes = mongoose.connection.collection(COLLECTION);
    marker = `probe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const doc = { marker, createdAt: new Date(), purpose: 'connectivity-verification' };

    console.log('3. Read from probe collection...');
    const existing = await probes.find({}).limit(5).toArray();
    console.log(`PASS read (found ${existing.length} existing probe document(s))`);

    console.log('4. Insert test document...');
    const inserted = await probes.insertOne(doc);
    if (!inserted.insertedId) throw new Error('Insert did not return an id');
    probeInserted = true;
    console.log('PASS write');

    console.log('5. Read back inserted document...');
    const found = await probes.findOne({ marker });
    if (!found) throw new Error('Inserted document was not found');
    console.log('PASS read-back');

    console.log('6. Delete test document...');
    const deleted = await probes.deleteOne({ marker });
    if (deleted.deletedCount !== 1) throw new Error('Test document was not deleted');
    probeInserted = false;
    console.log('PASS delete');
    console.log('RESULT: all database operations succeeded');
  } catch (error) {
    fail('database verification', error);
    process.exitCode = 1;
  } finally {
    if (probeInserted) {
      try {
        const cleanup = await probes.deleteOne({ marker });
        if (cleanup.deletedCount === 1) console.log('PASS cleanup after failed verification');
        else {
          console.error('FAIL cleanup: verification document was not found');
          process.exitCode = 1;
        }
      } catch (error) {
        fail('cleanup', error);
        process.exitCode = 1;
      }
    }
    await mongoose.disconnect().catch(() => {});
    console.log('Connection closed');
  }
}

main().catch((error) => {
  fail('unexpected', error);
  process.exitCode = 1;
});
