// testReporter.ts — Custom Jest reporter for EnglishMitraAI CI

export interface TestSuiteResult {
  suiteName: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface TestReportSummary {
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  suites: TestSuiteResult[];
  timestamp: string;
  success: boolean;
}

export class TestReporter {
  passed = 0;
  failed = 0;
  skipped = 0;
  private duration = 0;
  private suites: TestSuiteResult[] = [];

  /**
   * Called by Jest for each test suite result.
   * Signature matches the Jest Reporter interface.
   */
  onTestResult(
    _test: { path: string },
    testResult: {
      testFilePath: string;
      testResults: Array<{
        status: 'passed' | 'failed' | 'pending' | 'todo';
        duration?: number;
      }>;
      perfStats: { end: number; start: number };
    }
  ): void {
    const suitePassed = testResult.testResults.filter((r) => r.status === 'passed').length;
    const suiteFailed = testResult.testResults.filter((r) => r.status === 'failed').length;
    const suiteSkipped = testResult.testResults.filter(
      (r) => r.status === 'pending' || r.status === 'todo'
    ).length;
    const suiteDuration = testResult.perfStats.end - testResult.perfStats.start;

    this.passed += suitePassed;
    this.failed += suiteFailed;
    this.skipped += suiteSkipped;
    this.duration += suiteDuration;

    this.suites.push({
      suiteName: testResult.testFilePath,
      passed: suitePassed,
      failed: suiteFailed,
      skipped: suiteSkipped,
      duration: suiteDuration,
    });
  }

  /**
   * Called by Jest after the entire test run completes.
   * Signature matches the Jest Reporter interface.
   */
  onRunComplete(
    _contexts: Set<unknown>,
    results: {
      numPassedTests: number;
      numFailedTests: number;
      numPendingTests: number;
      startTime: number;
    }
  ): void {
    // Use Jest's aggregated counts as the authoritative source
    this.passed = results.numPassedTests;
    this.failed = results.numFailedTests;
    this.skipped = results.numPendingTests;
    this.duration = Date.now() - results.startTime;

    this.printSummary();
  }

  /**
   * Returns the report as a JSON-serialisable object.
   */
  generateReport(): TestReportSummary {
    return {
      totalPassed: this.passed,
      totalFailed: this.failed,
      totalSkipped: this.skipped,
      totalDuration: this.duration,
      suites: this.suites,
      timestamp: new Date().toISOString(),
      success: this.failed === 0,
    };
  }

  /**
   * Prints a human-readable summary to stdout for CI logs.
   */
  printSummary(): void {
    const total = this.passed + this.failed + this.skipped;
    const status = this.failed === 0 ? 'PASS' : 'FAIL';
    const durationSec = (this.duration / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log(`  EnglishMitraAI Test Summary — ${status}`);
    console.log('='.repeat(60));
    console.log(`  Total Tests : ${total}`);
    console.log(`  Passed      : ${this.passed}`);
    console.log(`  Failed      : ${this.failed}`);
    console.log(`  Skipped     : ${this.skipped}`);
    console.log(`  Duration    : ${durationSec}s`);
    console.log(`  Timestamp   : ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

    if (this.failed > 0) {
      console.log('  Failed suites:');
      this.suites
        .filter((s) => s.failed > 0)
        .forEach((s) => {
          console.log(`    - ${s.suiteName} (${s.failed} failed)`);
        });
      console.log('');
    }
  }
}

// ─── Standalone exports ───────────────────────────────────────────────────────

let _reporterInstance: TestReporter | null = null;

function getReporterInstance(): TestReporter {
  if (!_reporterInstance) {
    _reporterInstance = new TestReporter();
  }
  return _reporterInstance;
}

export function generateReport(): TestReportSummary {
  return getReporterInstance().generateReport();
}

export function printSummary(): void {
  getReporterInstance().printSummary();
}

export default TestReporter;
