import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';

export async function loader({ context }: LoaderFunctionArgs) {
  // For Cloudflare deployment (KV/DO bindings, env vars)
  const cloudflareEnv = context.cloudflare?.env || {};
  // For local development (process.env)
  const localEnv = process.env;

  const dbUrlCF = cloudflareEnv.DATABASE_URL;
  const dbUrlLocal = localEnv.DATABASE_URL;
  
  return json({ 
    message: "Health check OK",
    timestamp: new Date().toISOString(),
    dbUrlCF: dbUrlCF || "Not found in Cloudflare context",
    dbUrlLocal: dbUrlLocal || "Not found in process.env",
    // Pick the one that is expected to work in your current dev setup
    effectiveDbUrl: dbUrlCF || dbUrlLocal 
  });
}
