const test = require('ava')

const electBuildLeader = require('../elect-build-leader')

test('find highest node version in build matrix', t => {
  t.is(electBuildLeader('1'), 1, 'no matrix')

  t.is(electBuildLeader([
    '8',
    '4',
    '1',
    'node',
    '0.1',
    'lts',
    'argon',
    '0.10',
    '8.4',
    '4.0.1'
  ]), 4, 'latest stable')

  t.is(electBuildLeader([
    '8',
    '4',
    '1',
    '>=3',
    '0.1',
    'lts',
    'argon',
    '0.10',
    '8.4',
    '4.0.1'
  ]), 9, 'version range')
})
