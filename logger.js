const levels = ['error', 'warn', 'info', 'debug'];
const level = process.env.LOG_LEVEL || 'info';
const levelIndex = levels.indexOf(level);

function createLoggerMethod(method, idx) {
  if (idx <= levelIndex) {
    return (...args) => {
      const time = new Date().toISOString();
      const fn = console[method] || console.log;
      fn(`[${time}]`, ...args);
    };
  }
  return () => {};
}

const logger = {
  error: createLoggerMethod('error', 0),
  warn: createLoggerMethod('warn', 1),
  info: createLoggerMethod('info', 2),
  debug: createLoggerMethod('debug', 3),
};

module.exports = logger;
