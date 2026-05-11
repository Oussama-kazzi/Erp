const History = require('../models/History');

const logHistory = async ({ action, module, description, user = 'admin', referenceId, metadata }) => {
  try {
    await History.create({ action, module, description, user, referenceId, metadata });
  } catch (err) {
    console.error('History log error:', err.message);
  }
};

module.exports = logHistory;
