import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SchedulerService {
  constructor() {
    this.scheduledJobs = new Map();
    this.configPath = path.join(__dirname, '..', 'scheduler-config.json');
    this.config = null;
  }

  async initialize() {
    try {
      // Load or create config
      await this.loadConfig();
      console.log('✅ Scheduler Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize scheduler:', error);
    }
  }

  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // Create default config if doesn't exist
      this.config = {
        autoScanEnabled: true,
        scanSchedule: '0 8 * * *', // Daily at 8 AM (cron format)
        scanDaysBack: 7, // Only scan last 7 days in background scans
        maxEmailsPerScan: 50,
        autoImportConfirmed: false, // Will be enabled in Task 2
        lastScanTime: null,
        lastScanStatus: null,
      };
      await this.saveConfig();
    }
  }

  async saveConfig() {
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }

  getConfig() {
    return this.config;
  }

  // Schedule automatic email scanning
  scheduleEmailScan(scanCallback) {
    if (!this.config.autoScanEnabled) {
      console.log('⏸️  Auto-scan is disabled');
      return;
    }

    // Validate cron expression
    if (!cron.validate(this.config.scanSchedule)) {
      console.error('❌ Invalid cron expression:', this.config.scanSchedule);
      return;
    }

    // Stop existing job if any
    if (this.scheduledJobs.has('emailScan')) {
      this.scheduledJobs.get('emailScan').stop();
    }

    // Schedule new job
    const job = cron.schedule(this.config.scanSchedule, async () => {
      console.log('🔄 Starting scheduled email scan...');

      try {
        const result = await scanCallback({
          maxResults: this.config.maxEmailsPerScan,
          daysBack: this.config.scanDaysBack,
        });

        await this.updateConfig({
          lastScanTime: new Date().toISOString(),
          lastScanStatus: 'success',
        });

        console.log(`✅ Scheduled scan completed: ${result.detected?.length || 0} subscriptions detected`);
      } catch (error) {
        console.error('❌ Scheduled scan failed:', error);

        await this.updateConfig({
          lastScanTime: new Date().toISOString(),
          lastScanStatus: 'failed',
        });
      }
    });

    this.scheduledJobs.set('emailScan', job);
    console.log(`⏰ Email scanning scheduled: ${this.config.scanSchedule} (${this.getCronDescription()})`);
  }

  // Get human-readable description of cron schedule
  getCronDescription() {
    const schedule = this.config.scanSchedule;
    const descriptions = {
      '0 8 * * *': 'Daily at 8:00 AM',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 9 * * 1': 'Every Monday at 9:00 AM',
    };
    return descriptions[schedule] || schedule;
  }

  // Schedule renewal reminders check (will be used in Task 4)
  scheduleRenewalReminders(reminderCallback) {
    // Check for renewals every day at 9 AM
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('🔔 Checking for renewal reminders...');

      try {
        await reminderCallback();
        console.log('✅ Renewal reminders checked');
      } catch (error) {
        console.error('❌ Renewal reminder check failed:', error);
      }
    });

    this.scheduledJobs.set('renewalReminders', job);
    console.log('⏰ Renewal reminders scheduled: Daily at 9:00 AM');
  }

  // Stop all scheduled jobs
  stopAll() {
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Stopped job: ${name}`);
    });
    this.scheduledJobs.clear();
  }

  // Get status of all jobs
  getStatus() {
    const jobs = [];
    this.scheduledJobs.forEach((job, name) => {
      jobs.push({
        name,
        status: 'running',
      });
    });

    return {
      config: this.config,
      activeJobs: jobs,
      nextScanDescription: this.getCronDescription(),
    };
  }
}

export default new SchedulerService();
