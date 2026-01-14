import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // ✅ keep all your existing config here
  // images: {...},
  // experimental: {...},
  // redirects: async () => [...],
};

const withNextIntl = createNextIntlPlugin();

// ✅ wrap it, don’t replace it
export default withNextIntl(nextConfig);
