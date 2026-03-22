declare module 'passport-microsoft' {

  // passport-microsoft doesn't have @types, so we need to create our own types for the strategy
  import { Strategy as OAuth2Strategy } from 'passport-oauth2';

  interface Profile {
    id: string;
    displayName: string;
    emails?: { value: string }[];
    photos?: { value: string }[];
    _json: {
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };
  }

  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    tenant?: string;
  }

  class Strategy extends OAuth2Strategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (err: any, user?: any) => void,
      ) => void,
    );
  }
}