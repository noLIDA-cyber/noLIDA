const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = process.env.LOG_LEVEL || 'info';

const writeLog = (level, message, meta = {}) => {
  if (logLevels[level] > logLevels[currentLevel]) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logLine = JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });

  const logFile = path.join(logDir, `${level}.log`);
  fs.appendFileSync(logFile, logLine + '\n');

  if (level === 'error') {
    console.error(logLine);
  } else if (level === 'warn') {
    console.warn(logLine);
  } else if (level === 'info' && currentLevel === 'info') {
    console.log(logLine);
  }
};

module.exports = {
  error: (message, meta) => writeLog('error', message, meta),
  warn: (message, meta) => writeLog('warn', message, meta),
  info: (message, meta) => writeLog('info', message, meta),
  debug: (message, meta) => writeLog('debug', message, meta),
};