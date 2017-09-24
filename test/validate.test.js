import test from 'ava';
import validate from '../lib/validate';

test('Throw error if does not run on Travis', t => {
  t.throws(
    () => validate({TRAVIS: undefined, GH_TOKEN: 'GH_TOKEN', TRAVIS_TEST_RESULT: undefined}),
    Error,
    'Not running on Travis'
  );
});

test('Throw error if GitHub authentication missing', t => {
  t.throws(
    () => validate({TRAVIS: 'true', GH_TOKEN: undefined, TRAVIS_TEST_RESULT: undefined}),
    Error,
    'GitHub authentication missing'
  );
});

test('Throw error if not running in Travis after_success step', t => {
  t.throws(
    () => validate({TRAVIS: 'true', GH_TOKEN: 'GH_TOKEN', TRAVIS_TEST_RESULT: undefined}),
    'Not running in Travis after_success step'
  );
  t.throws(
    () => validate({TRAVIS: 'true', GH_TOKEN: 'GH_TOKEN', TRAVIS_TEST_RESULT: null}),
    'Not running in Travis after_success step'
  );
  t.throws(
    () => validate({TRAVIS: 'true', GH_TOKEN: 'GH_TOKEN', TRAVIS_TEST_RESULT: false}),
    'Not running in Travis after_success step'
  );
  t.throws(() => validate({TRAVIS: 'true', GH_TOKEN: 'GH_TOKEN'}), 'Not running in Travis after_success step');
});

test('Does not throw error if environment is valid', t => {
  t.notThrows(() => validate({TRAVIS: 'true', GH_TOKEN: 'GH_TOKEN', TRAVIS_TEST_RESULT: '1'}));
  t.notThrows(() => validate({TRAVIS: 'true', GH_TOKEN: 'GH_TOKEN', TRAVIS_TEST_RESULT: 0}));
  t.notThrows(() => validate({TRAVIS: 'true', GH_TOKEN: 'GH_TOKEN', TRAVIS_TEST_RESULT: 1}));
});
