import { HttpException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const makeHost = (url = '/test') => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
    json,
    status,
  } as any;
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('uses a plain string message', () => {
    const host = makeHost();
    filter.catch(new HttpException('bad input', 400), host);
    expect(host.status).toHaveBeenCalledWith(400);
    const body = host.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.message).toBe('bad input');
    expect(body.success).toBe(false);
  });

  it('joins array messages with a comma', () => {
    const host = makeHost();
    filter.catch(new HttpException({ message: ['err1', 'err2'] }, 422), host);
    const body = host.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.message).toBe('err1, err2');
  });

  it('uses object message field', () => {
    const host = makeHost();
    filter.catch(new HttpException({ message: 'conflict' }, 409), host);
    const body = host.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.message).toBe('conflict');
  });

  it('includes path and statusCode in response', () => {
    const host = makeHost('/api/auth/login');
    filter.catch(new HttpException('unauthorized', 401), host);
    const body = host.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.statusCode).toBe(401);
    expect(body.path).toBe('/api/auth/login');
    expect(body.timestamp).toBeDefined();
  });
});
