const chalk = require('chalk');

/**
 * @param {String} namespace log prefix.
 *
 * @returns {Object} Logger with `log` and `error` function.
 */
module.exports = namespace => {
  return {
    log(...args) {
      console.log(`${namespace ? `${chalk.magenta(`[${namespace}]:`)} ` : ''}${args.join()}`);
    },
    error(...args) {
      console.error(`${namespace ? `${chalk.magenta(`[${namespace}]:`)} ` : ''}${chalk.red(args.join())}`);
    },
  };
};
