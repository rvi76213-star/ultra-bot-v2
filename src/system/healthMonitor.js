const os = require('os');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class HealthMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      messagesProcessed: 0,
      commandsExecuted: 0,
      errors: 0,
      memoryUsage: [],
      cpuUsage: []
    };
    
    this.thresholds = {
      memory: 0.8, // 80% memory usage
      cpu: 0.7,    // 70% CPU usage
      errors: 10   // 10 errors per minute
    };
    
    this.startMonitoring();
  }
  
  startMonitoring() {
    // Collect metrics every 30 seconds
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);
    
    // Check health every minute
    this.healthInterval = setInterval(() => {
      this.checkHealth();
    }, 60000);
    
    logger.info('Health monitoring started');
  }
  
  async collectMetrics() {
    try {
      // Memory usage
      const memory = process.memoryUsage();
      const totalMemory = os.totalmem();
      const memoryPercent = memory.heapUsed / totalMemory;
      
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        percent: memoryPercent
      });
      
      // Keep only last 100 readings
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
      }
      
      // CPU usage (simplified)
      const cpuLoad = os.loadavg()[0] / os.cpus().length;
      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        load: cpuLoad
      });
      
      if (this.metrics.cpuUsage.length > 100) {
        this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
      }
      
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }
  
  async checkHealth() {
    const warnings = [];
    
    // Check memory usage
    const recentMemory = this.metrics.memoryUsage.slice(-10);
    if (recentMemory.length > 0) {
      const avgMemory = recentMemory.reduce((sum, m) => sum + m.percent, 0) / recentMemory.length;
      if (avgMemory > this.thresholds.memory) {
        warnings.push(`High memory usage: ${(avgMemory * 100).toFixed(1)}%`);
      }
    }
    
    // Check CPU usage
    const recentCPU = this.metrics.cpuUsage.slice(-10);
    if (recentCPU.length > 0) {
      const avgCPU = recentCPU.reduce((sum, c) => sum + c.load, 0) / recentCPU.length;
      if (avgCPU > this.thresholds.cpu) {
        warnings.push(`High CPU usage: ${(avgCPU * 100).toFixed(1)}%`);
      }
    }
    
    // Check error rate
    const minuteAgo = Date.now() - 60000;
    const recentErrors = this.metrics.errors.filter(time => time > minuteAgo);
    if (recentErrors.length > this.thresholds.errors) {
      warnings.push(`High error rate: ${recentErrors.length} errors/minute`);
    }
    
    // Log warnings if any
    if (warnings.length > 0) {
      logger.warn('Health check warnings:', { warnings });
      
      // Send alert to owner if configured
      this.sendHealthAlert(warnings);
    }
  }
  
  async sendHealthAlert(warnings) {
    try {
      const config = require('../../config/config.json');
      const ownerId = config.ownerUid;
      
      if (!ownerId) return;
      
      // Get API instance (this would need to be passed or accessed differently)
      // For now, just log
      logger.warn('Health alert (would send to owner):', { warnings });
      
    } catch (error) {
      logger.error('Error sending health alert:', error);
    }
  }
  
  recordMessage() {
    this.metrics.messagesProcessed++;
  }
  
  recordCommand() {
    this.metrics.commandsExecuted++;
  }
  
  recordError() {
    this.metrics.errors.push(Date.now());
    
    // Keep only errors from last hour
    const hourAgo = Date.now() - 3600000;
    this.metrics.errors = this.metrics.errors.filter(time => time > hourAgo);
  }
  
  getHealthReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const recentMemory = this.metrics.memoryUsage.slice(-5);
    const recentCPU = this.metrics.cpuUsage.slice(-5);
    
    const avgMemory = recentMemory.length > 0 
      ? recentMemory.reduce((sum, m) => sum + m.percent, 0) / recentMemory.length 
      : 0;
    
    const avgCPU = recentCPU.length > 0
      ? recentCPU.reduce((sum, c) => sum + c.load, 0) / recentCPU.length
      : 0;
    
    return {
      status: 'healthy',
      uptime: Math.floor(uptime / 1000),
      messagesProcessed: this.metrics.messagesProcessed,
      commandsExecuted: this.metrics.commandsExecuted,
      errorsLastHour: this.metrics.errors.length,
      memoryUsage: `${(avgMemory * 100).toFixed(1)}%`,
      cpuUsage: `${(avgCPU * 100).toFixed(1)}%`,
      warnings: this.getWarnings()
    };
  }
  
  getWarnings() {
    const warnings = [];
    const report = this.getHealthReport();
    
    if (parseFloat(report.memoryUsage) > this.thresholds.memory * 100) {
      warnings.push('High memory usage');
    }
    
    if (parseFloat(report.cpuUsage) > this.thresholds.cpu * 100) {
      warnings.push('High CPU usage');
    }
    
    if (report.errorsLastHour > this.thresholds.errors * 6) { // 10/hour = ~1.67/minute
      warnings.push('High error rate');
    }
    
    return warnings;
  }
  
  async generateDiagnosticReport() {
    const report = {
      timestamp: new Date().toISOString(),
      health: this.getHealthReport(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        uptime: os.uptime()
      },
      process: {
        pid: process.pid,
        version: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        argv: process.argv.slice(0, 3)
      },
      bot: {
        activeThreads: global.activeThreads || 0,
        activeFuns: global.funIntervals ? Object.keys(global.funIntervals).length : 0,
        cacheStats: global.cacheManager ? global.cacheManager.getStats() : null
      }
    };
    
    // Save report to file
    const reportDir = path.join(__dirname, '../../data/logs/diagnostics');
    await fs.mkdir(reportDir, { recursive: true });
    
    const filename = `diagnostic-${Date.now()}.json`;
    const filepath = path.join(reportDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    logger.info('Diagnostic report generated', { filename });
    
    return { filepath, report };
  }
  
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    
    logger.info('Health monitoring stopped');
  }
}

module.exports = new HealthMonitor();