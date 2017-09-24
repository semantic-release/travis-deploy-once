import test from 'ava';
import {AbortError} from 'p-retry';
import verifyJobsState from '../lib/verify-jobs-state';

test('Return empty array if each job is either passed or allow failure', t => {
  const jobs = [
    {number: '1.1', state: 'passed'},
    {number: '1.2', state: 'passed'},
    {number: '1.3', state: 'errored', allow_failure: true},
  ];
  t.deepEqual(verifyJobsState(jobs), []);
});

test('Return jobs in created or passed state', t => {
  const jobs = [
    {number: '1.1', state: 'created'},
    {number: '1.2', state: 'passed'},
    {number: '1.3', state: 'started'},
    {number: '1.4', state: 'errored', allow_failure: true},
  ];
  t.deepEqual(verifyJobsState(jobs), ['1.1', '1.3']);
});

test('Return jobs in unknown state', t => {
  const jobs = [
    {number: '1.1', state: 'created'},
    {number: '1.2', state: 'passed'},
    {number: '1.3', state: 'invalid'},
    {number: '1.4', state: 'errored', allow_failure: true},
  ];
  t.deepEqual(verifyJobsState(jobs), ['1.1', '1.3']);
});

test('Throw an AbortError if at least one job is in errored and does not allow failure', t => {
  const jobs = [
    {number: '1.1', state: 'passed'},
    {number: '1.2', state: 'errored'},
    {number: '1.3', state: 'errored', allow_failure: true},
  ];
  t.throws(() => verifyJobsState(jobs), AbortError);
});

test('Throw an AbortError if at least one job is in failed and does not allow failure', t => {
  const jobs = [
    {number: '1.1', state: 'passed'},
    {number: '1.2', state: 'failed', allow_failure: true},
    {number: '1.3', state: 'failed'},
  ];
  t.throws(() => verifyJobsState(jobs), AbortError);
});
