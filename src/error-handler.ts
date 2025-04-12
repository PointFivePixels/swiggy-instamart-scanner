import logger from './logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export const handleError = (error: Error | AppError): void => {
  if (error instanceof AppError && error.isOperational) {
    logger.warn({
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
    });
  } else {
    logger.error({
      message: error.message,
      stack: error.stack,
    });

    // In production, you might want to implement graceful shutdown or recovery
    if (process.env.NODE_ENV === 'production') {
      // Implement recovery strategy
      logger.info('Attempting recovery...');
    }
  }
};

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  handleError(error);
  // Give logger time to write
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  handleError(reason instanceof Error ? reason : new Error(String(reason)));
});
