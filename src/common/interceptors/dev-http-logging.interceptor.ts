import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

const SENSITIVE_KEY =
  /password|secret|token|authorization|apikey|api_key|signingsecret|fullkey|currentpassword|newpassword|confirmpassword/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[nested]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitize(val, depth + 1);
    }
    return out;
  }
  return value;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(sanitize(value), null, 2);
  } catch {
    return '[unserializable]';
  }
}

function truncate(text: string, max = 4_000): string {
  return text.length > max ? `${text.slice(0, max)}\n… (truncated)` : text;
}

function logHttpBlock(title: string, fields: Record<string, unknown>) {
  const lines = [`┌─ ${title}`];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'object') {
      lines.push(`│ ${key}:`);
      for (const line of truncate(prettyJson(value)).split('\n')) {
        lines.push(`│   ${line}`);
      }
    } else {
      lines.push(`│ ${key}: ${value}`);
    }
  }
  lines.push('└─');
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

@Injectable()
export class DevHttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (process.env.NODE_ENV === 'production') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & { requestId?: string; body?: unknown }
    >();
    const response = http.getResponse<Response>();
    const started = Date.now();

    const method = request.method;
    const path = request.originalUrl ?? request.url;
    const requestId = request.requestId ?? '—';

    const auth = request.header('authorization');
    const authHint = auth?.startsWith('Bearer ')
      ? `${auth.slice(7, 15)}…`
      : auth
        ? '[redacted]'
        : undefined;

    const hasQuery = Object.keys(request.query ?? {}).length > 0;
    const hasBody =
      request.body &&
      typeof request.body === 'object' &&
      Object.keys(request.body as object).length > 0;

    logHttpBlock('HTTP REQUEST', {
      method,
      path,
      requestId,
      ...(authHint ? { auth: authHint } : {}),
      ...(hasQuery ? { query: request.query } : {}),
      ...(hasBody ? { body: request.body } : {}),
    });

    return next.handle().pipe(
      tap((responseBody) => {
        const ms = Date.now() - started;
        logHttpBlock('HTTP RESPONSE', {
          method,
          path,
          requestId,
          status: response.statusCode,
          durationMs: ms,
          ...(responseBody !== undefined ? { body: responseBody } : {}),
        });
      }),
      catchError((error: unknown) => {
        const ms = Date.now() - started;
        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status: number }).status === 'number'
            ? (error as { status: number }).status
            : 500;
        const message =
          error instanceof Error ? error.message : String(error);
        logHttpBlock('HTTP ERROR', {
          method,
          path,
          requestId,
          status,
          durationMs: ms,
          error: message,
        });
        return throwError(() => error);
      }),
    );
  }
}
