/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9', // Deep violet/purple
                    800: '#5b21b6',
                    900: '#4c1d95',
                    950: '#2e1065',
                },
                success: {
                    50: '#f0fdf4',
                    500: '#22c55e',
                    600: '#16a34a',
                },
                danger: {
                    50: '#fef2f2',
                    500: '#ef4444',
                    600: '#dc2626',
                },
                warning: {
                    50: '#fffbeb',
                    500: '#f59e0b',
                    600: '#d97706',
                },
                dark: {
                    50: '#0f172a',  // Was 900
                    100: '#1e293b', // Was 800
                    200: '#334155', // Was 700
                    300: '#475569', // Was 600
                    400: '#64748b', // Was 500
                    500: '#94a3b8', // Was 400
                    600: '#cbd5e1', // Was 300
                    700: '#e2e8f0', // Was 200
                    800: '#f1f5f9', // Was 100
                    900: '#f8fafc', // Was 50
                    950: '#ffffff', // Was 950 (White)
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
