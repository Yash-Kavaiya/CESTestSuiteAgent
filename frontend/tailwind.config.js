/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Google Blue - Primary brand color
                primary: {
                    50: '#E8F0FE',
                    100: '#D2E3FC',
                    200: '#AECBFA',
                    300: '#8AB4F8',
                    400: '#669DF6',
                    500: '#4285F4', // Google Blue
                    600: '#1A73E8',
                    700: '#1967D2',
                    800: '#185ABC',
                    900: '#174EA6',
                    950: '#0D47A1',
                },
                // Google Green - Success states
                success: {
                    50: '#E6F4EA',
                    100: '#CEEAD6',
                    200: '#A8DAB5',
                    300: '#81C995',
                    400: '#5BB974',
                    500: '#34A853', // Google Green
                    600: '#1E8E3E',
                    700: '#188038',
                    800: '#137333',
                    900: '#0D652D',
                },
                // Google Red - Error/Danger states
                danger: {
                    50: '#FCE8E6',
                    100: '#FAD2CF',
                    200: '#F6AEA9',
                    300: '#F28B82',
                    400: '#EE675C',
                    500: '#EA4335', // Google Red
                    600: '#D93025',
                    700: '#C5221F',
                    800: '#B31412',
                    900: '#A50E0E',
                },
                // Google Yellow - Warning states
                warning: {
                    50: '#FEF7E0',
                    100: '#FEEFC3',
                    200: '#FDE293',
                    300: '#FDD663',
                    400: '#FBCB43',
                    500: '#FBBC04', // Google Yellow
                    600: '#F9AB00',
                    700: '#F29900',
                    800: '#EA8600',
                    900: '#E37400',
                },
                // Google Gray Scale - Light theme optimized
                dark: {
                    50: '#202124',  // Google Dark Gray (text)
                    100: '#3C4043', // Dark gray
                    200: '#5F6368', // Google Medium Gray
                    300: '#80868B', // Gray
                    400: '#9AA0A6', // Light gray text
                    500: '#BDC1C6', // Lighter gray
                    600: '#DADCE0', // Border gray
                    700: '#E8EAED', // Light border
                    800: '#F1F3F4', // Background gray
                    900: '#F8F9FA', // Light background
                    950: '#FFFFFF', // White
                },
            },
            fontFamily: {
                sans: ['Google Sans', 'Roboto', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['Roboto Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
            },
            boxShadow: {
                'soft': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
                'glow': '0 0 20px rgba(66, 133, 244, 0.3)',
                'google': '0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)',
                'google-lg': '0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 8px 16px 4px rgba(60, 64, 67, 0.15)',
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
            borderRadius: {
                'google': '8px',
                'google-lg': '16px',
                'google-xl': '24px',
            },
        },
    },
    plugins: [],
};
