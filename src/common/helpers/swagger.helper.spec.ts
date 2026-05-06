import { ApiSuccessResponse, ApiErrorResponse } from './swagger.helper';

class SomeDto {}

describe('ApiSuccessResponse', () => {
  it('defaults to status 200', () => {
    const result = ApiSuccessResponse(SomeDto);
    expect(result.status).toBe(200);
  });

  it('uses the DTO name in $ref', () => {
    const result = ApiSuccessResponse(SomeDto);
    const schema = (result as any).schema;
    expect(schema.properties.data.$ref).toContain('SomeDto');
  });

  it('wraps data as array when array=true', () => {
    const result = ApiSuccessResponse(SomeDto, 200, true);
    const schema = (result as any).schema;
    expect(schema.properties.data.type).toBe('array');
    expect(schema.properties.data.items.$ref).toContain('SomeDto');
  });

  it('respects custom status code', () => {
    const result = ApiSuccessResponse(SomeDto, 201);
    expect(result.status).toBe(201);
  });

  it('accepts a string DTO name', () => {
    const result = ApiSuccessResponse('MyDto');
    const schema = (result as any).schema;
    expect(schema.properties.data.$ref).toContain('MyDto');
  });
});

describe('ApiErrorResponse', () => {
  it('sets success example to false', () => {
    const result = ApiErrorResponse(400, 'bad input');
    const schema = (result as any).schema;
    expect(schema.properties.success.example).toBe(false);
  });

  it('sets statusCode and message examples', () => {
    const result = ApiErrorResponse(404, 'not found');
    const schema = (result as any).schema;
    expect(schema.properties.statusCode.example).toBe(404);
    expect(schema.properties.message.example).toBe('not found');
  });

  it('sets the response status', () => {
    const result = ApiErrorResponse(401, 'unauthorized');
    expect(result.status).toBe(401);
  });
});
