#!/usr/bin/env node
import { program } from 'commander';
import { testRunner } from './test-runner';

program
  .option('-w, --watch', 'Run tests in watch mode')
  .option('-u, --update-snapshots', 'Update snapshots')
  .option('--no-coverage', 'Disable coverage reporting')
  .option('--testMatch <patterns...>', 'Test file patterns to run')
  .parse(process.argv);

const options = program.opts();

testRunner
  .run({
    watch: options.watch,
    coverage: options.coverage,
    updateSnapshots: options.updateSnapshots,
    testMatch: options.testMatch
  })
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('Test run failed:', error);
    process.exit(1);
  }); 