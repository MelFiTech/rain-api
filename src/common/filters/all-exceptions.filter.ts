import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Response } from 'express';

interface ErrorBody {
  error: string;
  code?: string;
  request_id: string;
  field_errors?: Record<string, string>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ requestId?: string }>();
    const requestId = request.requestId ?? randomUUID();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'field_errors' in payload
      ) {
        const body = payload as {
          message?: string;
          field_errors: Record<string, string>;
        };
        const errorBody: ErrorBody = {
          error: body.message ?? 'Validation failed.',
          request_id: requestId,
          field_errors: body.field_errors,
        };
        response.status(status).json(errorBody);
        return;
      }

      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            'Request failed.');

      const errorBody: ErrorBody = {
        error: Array.isArray(message) ? message.join(', ') : message,
        request_id: requestId,
        code:
          typeof payload === 'object' && payload !== null && 'code' in payload
            ? String((payload as { code: string }).code)
            : undefined,
      };
      response.status(status).json(errorBody);
      return;
    }

    const errorBody: ErrorBody = {
      error: 'Unexpected error.',
      code: 'internal_error',
      request_id: requestId,
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorBody);
  }
}
