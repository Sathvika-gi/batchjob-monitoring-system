import { getDatabaseStatus, pingDatabase } from '../config/db.js';

async function inspectDatabase() {
  const status = getDatabaseStatus();
  let pingOk = false;

  if (status.connected) {
    try {
      pingOk = await pingDatabase();
    } catch {
      pingOk = false;
    }
  }

  const available = status.connected && pingOk;
  return {
    available,
    label: available ? 'connected' : 'unavailable',
  };
}

export const getHealth = async (req, res, next) => {
  try {
    const database = await inspectDatabase();
    const success = database.available;

    return res.status(success ? 200 : 503).json({
      success,
      data: {
        application: 'healthy',
        database: database.label,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReadiness = async (req, res, next) => {
  try {
    const database = await inspectDatabase();

    if (!database.available) {
      return res.status(503).json({
        success: false,
        data: {
          application: 'not_ready',
          database: 'unavailable',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        application: 'ready',
        database: 'connected',
      },
    });
  } catch (err) {
    next(err);
  }
};
