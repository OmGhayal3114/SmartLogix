const cron = require('node-cron');
const alertAggregator = require('../services/alertAggregator');

let cronJob = null;

exports.start = () => {
  // Run daily at 06:00 IST (UTC 00:30)
  cronJob = cron.schedule('30 0 * * *', async () => {
    console.log('[Cron] Running daily NER alert update...');
    try {
      await alertAggregator.aggregate();
      await alertAggregator.seedSampleAlerts(); // ensure DB never empty
    } catch (err) {
      console.error('[Cron] Alert update failed:', err.message);
    }
  });

  // Run once on startup after 5 seconds (allow MongoDB to connect first)
  setTimeout(async () => {
    console.log('[Startup] Running initial alert aggregation...');
    try {
      await alertAggregator.aggregate();
      await alertAggregator.seedSampleAlerts();
    } catch (err) {
      console.error('[Startup] Initial alert aggregation failed:', err.message);
    }
  }, 5000);

  console.log('[Cron] Daily NER alert update scheduled (06:00 IST / 00:30 UTC).');
};

exports.stop = () => {
  if (cronJob) {
    cronJob.stop();
    console.log('[Cron] Alert update job stopped.');
  }
};
