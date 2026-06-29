/**
 * Detox E2E — Fluency Coach flow
 *
 * Covers:
 *   1. Navigate to Fluency Coach from home
 *   2. Story selection screen visible
 *   3. Tap a story → reader screen opens
 *   4. Start session → mic indicator visible
 *   5. Stop session → results screen opens
 *   6. "New Story" button returns to selection
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

const TIMEOUT = 15_000

describe('Fluency Coach E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { microphone: 'YES' } })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('shows story selection screen after navigating to Fluency Coach', async () => {
    await waitFor(element(by.text('Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('Fluency Coach')).tap()

    await waitFor(element(by.text('📖 Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)
    await detoxExpect(element(by.text('Read aloud. Improve every day.'))).toBeVisible()
  })

  it('filters stories by difficulty', async () => {
    await waitFor(element(by.text('📖 Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)

    await element(by.text('Easy')).tap()
    await waitFor(element(by.id('story-list'))).toBeVisible().withTimeout(TIMEOUT)
  })

  it('opens story reader when story card is tapped', async () => {
    await waitFor(element(by.text('📖 Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)

    // Tap first visible story
    await element(by.text('Start Reading')).atIndex(0).tap()

    await waitFor(element(by.text('Start Reading'))).toBeVisible().withTimeout(TIMEOUT)
    await detoxExpect(element(by.id('story-reader-screen'))).toBeVisible()
  })

  it('starts session and shows live metrics banner', async () => {
    await waitFor(element(by.text('📖 Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('Start Reading')).atIndex(0).tap()

    // In reader screen
    await waitFor(element(by.text('Start Reading'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('Start Reading')).tap()

    // Mic indicator and metrics appear
    await waitFor(element(by.id('live-metrics-banner'))).toBeVisible().withTimeout(TIMEOUT)
    await waitFor(element(by.id('mic-indicator'))).toBeVisible().withTimeout(TIMEOUT)
  })

  it('stops session and shows results screen', async () => {
    await waitFor(element(by.text('📖 Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('Start Reading')).atIndex(0).tap()

    await waitFor(element(by.text('Start Reading'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('Start Reading')).tap()

    // Wait briefly then stop
    await new Promise(r => setTimeout(r, 2000))
    await element(by.id('stop-session-btn')).tap()

    await waitFor(element(by.text('Session Complete!'))).toBeVisible().withTimeout(TIMEOUT)
    await detoxExpect(element(by.text('Performance Scores'))).toBeVisible()
  })

  it('returns to selection from results via New Story button', async () => {
    await waitFor(element(by.text('📖 Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('Start Reading')).atIndex(0).tap()

    await waitFor(element(by.text('Start Reading'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('Start Reading')).tap()
    await new Promise(r => setTimeout(r, 1500))
    await element(by.id('stop-session-btn')).tap()

    await waitFor(element(by.text('New Story'))).toBeVisible().withTimeout(TIMEOUT)
    await element(by.text('New Story')).tap()

    await waitFor(element(by.text('📖 Fluency Coach'))).toBeVisible().withTimeout(TIMEOUT)
  })
})
