import { applyDecorators, Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class ApiResponseDto<TData> {
  @ApiProperty({ example: 200 })
  statusCode: number;

  data: TData | null;

  @ApiProperty({ type: [String], example: ['Success'] })
  message: string[];

  @ApiProperty({ example: '2026-05-26T12:00:00.000Z' })
  timestamp: string;
}

interface ApiWrappedResponseOptions<TModel extends Type<unknown>> {
  model: TModel;
  description?: string;
  isArray?: boolean;
  nullable?: boolean;
  status?: 'ok' | 'created';
}

export function ApiWrappedResponse<TModel extends Type<unknown>>(options: ApiWrappedResponseOptions<TModel>) {
  const dataSchema = options.isArray
    ? { type: 'array', items: { $ref: getSchemaPath(options.model) } }
    : { $ref: getSchemaPath(options.model) };

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, options.model),
    (options.status === 'created' ? ApiCreatedResponse : ApiOkResponse)({
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: options.nullable ? { oneOf: [dataSchema, { type: 'null' }] } : dataSchema
            }
          }
        ]
      }
    })
  );
}

export function ApiWrappedCursorResponse<TModel extends Type<unknown>>(model: TModel, description?: string) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: {
                type: 'object',
                required: ['items', 'nextCursor'],
                properties: {
                  items: { type: 'array', items: { $ref: getSchemaPath(model) } },
                  nextCursor: { type: 'string', nullable: true, example: null }
                }
              }
            }
          }
        ]
      }
    })
  );
}
