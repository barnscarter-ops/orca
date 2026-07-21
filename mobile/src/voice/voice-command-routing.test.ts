import { describe, expect, it } from 'vitest'
import { MAX_VOICE_INSTRUCTION_LENGTH, resolveVoiceCommandLaunch } from './voice-command-routing'

describe('voice command routing', () => {
  it('routes a voice instruction to the last visited worktree', () => {
    const result = resolveVoiceCommandLaunch({
      instruction: 'Run the test suite',
      requestId: 'voice-1',
      fallbackRequestId: 'fallback',
      lastVisitedRaw: JSON.stringify({ hostId: 'host-1', worktreeId: 'worktree-2' })
    })

    expect(result).toEqual({
      kind: 'route',
      hostId: 'host-1',
      worktreeId: 'worktree-2',
      instruction: 'Run the test suite',
      requestId: 'voice-1'
    })
  })

  it('uses a stable fallback request id for manually opened links', () => {
    const result = resolveVoiceCommandLaunch({
      instruction: ['Review the diff'],
      requestId: undefined,
      fallbackRequestId: 'manual-1',
      lastVisitedRaw: JSON.stringify({ hostId: 'host-1', worktreeId: 'worktree-2' })
    })

    expect(result.kind === 'route' && result.requestId).toBe('manual-1')
  })

  it('requires a previous mobile session', () => {
    const result = resolveVoiceCommandLaunch({
      instruction: 'Continue',
      requestId: 'voice-1',
      fallbackRequestId: 'fallback',
      lastVisitedRaw: null
    })

    expect(result).toEqual({
      kind: 'error',
      message: 'Open an Orca worktree on this phone once, then try the Siri command again.'
    })
  })

  it('rejects empty and oversized instructions', () => {
    expect(
      resolveVoiceCommandLaunch({
        instruction: '   ',
        requestId: 'voice-1',
        fallbackRequestId: 'fallback',
        lastVisitedRaw: '{}'
      })
    ).toEqual({ kind: 'error', message: 'No voice instruction was provided.' })

    expect(
      resolveVoiceCommandLaunch({
        instruction: 'x'.repeat(MAX_VOICE_INSTRUCTION_LENGTH + 1),
        requestId: 'voice-1',
        fallbackRequestId: 'fallback',
        lastVisitedRaw: '{}'
      })
    ).toEqual({ kind: 'error', message: 'The voice instruction is too long to send.' })
  })
})
