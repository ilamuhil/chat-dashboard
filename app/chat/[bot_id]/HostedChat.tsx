'use client'
import { useEffect, useState } from 'react'
type WidgetWindow = Window & {
  injectChat?: (config: {
    api_key: string
    theme: 'dark' | 'light'
    layout: 'page'
  }) => { destroy: () => void }
}
export function HostedChat({
  botId,
  name,
  scriptUrl,
}: {
  botId: string
  name: string
  scriptUrl: string
}) {
  const [status, setStatus] = useState('Preparing your chat…')
  useEffect(() => {
    let disposed = false
    let handle: { destroy: () => void } | undefined
    const mount = () => {
      if (disposed) return
      const inject = (window as WidgetWindow).injectChat
      if (!inject) {
        setStatus('Chat could not load. Please refresh to try again.')
        return
      }
      handle = inject({
        api_key: `hosted:${botId}`,
        layout: 'page',
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
      })
      setStatus('')
    }
    if ((window as WidgetWindow).injectChat) {
      mount()
      return () => {
        disposed = true
        handle?.destroy()
      }
    }
    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.onload = mount
    script.onerror = () =>
      setStatus('Chat could not load. Please refresh to try again.')
    document.body.append(script)
    return () => {
      disposed = true
      handle?.destroy()
      script.remove()
    }
  }, [botId, scriptUrl])
  return (
    <main className='flex min-h-svh items-center justify-center bg-background p-6 text-foreground'>
      <div className='text-center'>
        <h1 className='text-xl font-semibold'>{name}</h1>
        {status && (
          <p role='status' className='mt-3 text-sm text-muted-foreground'>
            {status}
          </p>
        )}
      </div>
    </main>
  )
}
