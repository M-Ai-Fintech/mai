import type { TestRunnerConfig } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async preRender(page) {
    await injectAxe(page);
  },
  async postRender(page, context) {
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
      axeOptions: {
        rules: {
          'color-contrast': { enabled: false }
        }
      }
    });
    
    // Configuração de Testes Visuais Locais
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir: `${process.cwd()}/__snapshots__/${context.id}`,
      customSnapshotIdentifier: context.id,
      failureThreshold: 0.05,
      failureThresholdType: 'percent'
    });
  },
};

export default config;
