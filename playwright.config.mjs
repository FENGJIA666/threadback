import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'browser.spec.mjs',fullyParallel:false,workers:1,reporter:'list',outputDir:'review-notes/test-results',use:{baseURL:'http://127.0.0.1:4177',channel:'chrome',headless:true,viewport:{width:1440,height:1000},trace:'retain-on-failure'}});
