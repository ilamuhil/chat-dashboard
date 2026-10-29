import { ImageResponse } from 'next/og'

export const alt = 'AI Chat Bot — Every student question. A better next step.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '70px 80px',
        background: '#eff7fb',
        color: '#102c40',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '17px',
          fontSize: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 42,
            height: 42,
            background: '#086cae',
            color: '#fff',
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 23,
          }}
        >
          AI
        </div>
        AI Chat Bot
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 17,
            letterSpacing: 3,
            color: '#086cae',
            marginBottom: 24,
          }}
        >
          AI ADMISSIONS CHATBOT FOR ACADEMIC INSTITUTES
        </div>
        <div style={{ fontSize: 73, letterSpacing: -3, lineHeight: 1.1 }}>
          Every student question.
        </div>
        <div
          style={{
            fontSize: 73,
            letterSpacing: -3,
            lineHeight: 1.1,
            color: '#0874b5',
          }}
        >
          A better next step.
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 22, color: '#526e80' }}>
        Institute knowledge · Student lead capture · Human counsellor handoff
      </div>
    </div>,
    size,
  )
}
