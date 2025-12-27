/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['mapbox-gl'],
    output: 'export', // Required for Capacitor

    // Fix for undici private class fields
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
            };
        }

        // Exclude undici from client bundle
        config.externals = config.externals || [];
        if (!isServer) {
            config.externals.push('undici');
        }

        return config;
    },

    images: {
        unoptimized: true, // Required for static export
        domains: ['firebasestorage.googleapis.com'],
    },
};

module.exports = nextConfig;
