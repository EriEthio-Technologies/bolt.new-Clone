export class Logger {
  constructor(
    private readonly stackdriverClient: StackdriverClient,
    private readonly errorReporting: ErrorReporting
  ) {}

  async logError(error: Error, context: LogContext) {
    await Promise.all([
      this.stackdriverClient.log(error, context),
      this.errorReporting.report(error)
    ]);
  }
} 