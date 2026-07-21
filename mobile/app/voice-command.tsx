import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LAST_VISITED_WORKTREE_STORAGE_KEY } from '../src/worktree/last-visited-worktree-repo'
import { resolveVoiceCommandLaunch } from '../src/voice/voice-command-routing'
import { colors, radii, spacing, typography } from '../src/theme/mobile-theme'

export default function VoiceCommandScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    instruction?: string | string[]
    requestId?: string | string[]
  }>()
  const fallbackRequestIdRef = useRef(`manual-${Date.now()}`)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    void AsyncStorage.getItem(LAST_VISITED_WORKTREE_STORAGE_KEY).then((lastVisitedRaw) => {
      if (disposed) {
        return
      }
      const launch = resolveVoiceCommandLaunch({
        instruction: params.instruction,
        requestId: params.requestId,
        fallbackRequestId: fallbackRequestIdRef.current,
        lastVisitedRaw
      })
      if (launch.kind === 'error') {
        setError(launch.message)
        return
      }
      router.replace({
        pathname: '/h/[hostId]/session/[worktreeId]',
        params: {
          hostId: launch.hostId,
          worktreeId: launch.worktreeId,
          voiceInstruction: launch.instruction,
          voiceRequestId: launch.requestId
        }
      })
    })
    return () => {
      disposed = true
    }
  }, [params.instruction, params.requestId, router])

  return (
    <View style={styles.root}>
      {error ? (
        <>
          <Text style={styles.title}>Voice command not sent</Text>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Open Orca</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.textSecondary} />
          <Text style={styles.message}>Connecting to your last Orca session…</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.bgBase
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.titleSize,
    fontWeight: '600'
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: 20,
    textAlign: 'center'
  },
  button: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.button,
    backgroundColor: colors.surfaceBright
  },
  buttonText: {
    color: colors.bgBase,
    fontSize: typography.bodySize,
    fontWeight: '600'
  }
})
