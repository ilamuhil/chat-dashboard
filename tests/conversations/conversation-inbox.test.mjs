import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupInboxChats } from '../../lib/conversations/conversation-inbox.ts'

const chat = (id, overrides = {}) => ({
  id, leadId: 'lead-a', botId: 'bot-a', createdAt: '2026-10-01T00:00:00Z',
  name: 'Same name', email: 'same@example.invalid', phone: '',
  lastMessageAt: '2026-10-01T00:00:00Z', highlightSnippet: '', handOverStatus: 'none',
  status: 'closed', isArchived: false, ...overrides,
})

test('returning chats form one lead entry, with active chats ahead of newer closed chats', () => {
  const all = [chat('old-open', { status: 'open' }), chat('new-closed', { lastMessageAt: '2026-10-16T00:00:00Z' })]
  const groups = groupInboxChats(all, all)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].chat.id, 'old-open')
  assert.equal(groups[0].chats.length, 2)
})

test('closed filter selects a closed transcript while retaining full lead history', () => {
  const open = chat('open', { status: 'open' })
  const closed = chat('closed')
  const groups = groupInboxChats([closed], [open, closed])
  assert.equal(groups[0].chat.id, 'closed')
  assert.equal(groups[0].chats.length, 2)
})

test('matching names/emails never combine different leads, bots or unlinked visitors', () => {
  const all = [chat('a'), chat('b', { leadId: 'lead-b' }), chat('c', { botId: 'bot-b' }),
    chat('d', { leadId: null }), chat('e', { leadId: null })]
  assert.equal(groupInboxChats(all, all).length, 5)
})

test('handover requests take priority and archived chats cannot mask open sessions', () => {
  const all = [chat('archived', { status: 'open', isArchived: true, lastMessageAt: '2026-10-16T00:00:00Z' }),
    chat('active', { status: 'open' }), chat('request', { status: 'open', handOverStatus: 'requested' })]
  assert.equal(groupInboxChats(all, all)[0].chat.id, 'request')
})

test('search results retain other sessions in the same lead history and empty results stay empty', () => {
  const all = [chat('matching-old'), chat('another-session')]
  assert.equal(groupInboxChats([all[0]], all)[0].chats.length, 2)
  assert.deepEqual(groupInboxChats([], all), [])
})
