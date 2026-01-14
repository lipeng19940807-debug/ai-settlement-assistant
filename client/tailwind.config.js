/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                "primary": "#197fe6",
                "primary-hover": "#166CC4",
                "background-light": "#f6f7f8",
                "background-dark": "#111921",
                "surface-light": "#ffffff",
                "surface-dark": "#1d2630",
                "border-light": "#e2e8f0",
                "border-dark": "#334155",
            },
            fontFamily: {
                "display": ["Inter", "Noto Sans SC", "sans-serif"],
                "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out forwards',
                'slide-in': 'slideIn 0.3s ease-out forwards',
                'shimmer': 'shimmer 2s infinite linear',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'scale(0.98) translateY(10px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateX(100%)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                }
            }
        },
    },
    plugins: [],
}
