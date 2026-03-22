import { Type } from '@nestjs/common';
import { getSchemaPath, ApiResponseOptions } from '@nestjs/swagger';

// ─── Success ──────────────────────────────────────────────────────────────────

/**
 * Generates @ApiResponse for successful responses wrapped by TransformInterceptor.
 * Matches shape: { success: true, statusCode, data: T, timestamp }
 *
 * @param dto - The DTO class for the `data` field (e.g., AuthResponseDto)
 * @param statusCode - HTTP status code (default: 200)
 * @param array - If true, `data` is an array of DTOs
 *
 * @example
 * @ApiResponse(ApiSuccessResponse(AuthResponseDto, 201))
 * @ApiResponse(ApiSuccessResponse(UserPublicDto))
 * @ApiResponse(ApiSuccessResponse(ProductDto, 200, true)) // array response
 */
export function ApiSuccessResponse(
  dto: Type<any> | string,
  statusCode = 200,
  array = false,
): ApiResponseOptions {
  const dtoName = typeof dto === 'string' ? dto : dto.name;
  const dataSchema = array
    ? { type: 'array', items: { $ref: getSchemaPath(dtoName) } }
    : { $ref: getSchemaPath(dtoName) };

  return {
    status: statusCode,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        statusCode: { type: 'number', example: statusCode },
        data: dataSchema,
        timestamp: { type: 'string', example: '2026-03-22T00:00:00.000Z' },
      },
      required: ['success', 'statusCode', 'data', 'timestamp'],
    },
  };
}

// ─── Errors ───────────────────────────────────────────────────────────────────

/**
 * Generates @ApiResponse for error responses from HttpExceptionFilter.
 * Matches shape: { success: false, statusCode, message, path, timestamp }
 *
 * @param statusCode - HTTP status code (e.g., 400, 401, 404, 409)
 * @param message - Error message to display in Swagger
 *
 * @example
 * @ApiResponse(ApiErrorResponse(401, 'Invalid email or password'))
 * @ApiResponse(ApiErrorResponse(409, 'Email already registered'))
 */
export function ApiErrorResponse(
  statusCode: number,
  message: string,
): ApiResponseOptions {
  return {
    status: statusCode,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        statusCode: { type: 'number', example: statusCode },
        message: { type: 'string', example: message },
        path: { type: 'string', example: '/api/auth/login' },
        timestamp: { type: 'string', example: '2026-03-22T00:00:00.000Z' },
      },
      required: ['success', 'statusCode', 'message', 'path', 'timestamp'],
    },
  };
}
