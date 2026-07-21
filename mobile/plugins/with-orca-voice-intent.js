const { withAppDelegate, withInfoPlist } = require('expo/config-plugins')

const START_MARKER = '// ORCA_VOICE_INTENT_START'
const END_MARKER = '// ORCA_VOICE_INTENT_END'
const CARPLAY_START_MARKER = '// ORCA_CARPLAY_SCENE_START'
const CARPLAY_END_MARKER = '// ORCA_CARPLAY_SCENE_END'

const VOICE_INTENT_SOURCE = `${START_MARKER}
#if canImport(AppIntents)
import AppIntents
import Foundation
import UIKit

@available(iOS 16.0, *)
private enum OrcaVoiceIntentError: Error {
  case invalidURL
}

@available(iOS 16.0, *)
struct SendInstructionToOrcaIntent: AppIntent {
  static let title: LocalizedStringResource = "Tell Orca"
  static let description = IntentDescription("Send a dictated instruction to your last active Orca session.")
  static let openAppWhenRun = true

  @Parameter(title: "Instruction")
  var instruction: String

  static var parameterSummary: some ParameterSummary {
    Summary("Tell Orca \\(\\.$instruction)")
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    var components = URLComponents()
    components.scheme = "orca"
    components.host = "voice-command"
    components.queryItems = [
      URLQueryItem(name: "instruction", value: instruction),
      URLQueryItem(name: "requestId", value: UUID().uuidString)
    ]
    guard let url = components.url else {
      throw OrcaVoiceIntentError.invalidURL
    }
    guard await UIApplication.shared.open(url) else {
      throw OrcaVoiceIntentError.invalidURL
    }
    return .result(dialog: "Opening Orca with your instruction.")
  }
}

@available(iOS 16.0, *)
struct OrcaAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: SendInstructionToOrcaIntent(),
      phrases: [
        "Tell \\(.applicationName)",
        "Ask \\(.applicationName)"
      ],
      shortTitle: "Tell Orca",
      systemImageName: "waveform"
    )
  }
}
#endif
${END_MARKER}`

const CARPLAY_SCENE_SOURCE = `${CARPLAY_START_MARKER}
#if canImport(CarPlay)
import CarPlay

@available(iOS 14.0, *)
final class OrcaCarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
  ) {
    let readyState = CPVoiceControlState(
      identifier: "ready",
      titleVariants: ["Orca is ready", "Say what you want Orca to do"],
      image: UIImage(systemName: "waveform.circle.fill"),
      repeats: false
    )
    let voiceTemplate = CPVoiceControlTemplate(voiceControlStates: [readyState])
    interfaceController.setRootTemplate(voiceTemplate, animated: false, completion: nil)
  }
}
#endif
${CARPLAY_END_MARKER}`

function addOrcaVoiceIntent(contents) {
  if (contents.includes(START_MARKER)) {
    return contents
  }
  return `${contents.trimEnd()}\n\n${VOICE_INTENT_SOURCE}\n`
}

function addOrcaCarPlayScene(contents) {
  if (contents.includes(CARPLAY_START_MARKER)) {
    return contents
  }
  return `${contents.trimEnd()}\n\n${CARPLAY_SCENE_SOURCE}\n`
}

function removeOrcaCarPlayScene(contents) {
  const start = contents.indexOf(CARPLAY_START_MARKER)
  const end = contents.indexOf(CARPLAY_END_MARKER)
  if (start === -1 || end === -1 || end < start) {
    return contents
  }
  const before = contents.slice(0, start).trimEnd()
  const after = contents.slice(end + CARPLAY_END_MARKER.length).trimStart()
  return after ? `${before}\n\n${after}` : `${before}\n`
}

function addOrcaCarPlaySceneManifest(infoPlist) {
  const manifest = { ...(infoPlist.UIApplicationSceneManifest || {}) }
  const configurations = { ...(manifest.UISceneConfigurations || {}) }
  configurations.CPTemplateApplicationSceneSessionRoleApplication = [
    {
      UISceneClassName: 'CPTemplateApplicationScene',
      UISceneConfigurationName: 'Orca CarPlay',
      UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).OrcaCarPlaySceneDelegate'
    }
  ]
  manifest.UISceneConfigurations = configurations
  return { ...infoPlist, UIApplicationSceneManifest: manifest }
}

function removeOrcaCarPlaySceneManifest(infoPlist) {
  const manifest = infoPlist.UIApplicationSceneManifest
  if (!manifest || typeof manifest !== 'object') {
    return infoPlist
  }
  const configurations = { ...(manifest.UISceneConfigurations || {}) }
  delete configurations.CPTemplateApplicationSceneSessionRoleApplication
  const nextManifest = { ...manifest }
  if (Object.keys(configurations).length === 0) {
    delete nextManifest.UISceneConfigurations
  } else {
    nextManifest.UISceneConfigurations = configurations
  }
  return { ...infoPlist, UIApplicationSceneManifest: nextManifest }
}

function isCarPlaySceneEnabled(options = {}) {
  return options.enableCarPlayScene === true
}

function withOrcaVoiceIntent(config, options = {}) {
  const enableCarPlayScene = isCarPlaySceneEnabled(options)
  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('Orca voice App Intent requires a Swift AppDelegate')
    }
    const voiceContents = addOrcaVoiceIntent(cfg.modResults.contents)
    cfg.modResults.contents = enableCarPlayScene
      ? addOrcaCarPlayScene(voiceContents)
      : removeOrcaCarPlayScene(voiceContents)
    return cfg
  })
  return withInfoPlist(config, (cfg) => {
    cfg.modResults = enableCarPlayScene
      ? addOrcaCarPlaySceneManifest(cfg.modResults)
      : removeOrcaCarPlaySceneManifest(cfg.modResults)
    return cfg
  })
}

withOrcaVoiceIntent.addOrcaVoiceIntent = addOrcaVoiceIntent
withOrcaVoiceIntent.addOrcaCarPlayScene = addOrcaCarPlayScene
withOrcaVoiceIntent.removeOrcaCarPlayScene = removeOrcaCarPlayScene
withOrcaVoiceIntent.addOrcaCarPlaySceneManifest = addOrcaCarPlaySceneManifest
withOrcaVoiceIntent.removeOrcaCarPlaySceneManifest = removeOrcaCarPlaySceneManifest
withOrcaVoiceIntent.isCarPlaySceneEnabled = isCarPlaySceneEnabled
withOrcaVoiceIntent.START_MARKER = START_MARKER
withOrcaVoiceIntent.END_MARKER = END_MARKER
withOrcaVoiceIntent.CARPLAY_START_MARKER = CARPLAY_START_MARKER
withOrcaVoiceIntent.CARPLAY_END_MARKER = CARPLAY_END_MARKER

module.exports = withOrcaVoiceIntent
