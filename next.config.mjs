/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase Storage CDN tự handle optimization, Next.js không cần optimize
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rywbprwxjwezbrhoodzb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  /**
   * Tắt persistent webpack cache ở dev — giảm lỗi "Cannot find module './NNN.js'" khi chunk đổi
   * sau Fast Refresh / đổi nhánh (cache .next / webpack lệch).
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;

