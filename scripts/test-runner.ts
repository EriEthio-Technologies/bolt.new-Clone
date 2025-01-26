import { spawn } from 'child_process';
import { resolve } from 'path';
import { Container } from 'typedi';
import { DebugService } from '../app/lib/services/debug/DebugService';

interface TestConfig {
  testMatch: string[];
  coverage: boolean;
  watch: boolean;
  updateSnapshots: boolean;
  ci: boolean;
}

class TestRunner {
  private debug: DebugService;

  constructor() {
    this.debug = Container.get(DebugService);
  }

  async run(config: Partial<TestConfig> = {}): Promise<number> {
    const defaultConfig: TestConfig = {
      testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      coverage: true,
      watch: false,
      updateSnapshots: false,
      ci: process.env.CI === 'true'
    };

    const finalConfig = { ...defaultConfig, ...config };
    const args = this.buildArgs(finalConfig);

    this.debug.log('info', 'TestRunner', 'Starting test run', { config: finalConfig });

    try {
      const exitCode = await this.runVitest(args);
      this.debug.log('info', 'TestRunner', 'Test run completed', { exitCode });
      return exitCode;
    } catch (error) {
      this.debug.log('error', 'TestRunner', 'Test run failed', { error });
      return 1;
    }
  }

  private buildArgs(config: TestConfig): string[] {
    const args = ['vitest', 'run'];

    if (config.testMatch.length > 0) {
      args.push('--testMatch', ...config.testMatch);
    }

    if (config.coverage) {
      args.push('--coverage');
    }

    if (config.watch) {
      args.push('--watch');
    }

    if (config.updateSnapshots) {
      args.push('--update');
    }

    if (config.ci) {
      args.push('--reporter=junit', '--outputFile=test-results.xml');
    }

    return args;
  }

  private runVitest(args: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const vitest = spawn('npx', args, {
        stdio: 'inherit',
        shell: true
      });

      vitest.on('close', (code) => {
        if (code === 0 || code === null) {
          resolve(0);
        } else {
          reject(new Error(`Vitest exited with code ${code}`));
        }
      });

      vitest.on('error', (err) => {
        reject(err);
      });
    });
  }
}

export const testRunner = new TestRunner(); 