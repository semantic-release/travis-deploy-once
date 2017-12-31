const execa = require('execa');
const updateNotifier = require('update-notifier');
const pkg = require('./package.json');

// Set `updateCheckInterval` to 0 to always notify users, otherwise the notification would never be triggered when running on Travis
updateNotifier({pkg, updateCheckInterval: 0}).notify();

module.exports = async () => {
  const cli = require('yargs')
    .command('$0 [script]', 'Run a deployment script only once in the Travis test matrix', yargs => {
      yargs
        .positional('script', {describe: 'The script to run once', type: 'string'})
        .demandCommand(0, 0, '', 'Only one script argument is allowed')
        .example('travis-deploy-once --buildLeaderId 1 "deploy-script --script-arg script-arg-value"');
    })
    .alias('h', 'help')
    .alias('v', 'version')
    .option('t', {
      alias: 'github-token',
      describe: 'GitHub OAuth token',
      type: 'string',
    })
    .option('b', {
      alias: 'build-leader-id',
      describe: 'Define which Travis job will run the script',
      type: 'number',
    })
    .option('p', {
      alias: 'pro',
      describe: 'Use Travis Pro',
      type: 'boolean',
    })
    .option('u', {
      alias: 'travis-url',
      describe: 'Travis Enterprise API endpoint URL',
      type: 'string',
    })
    .exitProcess(false);

  try {
    const {script, buildLeaderId, githubToken, travisUrl: enterprise, pro, help, version} = cli.argv;
    if (Boolean(help) || Boolean(version)) {
      process.exitCode = 0;
      return;
    }
    if (
      (await require('./lib/travis-deploy-once')({travisOpts: {pro, enterprise}, buildLeaderId, githubToken})) === true
    ) {
      if (script) {
        const shell = execa.shell(script, {reject: false});
        shell.stdout.pipe(process.stdout);
        shell.stderr.pipe(process.stderr);
        process.exitCode = (await shell).code;
      } else {
        process.exitCode = 0;
      }
    } else if (!script) {
      process.exitCode = 1;
    }
  } catch (err) {
    if (err.name !== 'YError') {
      console.error(err);
    }
    process.exitCode = 1;
  }
};
