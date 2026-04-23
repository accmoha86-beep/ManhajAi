import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Cairo font family (Arabic)
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        sans: ['Cairo', 'sans-serif'],
      },

      // Theme colors using CSS variables (--theme-* from globals.css)
      colors: {
        primary: {
          DEFAULT: 'var(--theme-primary)',
          light: 'var(--theme-primary-light)',
          dark: 'var(--theme-primary-dark)',
        },
        secondary: {
          DEFAULT: 'var(--theme-secondary)',
          light: 'var(--theme-secondary-light)',
          dark: 'var(--theme-secondary-dark)',
        },
        surface: {
          DEFAULT: 'var(--theme-surface-bg)',
          border: 'var(--theme-surface-border)',
        },
        page: 'var(--theme-page-bg)',
        muted: 'var(--theme-text-muted)',
        foreground: {
          DEFAULT: 'var(--theme-text-primary)',
          secondary: 'var(--theme-text-secondary)',
        },
        border: 'var(--theme-border)',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
      },

      // Background images for gradients
      backgroundImage: {
        'gradient-primary': 'var(--theme-cta-gradient)',
        'gradient-hero': 'var(--theme-hero-gradient)',
      },

      // RTL-friendly border radius
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      // Custom shadows
      boxShadow: {
        card: 'var(--theme-card-shadow, 0 2px 8px rgba(0, 0, 0, 0.08))',
        'card-hover': 'var(--theme-card-hover-shadow, 0 4px 16px rgba(0, 0, 0, 0.12))',
        dropdown: '0 4px 24px rgba(0, 0, 0, 0.12)',
        modal: '0 8px 32px rgba(0, 0, 0, 0.2)',
      },

      // Animations
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bounce: 'bounce 1s infinite',
        shimmer: 'shimmer 2s infinite',
        'progress-bar': 'progressBar 1.5s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
        'count-up': 'countUp 1s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        progressBar: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      // Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // Transitions
      transitionDuration: {
        '400': '400ms',
      },

      // Screen breakpoints
      screens: {
        xs: '475px',
      },
    },
  },
  plugins: [
    // RTL plugin support via dir attribute
    function ({ addVariant }: { addVariant: (name: string, selector: string) => void }) {
      addVariant('rtl', '[dir="rtl"] &');
      addVariant('ltr', '[dir="ltr"] &');
    },
  ],
};

export default config;
