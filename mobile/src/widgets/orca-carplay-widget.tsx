import { Image, Link, Text, VStack } from '@expo/ui/swift-ui'
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

export type OrcaCarPlayWidgetProps = {
  status?: string
  action?: string
}

function OrcaCarPlayStatus(
  props: OrcaCarPlayWidgetProps,
  environment: WidgetEnvironment
) {
  'widget'

  const accent = environment.colorScheme === 'dark' ? '#7DE2D1' : '#006B5F'
  return (
    <Link destination="orca://">
      <VStack spacing={6} modifiers={[padding({ all: 12 })]}>
        <Image systemName="waveform.circle.fill" color={accent} />
        <Text modifiers={[font({ size: 17, weight: 'bold' })]}>Orca Voice</Text>
        <Text modifiers={[foregroundStyle(accent)]}>{props.status ?? 'Ready'}</Text>
        <Text modifiers={[font({ size: 12 })]}>{props.action ?? 'Say “Tell Orca”'}</Text>
      </VStack>
    </Link>
  )
}

export default createWidget('OrcaCarPlayStatus', OrcaCarPlayStatus)
