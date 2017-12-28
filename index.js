#!/usr/bin/env node
/* eslint-disable import/no-unassigned-import */
require('babel-register')({only: 'travis-deploy-once/lib'});
require('babel-polyfill');

module.exports = require('./lib/travis-deploy-once');
