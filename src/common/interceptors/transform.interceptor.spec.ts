import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

const makeContext = (statusCode = 200) =>
  ({
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
  }) as any;

const makeHandler = (data: any) => ({ handle: () => of(data) }) as any;

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('wraps data in success envelope', (done) => {
    interceptor.intercept(makeContext(200), makeHandler({ id: 1 })).subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
      done();
    });
  });

  it('includes statusCode from response', (done) => {
    interceptor.intercept(makeContext(201), makeHandler({})).subscribe((result) => {
      expect(result.statusCode).toBe(201);
      done();
    });
  });

  it('timestamp is an ISO date string', (done) => {
    interceptor.intercept(makeContext(200), makeHandler(null)).subscribe((result) => {
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      done();
    });
  });
});
