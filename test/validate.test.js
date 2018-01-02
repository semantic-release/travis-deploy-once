import test from 'ava';
import validate from '../lib/validate';

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(() => {
  delete process.env.TRAVIS;
  delete process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.TRAVIS_BUILD_ID;
  delete process.env.TRAVIS_JOB_ID;
  delete process.env.TRAVIS_JOB_NUMBER;
  delete process.env.BUILD_LEADER_ID;
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
});

test('Throw error if does not run on Travis', t => {
  t.throws(() => validate('GH_TOKEN'), Error, 'Not running on Travis');
});

test('Throw error if GitHub authentication missing', t => {
  process.env.TRAVIS = 'true';
  t.throws(() => validate(), Error, 'GitHub authentication missing');
});

test('Does not throw error if environment is valid', t => {
  process.env.TRAVIS = 'true';
  t.notThrows(() => validate('GH_TOKEN'));
});
