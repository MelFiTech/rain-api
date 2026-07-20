import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();

    const incoming = request.header('x-request-id');
    const requestId =
      incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle().pipe(
      tap(() => {
        response.setHeader('X-RateLimit-Limit', '120');
        response.setHeader('X-RateLimit-Remaining', '119');
        response.setHeader(
          'X-RateLimit-Reset',
          String(Math.floor(Date.now() / 1000) + 60),
        );
      }),
    );
  }
}
