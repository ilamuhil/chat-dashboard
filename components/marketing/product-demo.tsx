'use client'

import { useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'

const stages = [
  {
    label: 'Answer',
    title: 'An answer with a source behind it.',
    copy: 'Help students understand courses, eligibility, fees, and application steps using the material your institute approves.',
  },
  {
    label: 'Capture',
    title: 'A conversation worth following up.',
    copy: 'Collect the contact fields you choose and keep the enquiry alongside its conversation history.',
  },
  {
    label: 'Connect',
    title: 'A human, with the context already there.',
    copy: 'Notify your team when a student asks for a counsellor. An available teammate can join the same conversation.',
  },
]

export function ProductDemo() {
  const [stage, setStage] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  return (
    <div id='product-demo' className='product-demo'>
      <div className='demo-toolbar'>
        <span className='demo-window-dots' aria-hidden='true'>
          <i />
          <i />
          <i />
        </span>
        <span>From first question to next step</span>
        <ShieldCheck size={15} aria-hidden='true' />
      </div>
      <div
        className='demo-tabs'
        role='tablist'
        aria-label='Explore the admissions journey'
      >
        {stages.map((item, index) => (
          <button
            key={item.label}
            ref={(element) => {
              tabs.current[index] = element
            }}
            id={`journey-tab-${index}`}
            type='button'
            role='tab'
            aria-selected={stage === index}
            aria-controls={`journey-panel-${index}`}
            tabIndex={stage === index ? 0 : -1}
            onClick={() => setStage(index)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % stages.length
                  : event.key === 'ArrowLeft'
                    ? (index + stages.length - 1) % stages.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? stages.length - 1
                        : null
              if (next === null) return
              event.preventDefault()
              setStage(next)
              tabs.current[next]?.focus()
            }}
          >
            <span>0{index + 1}</span>
            {item.label}
            <ArrowRight size={13} aria-hidden='true' />
          </button>
        ))}
      </div>
      {stages.map((item, index) => (
        <div
          key={item.label}
          id={`journey-panel-${index}`}
          role='tabpanel'
          aria-labelledby={`journey-tab-${index}`}
          hidden={stage !== index}
          tabIndex={0}
        >
          <div className='demo-chat' key={stage}>
            <div className='demo-chat-header'>
              <span className='demo-bot-icon'>
                <GraduationCap size={21} aria-hidden='true' />
              </span>
              <div>
                <strong>Northstar Admissions</strong>
                <span>Fictional institute · product example</span>
              </div>
              <span className='demo-ai-label'>AI assistant</span>
            </div>
            {index === 0 ? (
              <>
                <div className='demo-message visitor'>
                  Can I apply for the data analytics course without a coding
                  background?
                </div>
                <div className='demo-message assistant'>
                  <span className='demo-message-label'>
                    Admissions assistant
                  </span>
                  Yes. The course guide lists no prior coding experience as a
                  requirement. You’ll start with the foundations.{' '}
                  <span className='demo-citation'>[1]</span>
                  <div className='demo-source'>
                    <FileText size={14} aria-hidden='true' /> Course guide.pdf{' '}
                    <span>Source 1</span>
                  </div>
                </div>
                <div className='demo-insight'>
                  <BookOpen size={16} aria-hidden='true' />
                  <span>
                    Your institute’s information.
                    <br />
                    <strong>A useful answer, in context.</strong>
                  </span>
                </div>
              </>
            ) : index === 1 ? (
              <>
                <div className='demo-message visitor'>
                  I’m interested. Can someone help me with the application?
                </div>
                <div className='demo-message assistant'>
                  <span className='demo-message-label'>
                    Admissions assistant
                  </span>
                  Share your contact details so the admissions team can follow
                  up on your enquiry.
                </div>
                <div className='demo-lead-record'>
                  <span className='demo-record-icon'>
                    <UserRoundCheck size={20} aria-hidden='true' />
                  </span>
                  <div>
                    <strong>Student enquiry captured</strong>
                    <span>Data analytics · application guidance</span>
                    <small>
                      <Check size={12} aria-hidden='true' /> Contact details &
                      conversation together
                    </small>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className='demo-message visitor'>
                  I’d like to speak with a counsellor.
                </div>
                <div className='demo-message assistant'>
                  <span className='demo-message-label'>
                    Admissions assistant
                  </span>
                  I’ve requested a counsellor to join this conversation.
                </div>
                <div className='demo-handoff'>
                  <span className='demo-record-icon'>
                    <MessageCircle size={19} aria-hidden='true' />
                  </span>
                  <div>
                    <strong>A teammate joins the conversation</strong>
                    <span>When available, your team can pick up here.</span>
                  </div>
                  <Check size={16} aria-hidden='true' />
                </div>
                <div className='demo-message counsellor'>
                  <span className='demo-message-label'>
                    Admissions counsellor · example
                  </span>
                  I can see you’re exploring data analytics. Let’s walk through
                  your application questions.
                </div>
              </>
            )}
          </div>
          <div className='demo-caption'>
            <strong>{item.title}</strong>
            <p>{item.copy}</p>
          </div>
        </div>
      ))}
      <p className='demo-disclaimer'>
        Interactive illustration. Sample content; this is not a live chat.
      </p>
    </div>
  )
}
