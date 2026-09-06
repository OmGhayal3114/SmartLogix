const cron = require('node-cron');
const alertAggregator = require('../services/alertAggregator');

let cronJob = null;

exports.start = () => {
  // Refresh current NER alerts every five minutes.
  cronJob = cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Running five-minute NER alert update...');
    try {
      await alertAggregator.aggregate();
    } catch (err) {
      console.error('[Cron] Alert update failed:', err.message);
    }
  });

  // Run once on startup after 5 seconds (allow MongoDB to connect first)
  setTimeout(async () => {
    console.log('[Startup] Running initial alert aggregation...');
    try {
      await alertAggregator.aggregate();
    } catch (err) {
      console.error('[Startup] Initial alert aggregation failed:', err.message);
    }
  }, 5000);

  console.log('[Cron] NER alert update scheduled every 5 minutes.');
};

exports.stop = () => {
  if (cronJob) {
    cronJob.stop();
    console.log('[Cron] Alert update job stopped.');
  }
};
