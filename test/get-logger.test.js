import test from 'ava';
import {stub} from 'sinon';
import chalk from 'chalk';
import getLogger from '../lib/get-logger';

test.beforeEach(t => {
  t.context.log = stub(console, 'log');
  t.context.error = stub(console, 'error');
});

test.afterEach.always(t => {
  t.context.log.restore();
  t.context.error.restore();
});

test('Log with namespace', t => {
  const logger = getLogger('Namespace');
  logger.log('test log');
  logger.error('test error');

  t.is(t.context.log.args[0][0], `${chalk.magenta('[Namespace]:')} test log`);
  t.is(t.context.error.args[0][0], `${chalk.magenta('[Namespace]:')} ${chalk.red('test error')}`);
});

test('Log without namespace', t => {
  const logger = getLogger();
  logger.log('test log');
  logger.error('test error');

  t.is(t.context.log.args[0][0], 'test log');
  t.is(t.context.error.args[0][0], chalk.red('test error'));
});
