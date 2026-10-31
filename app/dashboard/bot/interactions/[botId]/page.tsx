import BotSettingsView from '../BotSettingsView'
export default async function BotConfigurationPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  return <BotSettingsView botId={(await params).botId} step='bot' />
}
