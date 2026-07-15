/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      // Map Tailwind utilities onto the design tokens in src/styles/tokens.css
      // so the shell and future essays share one palette/type system.
      colors: {
        canvas: 'var(--canvas)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        gold: 'var(--gold)',
        gained: 'var(--gained)',
        sacrificed: 'var(--sacrificed)',
        line: 'var(--line)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      maxWidth: {
        prose: '68ch',
        shell: '1200px',
      },
    },
  },
  plugins: [],
};
