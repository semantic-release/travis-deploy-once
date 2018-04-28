const chalk = require('chalk');

/**
 * Logger with `log` and `error` function.
 *
 * @param {String} namespace log prefix
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
