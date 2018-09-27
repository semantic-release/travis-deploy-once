/* eslint-disable import/no-unassigned-import */
require('@babel/register')({
  only: [/travis-deploy-once\/(lib|cli.js)/, /node_modules\/(got|cacheable-request)/],
  presets: [[require.resolve('@babel/preset-env'), {targets: {node: 'current'}, useBuiltIns: 'entry'}]],
});
require('@babel/polyfill');
