import BotSettingsView from '../../BotSettingsView'
export default async function WidgetSettingsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  return <BotSettingsView botId={(await params).botId} step='widget' />
}
