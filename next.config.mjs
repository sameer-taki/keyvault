// Build a Content-Security-Policy that allows exactly Clerk + Supabase and nothing
// else. Hosts are derived from env where possible, with safe wildcard fallbacks.
function buildCsp() {
  const clerkDomain = process.env.CLERK_DOMAIN;
  const clerk = [
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    ...(clerkDomain ? [`https://${clerkDomain}`] : []),
  ].join(" ");

  let supabaseHost = "*.supabase.co";
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
    }
  } catch {
    // keep the wildcard fallback
  }

  return [
    "default-src 'self'",
    // 'unsafe-inline' is required for Next.js/Tailwind inline bits. Tightening to
    // nonces is tracked in docs/SECURITY.md.
    `script-src 'self' 'unsafe-inline' ${clerk} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://img.clerk.com ${clerk}`,
    "font-src 'self' data:",
    `connect-src 'self' ${clerk} https://${supabaseHost} wss://${supabaseHost}`,
    "worker-src 'self' blob:",
    `frame-src 'self' ${clerk} https://challenges.cloudflare.com`,
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp() },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
