// Cloudflare Pages Functions Ambient Declarations
// Ensures zero diagnostic errors in IDE before or after wrangler / npm install

type PagesFunction<Env = unknown, Params = Record<string, string | string[]>, Data = unknown> = (context: {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
  env: Env;
  params: Params;
  data: Data;
}) => Response | Promise<Response>;

// Ambient node-like process declaration for optional fallbacks in local test environments
declare const process: {
  env: Record<string, string | undefined>;
} | undefined;
