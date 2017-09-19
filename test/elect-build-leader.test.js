const test = require('ava');
const electBuildLeader = require('../elect-build-leader');

test('Find highest node version with one version', t => {
  t.is(electBuildLeader('1'), 1, 'no matrix')
});

test('Find highest node version with integer version', t => {
  t.is(electBuildLeader([3, '2', 1]), 1)
});

test('Select "latest stable" as highest node version', t => {
  t.is(electBuildLeader(['8', '4', '1', 'node', '0.1', 'lts', 'argon', '0.10', '8.4', '4.0.1']), 4)
});

test.only('Find highest node version with version range', t => {
  t.is(electBuildLeader(['8', '4', '1', '>=3', '0.1', 'lts', 'argon', '0.10', '>8.4', '4.0.1']), 9)
});
