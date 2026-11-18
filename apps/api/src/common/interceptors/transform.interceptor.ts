import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@bizflow/shared-types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((resData) => {
        // Handle responses that already contain meta (e.g. pagination)
        if (resData && typeof resData === 'object' && 'data' in resData && 'meta' in resData) {
          return {
            success: true,
            statusCode,
            data: resData.data,
            meta: {
              timestamp: new Date().toISOString(),
              ...resData.meta,
            },
          };
        }

        return {
          success: true,
          statusCode,
          data: resData,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      })
    );
  }
}
