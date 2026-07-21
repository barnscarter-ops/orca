import { useEffect, useRef } from 'react'

export function useVoiceCommandAutoSend(args: {
  requestId: string | undefined
  instruction: string | undefined
  ready: boolean
  send: (instruction: string) => Promise<boolean>
  onResult: (sent: boolean) => void
}): void {
  const handledRequestIdRef = useRef<string | null>(null)
  const sendRef = useRef(args.send)
  const onResultRef = useRef(args.onResult)
  sendRef.current = args.send
  onResultRef.current = args.onResult

  useEffect(() => {
    const requestId = args.requestId?.trim()
    const instruction = args.instruction?.trim()
    if (
      !args.ready ||
      !requestId ||
      !instruction ||
      handledRequestIdRef.current === requestId
    ) {
      return
    }

    handledRequestIdRef.current = requestId
    let disposed = false
    void sendRef.current(instruction).then((sent) => {
      if (!disposed) {
        onResultRef.current(sent)
      }
    })
    return () => {
      disposed = true
    }
  }, [args.instruction, args.ready, args.requestId])
}
