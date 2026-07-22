import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const plugin = require('../../plugins/with-orca-voice-intent.js') as {
  addOrcaVoiceIntent: (contents: string) => string
  addOrcaCarPlayScene: (contents: string) => string
  removeOrcaCarPlayScene: (contents: string) => string
  addOrcaCarPlaySceneManifest: (infoPlist: Record<string, unknown>) => Record<string, unknown>
  removeOrcaCarPlaySceneManifest: (infoPlist: Record<string, unknown>) => Record<string, unknown>
  addOrcaCarPlayEntitlement: (entitlements: Record<string, unknown>) => Record<string, unknown>
  removeOrcaCarPlayEntitlement: (entitlements: Record<string, unknown>) => Record<string, unknown>
  isCarPlaySceneEnabled: (options?: { enableCarPlayScene?: boolean }) => boolean
  START_MARKER: string
  END_MARKER: string
  CARPLAY_START_MARKER: string
  CARPLAY_VOICE_ENTITLEMENT: string
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

  it('adds an idempotent CarPlay scene delegate scaffold without the managed entitlement', () => {
    const once = plugin.addOrcaCarPlayScene('import Expo\n')
    const twice = plugin.addOrcaCarPlayScene(once)

    expect(twice).toBe(once)
    expect(twice).toContain(plugin.CARPLAY_START_MARKER)
    expect(twice).toContain('OrcaCarPlaySceneDelegate')
    expect(twice).toContain('CPVoiceControlTemplate')
    expect(twice).not.toContain('com.apple.developer.carplay-voice-based-conversation')
  })

  it('keeps the full CarPlay scene disabled until approval is explicitly recorded', () => {
    expect(plugin.isCarPlaySceneEnabled()).toBe(false)
    expect(plugin.isCarPlaySceneEnabled({ enableCarPlayScene: false })).toBe(false)
    expect(plugin.isCarPlaySceneEnabled({ enableCarPlayScene: true })).toBe(true)
  })

  it('removes a stale generated CarPlay scene when approval is disabled', () => {
    const source = plugin.addOrcaCarPlayScene('import Expo\n')
    const cleaned = plugin.removeOrcaCarPlayScene(source)

    expect(cleaned).toBe('import Expo\n')
    expect(plugin.removeOrcaCarPlayScene(cleaned)).toBe(cleaned)
  })

  it('registers the CarPlay scene role without replacing other scene configuration', () => {
    const plist = plugin.addOrcaCarPlaySceneManifest({
      UIApplicationSceneManifest: { UIApplicationSupportsMultipleScenes: false }
    })
    const manifest = plist.UIApplicationSceneManifest as Record<string, unknown>
    const configurations = manifest.UISceneConfigurations as Record<string, unknown>

    expect(manifest.UIApplicationSupportsMultipleScenes).toBe(false)
    expect(configurations.CPTemplateApplicationSceneSessionRoleApplication).toEqual([
      {
        UISceneClassName: 'CPTemplateApplicationScene',
        UISceneConfigurationName: 'Orca CarPlay',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).OrcaCarPlaySceneDelegate'
      }
    ])
    expect(JSON.stringify(plist)).not.toContain(
      'com.apple.developer.carplay-voice-based-conversation'
    )
  })

  it('removes only the stale CarPlay scene role when approval is disabled', () => {
    const plist = plugin.addOrcaCarPlaySceneManifest({
      UIApplicationSceneManifest: {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [{ UISceneConfigurationName: 'Phone' }]
        }
      }
    })
    const cleaned = plugin.removeOrcaCarPlaySceneManifest(plist)
    const manifest = cleaned.UIApplicationSceneManifest as Record<string, unknown>
    const configurations = manifest.UISceneConfigurations as Record<string, unknown>

    expect(manifest.UIApplicationSupportsMultipleScenes).toBe(false)
    expect(configurations.UIWindowSceneSessionRoleApplication).toEqual([
      { UISceneConfigurationName: 'Phone' }
    ])
    expect(configurations.CPTemplateApplicationSceneSessionRoleApplication).toBeUndefined()
  })

  it('adds the assigned CarPlay entitlement without replacing existing entitlements', () => {
    const existing = { 'com.apple.security.application-groups': ['group.com.carter.orcavoice'] }
    const entitled = plugin.addOrcaCarPlayEntitlement(existing)

    expect(entitled).toEqual({
      ...existing,
      [plugin.CARPLAY_VOICE_ENTITLEMENT]: true
    })
    expect(plugin.addOrcaCarPlayEntitlement(entitled)).toBe(entitled)
  })

  it('removes only the managed CarPlay entitlement when the scene is disabled', () => {
    const entitled = {
      'aps-environment': 'development',
      [plugin.CARPLAY_VOICE_ENTITLEMENT]: true
    }
    const cleaned = plugin.removeOrcaCarPlayEntitlement(entitled)

    expect(cleaned).toEqual({ 'aps-environment': 'development' })
    expect(plugin.removeOrcaCarPlayEntitlement(cleaned)).toBe(cleaned)
  })
})
