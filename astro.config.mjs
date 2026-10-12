// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Absolute URL of the deployed site; used for RSS links. Set SITE_URL in CI.
  site: process.env.SITE_URL || 'http://localhost:4321', // || not ??: CI passes an empty string when the variable is unset
  output: 'static',
  trailingSlash: 'ignore',
});
