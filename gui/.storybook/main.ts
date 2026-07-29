import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  "stories": [
    "../components/**/*.mdx",
    "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/nextjs-vite",
  async viteFinal(config) {
    if (config.server) {
      config.server.watch = {
        ...config.server.watch,
        ignored: ['**/.next/**', '**/node_modules/**', '**/storybook-static/**', '**/app/**']
      };
    }
    return config;
  }
};
export default config;
