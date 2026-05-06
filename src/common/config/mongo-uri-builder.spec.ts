import { buildMongoUri } from './mongo-uri-builder';

describe('buildMongoUri', () => {
  it('builds a basic mongodb+srv URI', () => {
    const uri = buildMongoUri({
      username: 'user',
      password: 'pass',
      clusterUrl: 'cluster0.abc.mongodb.net/myDb',
      appDatabaseName: 'appDb',
    });
    expect(uri).toBe('mongodb+srv://user:pass@cluster0.abc.mongodb.net/appDb');
  });

  it('preserves query string when present', () => {
    const uri = buildMongoUri({
      username: 'user',
      password: 'pass',
      clusterUrl: 'cluster0.abc.mongodb.net/myDb?retryWrites=true',
      appDatabaseName: 'appDb',
    });
    expect(uri).toBe('mongodb+srv://user:pass@cluster0.abc.mongodb.net/appDb?retryWrites=true');
  });

  it('strips trailing path segment from clusterUrl', () => {
    const uri = buildMongoUri({
      username: 'u',
      password: 'p',
      clusterUrl: 'cluster0.abc.mongodb.net/ignored',
      appDatabaseName: 'real',
    });
    expect(uri).toContain('cluster0.abc.mongodb.net/real');
    expect(uri).not.toContain('/ignored');
  });
});
