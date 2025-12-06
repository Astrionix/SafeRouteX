/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eef9ff', 100: '#d9f1ff', 200: '#bce8ff', 300: '#8edbff',
                    400: '#59c4ff', 500: '#33a7ff', 600: '#1b88f5', 700: '#1470e1',
                    800: '#175ab6', 900: '#194d8f', 950: '#142f57',
                },
                danger: {
                    50: '#fff1f1', 100: '#ffe1e1', 200: '#ffc7c7', 300: '#ffa0a0',
                    400: '#ff6b6b', 500: '#f83b3b', 600: '#e51d1d', 700: '#c11414',
                    800: '#a01414', 900: '#841818', 950: '#480707',
                },
                safe: {
                    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
                    400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
                    800: '#166534', 900: '#14532d', 950: '#052e16',
                },
                dark: { 100: '#1e293b', 200: '#0f172a', 300: '#020617' }
            },
            fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
        },
    },
    plugins: [],
};
