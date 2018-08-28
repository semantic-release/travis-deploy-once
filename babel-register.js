/* eslint-disable import/no-unassigned-import */
require('@babel/register')({
  only: ['lib', 'cli.js', 'node_modules/got', 'node_modules/cacheable-request'],
  presets: [['@babel/preset-env', {targets: {node: 'current'}, useBuiltIns: 'entry'}]],
});
require('@babel/polyfill');
