const { withAppDelegate } = require('expo/config-plugins')

const START_MARKER = '// ORCA_VOICE_INTENT_START'
const END_MARKER = '// ORCA_VOICE_INTENT_END'

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

function addOrcaVoiceIntent(contents) {
  if (contents.includes(START_MARKER)) {
    return contents
  }
  return `${contents.trimEnd()}\n\n${VOICE_INTENT_SOURCE}\n`
}

function withOrcaVoiceIntent(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('Orca voice App Intent requires a Swift AppDelegate')
    }
    cfg.modResults.contents = addOrcaVoiceIntent(cfg.modResults.contents)
    return cfg
  })
}

withOrcaVoiceIntent.addOrcaVoiceIntent = addOrcaVoiceIntent
withOrcaVoiceIntent.START_MARKER = START_MARKER
withOrcaVoiceIntent.END_MARKER = END_MARKER

module.exports = withOrcaVoiceIntent
