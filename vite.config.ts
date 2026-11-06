import { defineConfig } from 'vite';

// base './' keeps every link relative, so the built dist/ works from a domain root or a subfolder alike.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    cssCodeSplit: false,
  },
});
