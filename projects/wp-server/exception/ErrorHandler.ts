import { Response } from 'express';
import { WpError, WpHttpCode } from './WpError';

class ErrorHandler {
  private isTrustedError(error: Error): boolean {
    if (error instanceof WpError) {
      return error.isOperational;
    }

    return false;
  }
  private handleTrustedError(error: WpError, response: Response): void {
    response.status(error.httpCode).json({ message: error.message });
  }

  private handleCriticalError(error: Error | WpError, response?: Response): void {
    if (response) {
      response
        .status(WpHttpCode.INTERNAL_SERVER_ERROR)
        .json({ message: 'Internal server error' });
    }

    console.log('Application encountered a critical error. Exiting');
    process.exit(1);
  }

  public handleError(error: Error | WpError, response?: Response): void {
    if (this.isTrustedError(error) && response) {
      this.handleTrustedError(error as WpError, response);
    } else {
      this.handleCriticalError(error, response);
    }
  }
}

export const errorHandler = new ErrorHandler();