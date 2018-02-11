import test from 'ava';
import proxyquire from 'proxyquire';
import clearModule from 'clear-module';
import {stub} from 'sinon';

// Save the current process.env
const envBackup = Object.assign({}, process.env);
const argvBackup = Object.assign({}, process.argv);

test.beforeEach(t => {
  process.env.NO_UPDATE_NOTIFIER = true;
  clearModule('yargs');
  t.context.logs = '';
  t.context.errors = '';
  t.context.stdout = stub(process.stdout, 'write').callsFake(val => {
    t.context.logs += val.toString();
  });
  t.context.stderr = stub(process.stderr, 'write').callsFake(val => {
    t.context.errors += val.toString();
  });
});

test.afterEach.always(t => {
  process.env = envBackup;
  process.argv = argvBackup;
  t.context.stdout.restore();
  t.context.stderr.restore();
  delete process.exitCode;
});

test.serial('Execute the script and return with script exit code if travis-deploy-once returns "true"', async t => {
  const travisDeployOnce = stub().resolves(true);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'echo Test script && exit 100'];
  await cli();

  t.regex(t.context.logs, /Test script/);
  t.is(process.exitCode, 100);
});

test.serial('If no script is set, return with exit code 0 if travis-deploy-once returns "true"', async t => {
  const travisDeployOnce = stub().resolves(true);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', ''];
  await cli();
  t.is(process.exitCode, 0);
});

test.serial('Do not execute the script and return with exit code 0 if travis-deploy-once returns "false"', async t => {
  const travisDeployOnce = stub().resolves(false);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'echo Test script && exit 100'];
  await cli();
  t.notRegex(t.context.logs, /Test script/);
  t.falsy(process.exitCode);
});

test.serial('If no script is set, return with exit code 1 if travis-deploy-once returns "false"', async t => {
  const travisDeployOnce = stub().resolves(false);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', ''];
  await cli();
  t.is(process.exitCode, 1);
});

test.serial('Do not execute the script and return with exit code 0 if travis-deploy-once returns "null"', async t => {
  const travisDeployOnce = stub().resolves(null);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'echo Test script && exit 100'];
  await cli();
  t.notRegex(t.context.logs, /Test script/);
  t.falsy(process.exitCode);
});

test.serial('If no script is set, return with exit code 1 if travis-deploy-once returns "null"', async t => {
  const travisDeployOnce = stub().resolves(null);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', ''];
  await cli();
  t.is(process.exitCode, 1);
});

test.serial('Do not execute the script and return with exit code 1 if travis-deploy-once throws an error', async t => {
  const travisDeployOnce = stub().rejects(new Error('travis-deploy-once error'));
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'echo Test script && exit 100'];
  await cli();
  t.regex(t.context.errors, /travis-deploy-once error/);
  t.notRegex(t.context.logs, /Test script/);
  t.is(process.exitCode, 1);
});

test.serial('Do not execute the script and return with exit code 0 for --help', async t => {
  const travisDeployOnce = stub().resolves(true);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'echo Test script', '--help'];
  await cli();
  t.notRegex(t.context.logs, /Test script/);
  t.is(process.exitCode, 0);
});

test.serial('Do not execute the script and return with exit code 0 for --version', async t => {
  const travisDeployOnce = stub().resolves(true);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'echo Test script', '--version'];
  await cli();
  t.notRegex(t.context.logs, /Test script/);
  t.is(process.exitCode, 0);
});

test.serial('Pass options to travis-deploy-once', async t => {
  const travisDeployOnce = stub().resolves(true);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'echo Test script', '-b', 1, '-t', 'token', '-p', '-u', 'https://example.com/api'];
  await cli();

  t.deepEqual(travisDeployOnce.args[0], [
    {travisOpts: {enterprise: 'https://example.com/api', pro: true}, buildLeaderId: 1, githubToken: 'token'},
  ]);
  t.regex(t.context.logs, /Test script/);
  t.is(process.exitCode, 0);
});

test.serial('Return an error if there is multiple script argument set', async t => {
  const travisDeployOnce = stub().resolves(true);
  const cli = proxyquire('../cli', {'./lib/travis-deploy-once': travisDeployOnce});

  process.argv = ['', '', 'script1', 'script2'];
  await cli();

  t.notRegex(t.context.logs, /Test script/);
  // Check that the CLI display the help message
  t.regex(t.context.errors, /Run a deployment script only once in the Travis test matrix/);
  t.is(process.exitCode, 1);
});
