import test from 'ava';
import {stub} from 'sinon';
import getLogger from '../lib/get-logger';
import electBuildLeader from '../lib/elect-build-leader';

test.beforeEach(t => {
  t.context.logger = getLogger();
  t.context.log = stub(t.context.logger, 'log');
});

test('Find highest node version with one version', t => {
  t.is(electBuildLeader('1', t.context.logger), 1, 'no matrix');
  t.is(t.context.log.callCount, 2);
  t.is(t.context.log.args[1][0], 'Electing job (1) as build leader.');
});

test('Find highest node version with integer version', t => {
  t.is(electBuildLeader([3, '2', 1], t.context.logger), 1);
  t.is(t.context.log.callCount, 2);
  t.is(t.context.log.args[1][0], 'Electing job (1) as build leader as it runs the highest node version (3).');
});

test('Select "latest stable" as highest node version', t => {
  t.is(electBuildLeader(['8', '4', '1', 'iojs', 'lts/*', 'node', '0.1', 'argon', '0.10', '8.4'], t.context.logger), 6);
  t.is(t.context.log.callCount, 2);
  t.is(t.context.log.args[1][0], 'Electing job (6) as build leader as it runs on the latest node stable version.');
});

test('Select "latest lts" as highest node version', t => {
  t.is(electBuildLeader(['8', '4', '1', 'lts/*', '0.1', 'argon', '0.10', '8.4'], t.context.logger), 4);
  t.is(t.context.log.callCount, 2);
  t.is(t.context.log.args[1][0], 'Electing job (4) as build leader as it runs on the node lts version.');
});

test('Find highest node version with version range', t => {
  t.is(electBuildLeader(['8', '4', '1', '>=3', '0.1', 'lts', 'argon', '0.10', '>8.4', '4.0.1'], t.context.logger), 9);
  t.is(t.context.log.callCount, 2);
  t.is(t.context.log.args[1][0], 'Electing job (9) as build leader as it runs the highest node version (>8.4).');
});

test('Select the last occurence of the highest version', t => {
  t.is(electBuildLeader([7, '8.0.0', 8, '8.x.x', '8.0.0', 7], t.context.logger), 5);
  t.true(t.context.log.calledTwice);
  t.is(t.context.log.args[1][0], 'Electing job (5) as build leader as it runs the highest node version (8.0.0).');
});

test('Select the last occurence of the "latest stable"', t => {
  t.is(electBuildLeader(['node', '8', '9', 'node', 'node'], t.context.logger), 5);
  t.true(t.context.log.calledTwice);
  t.is(t.context.log.args[1][0], 'Electing job (5) as build leader as it runs on the latest node stable version.');
});
