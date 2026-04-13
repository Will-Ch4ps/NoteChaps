/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        app: '#1a1a1a',
        titlebar: '#2d2d2d',
        tabbar: '#252525',
        toolbar: '#2a2a2a',
        sidebar: '#252525',
        accent: '#4a9eff',
        'accent-green': '#30d158',
        border: '#333',
      },
      fontFamily: {
        ui: ['-apple-system', 'SF Pro Display', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      }
    }
  },
  plugins: []
}
