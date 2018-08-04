#!/usr/bin/env node
/* eslint-disable import/no-unassigned-import */
require('babel-register')({only: /travis-deploy-once\/lib|travis-deploy-once\/node_modules\/(got|cacheable-request)/});
require('babel-polyfill');

module.exports = require('./lib/travis-deploy-once');
