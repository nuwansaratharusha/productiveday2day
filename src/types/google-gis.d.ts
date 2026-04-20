// Minimal type declarations for Google Identity Services (GIS) token model.
// Loaded dynamically; full typings available via @types/google.accounts.oauth2.

interface GISTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GISTokenClientConfig {
  client_id: string;
  scope: string;
  callback: ((resp: GISTokenResponse) => void) | string;
  error_callback?: (err: { type: string }) => void;
}

interface GISTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
  callback: (resp: GISTokenResponse) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: GISTokenClientConfig): GISTokenClient;
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

export {};
