import { readLastVisitedWorktreeRecord } from '../worktree/last-visited-worktree-repo'

export const MAX_VOICE_INSTRUCTION_LENGTH = 16_384

export type VoiceCommandLaunch =
  | {
      kind: 'route'
      hostId: string
      worktreeId: string
      instruction: string
      requestId: string
    }
  | {
      kind: 'error'
      message: string
    }

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function resolveVoiceCommandLaunch(args: {
  instruction: string | string[] | undefined
  requestId: string | string[] | undefined
  fallbackRequestId: string
  lastVisitedRaw: string | null
}): VoiceCommandLaunch {
  const instruction = firstParam(args.instruction).trim()
  if (!instruction) {
    return { kind: 'error', message: 'No voice instruction was provided.' }
  }
  if (instruction.length > MAX_VOICE_INSTRUCTION_LENGTH) {
    return { kind: 'error', message: 'The voice instruction is too long to send.' }
  }

  const lastVisited = readLastVisitedWorktreeRecord(args.lastVisitedRaw)
  if (!lastVisited) {
    return {
      kind: 'error',
      message: 'Open an Orca worktree on this phone once, then try the Siri command again.'
    }
  }

  return {
    kind: 'route',
    hostId: lastVisited.hostId,
    worktreeId: lastVisited.worktreeId,
    instruction,
    requestId: firstParam(args.requestId).trim() || args.fallbackRequestId
  }
}
