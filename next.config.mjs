/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ["bufferutil", "utf-8-validate", "ws"],
    },
};

export default nextConfig;
