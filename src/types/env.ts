// Make this file a module by adding an export
export {};

// Extend the Env interface from worker-configuration.d.ts
declare global {
  interface Env {
    // Add any additional properties not defined in worker-configuration.d.ts
    REFRESH_TOKEN_SECRET: string;
    BUCKET: R2Bucket;
  }
} 