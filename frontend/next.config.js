/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['mapbox-gl'],

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
        domains: ['firebasestorage.googleapis.com'],
    },

    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
