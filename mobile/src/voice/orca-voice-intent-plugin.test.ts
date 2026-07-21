import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const plugin = require('../../plugins/with-orca-voice-intent.js') as {
  addOrcaVoiceIntent: (contents: string) => string
  START_MARKER: string
  END_MARKER: string
}

describe('Orca voice App Intent config plugin', () => {
  it('adds the intent and App Shortcut to a generated Swift AppDelegate', () => {
    const source = plugin.addOrcaVoiceIntent('import Expo\n\nclass AppDelegate {}\n')

    expect(source).toContain(plugin.START_MARKER)
    expect(source).toContain(plugin.END_MARKER)
    expect(source).toContain('struct SendInstructionToOrcaIntent: AppIntent')
    expect(source).toContain('struct OrcaAppShortcuts: AppShortcutsProvider')
    expect(source).toContain('components.host = "voice-command"')
    expect(source).toContain('UIApplication.shared.open(url)')
    expect(source).not.toContain('OpenURLIntent')
  })

  it('is idempotent across repeated Expo prebuilds', () => {
    const once = plugin.addOrcaVoiceIntent('import Expo\n')
    const twice = plugin.addOrcaVoiceIntent(once)

    expect(twice).toBe(once)
    expect(twice.split(plugin.START_MARKER)).toHaveLength(2)
  })
})
