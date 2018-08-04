/* eslint-disable import/no-unassigned-import */
require('babel-register')({
  only: /travis-deploy-once\/(lib|cli.js)|travis-deploy-once\/node_modules\/(got|cacheable-request)/,
});
require('babel-polyfill');
