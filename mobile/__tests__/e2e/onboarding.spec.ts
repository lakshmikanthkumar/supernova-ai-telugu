// onboarding.spec.ts — Detox-style E2E tests using Jest

import { device, element, by, expect as detoxExpect } from 'detox';

describe('Onboarding E2E Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  // ─── Full onboarding flow ────────────────────────────────────────────────────
  describe('Full onboarding → signup → home', () => {
    it('app launches and shows splash screen', async () => {
      await detoxExpect(element(by.id('splash-screen'))).toBeVisible();
    });

    it('transitions from splash to onboarding carousel', async () => {
      // Wait for splash to complete
      await detoxExpect(element(by.id('onboarding-screen'))).toBeVisible();
    });

    it('shows first onboarding slide with welcome content', async () => {
      await detoxExpect(element(by.id('onboarding-slide-0'))).toBeVisible();
      await detoxExpect(element(by.id('onboarding-title-0'))).toBeVisible();
    });

    it('swipes to second onboarding slide', async () => {
      await element(by.id('onboarding-carousel')).swipe('left');
      await detoxExpect(element(by.id('onboarding-slide-1'))).toBeVisible();
    });

    it('swipes to third onboarding slide', async () => {
      await element(by.id('onboarding-carousel')).swipe('left');
      await element(by.id('onboarding-carousel')).swipe('left');
      await detoxExpect(element(by.id('onboarding-slide-2'))).toBeVisible();
    });

    it('taps Get Started button on last slide', async () => {
      // Navigate to last slide
      await element(by.id('onboarding-carousel')).swipe('left');
      await element(by.id('onboarding-carousel')).swipe('left');
      await element(by.id('get-started-button')).tap();
      await detoxExpect(element(by.id('signup-screen'))).toBeVisible();
    });

    it('fills in signup form and submits', async () => {
      // Navigate to signup
      await element(by.id('onboarding-carousel')).swipe('left');
      await element(by.id('onboarding-carousel')).swipe('left');
      await element(by.id('get-started-button')).tap();

      // Fill form
      await element(by.id('signup-name-input')).typeText('Test User');
      await element(by.id('signup-email-input')).typeText('test@englishmitra.com');
      await element(by.id('signup-password-input')).typeText('TestPass123!');
      await element(by.id('signup-submit-button')).tap();

      await detoxExpect(element(by.id('level-selection-screen'))).toBeVisible();
    });

    it('selects a proficiency level and proceeds', async () => {
      // Assumes we're on level selection
      await element(by.id('level-beginner')).tap();
      await element(by.id('level-continue-button')).tap();

      await detoxExpect(element(by.id('home-dashboard'))).toBeVisible();
    });
  });

  // ─── Skip onboarding flow ────────────────────────────────────────────────────
  describe('Skip onboarding → login screen', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
    });

    it('skip button is visible on onboarding screen', async () => {
      await detoxExpect(element(by.id('onboarding-screen'))).toBeVisible();
      await detoxExpect(element(by.id('onboarding-skip-button'))).toBeVisible();
    });

    it('tapping skip navigates to login screen', async () => {
      await element(by.id('onboarding-skip-button')).tap();
      await detoxExpect(element(by.id('login-screen'))).toBeVisible();
    });

    it('login screen shows email and password inputs', async () => {
      await element(by.id('onboarding-skip-button')).tap();
      await detoxExpect(element(by.id('login-email-input'))).toBeVisible();
      await detoxExpect(element(by.id('login-password-input'))).toBeVisible();
    });

    it('login screen shows sign in button', async () => {
      await element(by.id('onboarding-skip-button')).tap();
      await detoxExpect(element(by.id('login-submit-button'))).toBeVisible();
    });
  });
});
