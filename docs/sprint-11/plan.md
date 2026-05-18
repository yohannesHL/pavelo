# Sprint 11 — Unified Conversation Experience

**Sprint Goal:** Merge chat and voice into a single unified conversation interface. The `/chat` page becomes the ONE place to talk to Xara — text or voice. Home page becomes a voice-first onboarding entry point.

**Duration:** 2 weeks  
**Branch:** `feat/sprint-11-unified-conversation`

---

## Success Criteria

1. `/chat` page has a **voice toggle button** next to Send — clicking it activates inline voice mode
2. When voice is active, the chat input area transforms to show waveform + avatar + controls (mute/end) — no page navigation
3. Voice transcripts (both user speech and AI responses) appear as chat bubbles in the message list in real-time
4. `/` home page shows Xara voice-first greeting with "Talk to Xara" CTA and a secondary "Set up manually" link to `/onboarding`
5. `/voice` page redirects to `/chat` (deprecated gracefully)
6. No regressions — text chat still works end-to-end (send, stream, visual payloads)
7. All pages build without TypeScript errors

---

## Task Breakdown

### S11-01: Create `VoiceToggleButton` component

**Assignee:** Nova (Frontend)  
**Priority:** P0 (blocks S11-02, S11-03)

**Description:**  
Create a new component `apps/web/src/components/chat/voice-toggle-button.tsx` — a circular icon button placed to the LEFT of the Send button in the chat input bar. When toggled ON, it glows gold and the voice session starts. When toggled OFF (or user clicks "end call"), the voice session disconnects.

**Files to create:**
- `apps/web/src/components/chat/voice-toggle-button.tsx`

**Files to modify:**
- `apps/web/src/components/chat/chat-input.tsx` — add VoiceToggleButton to the button row

**Acceptance Criteria:**
- [ ] Button renders a microphone icon (lucide `Mic` / `MicOff`)
- [ ] `isActive` prop controls visual state (inactive = muted gray, active = gold bg with pulse animation)
- [ ] `onClick` fires toggle callback
- [ ] `disabled` prop disables the button (when WS not connected)
- [ ] Button has `aria-label="Toggle voice mode"` and `aria-pressed` reflecting state
- [ ] Positioned between the Paperclip button and the textarea in `chat-input.tsx`
- [ ] Tooltip on hover: "Talk to Xara" (off) / "End voice" (on)

**UX Notes (Kira/Milo):**
- Use Framer Motion `scale` on press for tactile feel
- Gold glow uses `box-shadow: 0 0 12px var(--color-accent)` when active
- On mobile, button must be at least 44x44px touch target
- Consider a subtle "listening" pulse ring animation (CSS keyframes) when active

---

### S11-02: Create `InlineVoicePanel` component

**Assignee:** Nova (Frontend)  
**Priority:** P0 (blocks S11-04)

**Description:**  
Create `apps/web/src/components/chat/inline-voice-panel.tsx`. This panel **replaces the textarea** when voice mode is active. It contains:
- XaraAvatar (small, centered)
- VoiceWaveform (horizontal bar below avatar)
- VoiceControls (mute + end call buttons)
- A "Switch to text" button

The panel slides in from below using Framer Motion `AnimatePresence`.

**Files to create:**
- `apps/web/src/components/chat/inline-voice-panel.tsx`

**Files to modify:**
- `apps/web/src/components/chat/chat-input.tsx` — conditionally render InlineVoicePanel when voice is active, hide textarea + send button

**Acceptance Criteria:**
- [ ] When `voiceActive=true`, the textarea and Send button are hidden; InlineVoicePanel renders in their place
- [ ] Panel shows: XaraAvatar (size="sm"), VoiceWaveform, mute button, end-call button
- [ ] "Switch to text" small link below controls to deactivate voice
- [ ] AnimatePresence transition: panel slides up (y: 20 -> 0, opacity 0 -> 1)
- [ ] Panel height is fixed (~120px) so chat scroll area doesn't jump wildly
- [ ] Reuses existing components: `XaraAvatar`, `VoiceWaveform`, `VoiceControls` from `@/components/voice/`
- [ ] Responsive: on mobile, panel fills full width with smaller avatar

**UX Notes (Kira/Milo):**
- Background: subtle dark gradient (`from-[#0D1B2A]/5 to-transparent`) to visually differentiate from chat area
- Border-top with gold accent line (1px) when active to signal "live" state
- Avatar should show speaking/listening state animation
- End call button is red, mute is neutral — match existing VoiceControls styling

---

### S11-03: Integrate `useVoiceSession` into Chat page

**Assignee:** Nova (Frontend)  
**Priority:** P0 (blocks S11-04, S11-05)

**Description:**  
Wire the existing `useVoiceSession` hook into the chat conversation page so voice can be started/stopped from within chat context. The voice session must use the **current conversationId** so transcripts are persisted to the same conversation.

**Files to modify:**
- `apps/web/src/app/chat/[conversationId]/page.tsx` — import and invoke `useVoiceSession`, pass state down
- `apps/web/src/app/chat/page.tsx` — same treatment for landing page (auto-create conversation on voice start)
- `apps/web/src/components/chat/chat-input.tsx` — accept `voiceActive`, `onVoiceToggle`, and voice session props

**Acceptance Criteria:**
- [ ] `useVoiceSession` is called in the conversation page with `{ conversationId }` option
- [ ] Toggling voice ON calls `voiceSession.connect({ conversationId, language: 'en', recordingConsent: true })`
- [ ] Toggling voice OFF calls `voiceSession.disconnect()`
- [ ] Voice state (`connectionState`, `isMuted`, `audioLevel`, `agentAudioLevel`, `agentState`) passed to InlineVoicePanel
- [ ] If on `/chat` (no conversation yet), toggling voice first creates a conversation (via `createConversation()`), then connects voice with that ID
- [ ] On unmount / navigation away, voice session disconnects cleanly (already handled by hook's cleanup)

**UX Notes (Kira/Milo):**
- Show a brief "Connecting..." state in the InlineVoicePanel (reuse ConnectionStatus component)
- If mic permission denied, show inline error in panel — don't navigate away or show modal
- Disable the voice toggle button while `connectionState === "connecting"` to prevent double-tap

---

### S11-04: Voice transcripts appear as chat message bubbles

**Assignee:** Nova (Frontend)  
**Priority:** P0 (core feature)

**Description:**  
When voice mode is active, transcripts from `useVoiceSession` must appear as chat bubbles in the message list. User speech = user bubble. Agent speech = assistant bubble. This makes the conversation feel unified — text and voice messages interleave naturally.

**Files to modify:**
- `apps/web/src/app/chat/[conversationId]/page.tsx` — watch `transcripts` array from voice hook, inject into chat store
- `apps/web/src/stores/chat-store.ts` — add `addVoiceTranscript(entry: {text, speaker})` action

**Acceptance Criteria:**
- [ ] New `addVoiceTranscript` action in chat-store that appends a message with `role` mapped from speaker
- [ ] Each final transcript from `useVoiceSession.transcripts` is added to messages array
- [ ] Messages added via voice have a `source: 'voice'` metadata field (for styling differentiation)
- [ ] Interim transcripts (`currentInterim`) show as a grayed-out "typing" bubble (not persisted)
- [ ] No duplicate messages — use transcript ID to deduplicate
- [ ] When voice mode ends, all transcripts already in the message list persist (they're in the store)
- [ ] Message list auto-scrolls as new voice transcripts arrive

**UX Notes (Kira/Milo):**
- Voice-sourced messages get a small microphone icon badge in the bubble corner to distinguish from typed
- Interim text should be italic + lower opacity (0.5) in a temporary bubble
- Smooth scroll behavior preserved — no janky jumps when transcripts arrive rapidly

---

### S11-05: Update `ChatInput` to orchestrate text/voice modes

**Assignee:** Nova (Frontend)  
**Priority:** P1

**Description:**  
Refactor `chat-input.tsx` to be the orchestrator of text vs. voice mode. It receives all voice state as props and conditionally renders either (a) the existing textarea + send button, or (b) the InlineVoicePanel. The VoiceToggleButton is always visible.

**Files to modify:**
- `apps/web/src/components/chat/chat-input.tsx`

**New props interface:**
- `voiceActive: boolean`
- `onVoiceToggle: () => void`
- `voiceDisabled?: boolean` (true when WS disconnected or no auth)
- `voiceConnectionState?: VoiceConnectionState`
- `isMuted?: boolean`
- `onToggleMute?: () => void`
- `audioLevel?: number`
- `agentAudioLevel?: number`
- `agentState?: AgentSpeakingState`
- `onEndVoice?: () => void`

**Acceptance Criteria:**
- [ ] VoiceToggleButton always renders (between Paperclip and textarea)
- [ ] When `voiceActive=false`: textarea + Send visible, InlineVoicePanel hidden
- [ ] When `voiceActive=true`: textarea + Send hidden, InlineVoicePanel visible
- [ ] Props flow correctly to child components
- [ ] Keyboard shortcut: `Ctrl+Shift+V` toggles voice mode (with `voiceDisabled` guard)
- [ ] No layout shift — container height transitions smoothly

**UX Notes (Kira/Milo):**
- The transition between text and voice mode should feel like a "mode switch" — smooth 200ms crossfade
- The voice toggle button stays in the same position regardless of mode for muscle memory
- Helper text below input changes: "Press Enter to send" -> "Xara is listening..." when voice active

---

### S11-06: Home page — Voice-first Xara greeting

**Assignee:** Nova (Frontend) + Milo (Design)  
**Priority:** P1

**Description:**  
Replace the boring status card home page with a voice-first Xara greeting. The page shows:
- Large XaraAvatar (animated, breathing/idle state)
- Heading: "Hi, I'm Xara"
- Subtitle: "Your AI estate agent. Let's find your perfect property."
- Primary CTA: "Talk to Xara" (gold button, starts voice -> navigates to `/chat?voice=true`)
- Secondary CTA: "Set up manually" (text link -> `/onboarding`)
- Tertiary: "Or type instead" (text link -> `/chat`)

**Files to modify:**
- `apps/web/src/app/page.tsx` — complete rewrite of page content

**Acceptance Criteria:**
- [ ] Hero section with XaraAvatar (lg), heading, subtitle
- [ ] "Talk to Xara" button: gold, prominent, navigates to `/chat?voice=true`
- [ ] "Set up manually" link: below CTA, navigates to `/onboarding`
- [ ] "Or type instead" link: navigates to `/chat`
- [ ] Page is responsive: centered on desktop, full-width padding on mobile
- [ ] No system status cards remain
- [ ] Page loads without auth (public landing)
- [ ] Minimal JS — avatar can be a CSS-only animated version for the home page

**UX Notes (Kira/Milo):**
- Background: subtle radial gradient from center (dark navy -> lighter) matching brand
- Avatar: gentle "breathing" scale animation (1.0 -> 1.02, 3s ease-in-out infinite)
- Typography: heading in `var(--font-heading)`, 3xl on mobile, 5xl on desktop
- Gold CTA button matches voice page styling (rounded-full, shadow, hover:scale-105)
- Below the fold: trust signals — "Voice-powered | Remembers your preferences | UK property data"
- Ensure >= 4.5:1 contrast ratio for all text on gradient background

---

### S11-07: Handle `?voice=true` query param in Chat page

**Assignee:** Nova (Frontend)  
**Priority:** P1 (depends on S11-03)

**Description:**  
When the user navigates to `/chat?voice=true` (from home page CTA), the chat page should auto-create a conversation and immediately activate voice mode.

**Files to modify:**
- `apps/web/src/app/chat/page.tsx` — read `searchParams`, if `voice=true` auto-trigger voice flow

**Acceptance Criteria:**
- [ ] On mount, if URL has `?voice=true`, automatically: create conversation -> navigate to `/chat/{id}` -> activate voice
- [ ] Remove `?voice=true` from URL after activation (use `router.replace` to clean up)
- [ ] If voice connection fails, fall back gracefully to text mode with error message
- [ ] Works on mobile browsers that require user gesture for mic — show "Tap to start" intermediate if needed
- [ ] If user is not authenticated, redirect to login with return URL preserving `?voice=true`

**UX Notes (Kira/Milo):**
- Show a brief "Starting voice session..." loading state with XaraAvatar pulsing
- If mic permission is needed, show a friendly prompt: "Xara needs your microphone to listen"
- Don't auto-play audio without user interaction (browser policy)

---

### S11-08: Deprecate `/voice` page — redirect to `/chat`

**Assignee:** Nova (Frontend)  
**Priority:** P2

**Description:**  
The standalone `/voice` page is now redundant. Replace it with a redirect to `/chat?voice=true`. Keep voice components — they're reused in the inline panel.

**Files to modify:**
- `apps/web/src/app/voice/page.tsx` — replace with redirect

**Acceptance Criteria:**
- [ ] Navigating to `/voice` immediately redirects to `/chat?voice=true`
- [ ] No flash of old voice UI content
- [ ] Voice components in `apps/web/src/components/voice/` are NOT deleted
- [ ] Any existing nav links to `/voice` updated to point to `/chat`

**UX Notes (Kira/Milo):**
- Clean deprecation — users who bookmarked `/voice` land smoothly in unified experience

---

### S11-09: Chat store — add voice transcript integration actions

**Assignee:** Nova (Frontend)  
**Priority:** P0 (blocks S11-04)

**Description:**  
Extend the Zustand chat store with actions needed for voice transcript injection. Pure state-layer task.

**Files to modify:**
- `apps/web/src/stores/chat-store.ts`

**New state and actions:**
- `voiceActive: boolean` (default: false)
- `interimTranscript: string | null` (default: null)
- `setVoiceActive: (active: boolean) => void`
- `addVoiceTranscript: (entry: { id: string; text: string; speaker: 'user' | 'agent' }) => void`
- `setInterimTranscript: (text: string | null) => void`

**Acceptance Criteria:**
- [ ] `voiceActive` boolean in state, default `false`
- [ ] `setVoiceActive(true/false)` updates the flag
- [ ] `addVoiceTranscript` appends a `ChatMessage` with `role` mapped from speaker, `content` from text, unique `id`, and `source: 'voice'` field
- [ ] `addVoiceTranscript` deduplicates by `id` — if message with same ID exists, skip
- [ ] `setInterimTranscript` stores interim text separate from messages array
- [ ] Existing `clearMessages` also clears interim transcript and sets voiceActive to false
- [ ] `ChatMessage` type extended with optional `source?: 'text' | 'voice'` field
- [ ] Types exported for use in components

**UX Notes (Kira/Milo):**
- N/A (state-only) — ensures `source: 'voice'` is available for bubble styling in S11-04

---

### S11-10: Visual polish — voice mode transitions & states

**Assignee:** Milo (Design/CSS)  
**Priority:** P2

**Description:**  
Polish all transitions and visual states for the unified voice experience. Runs after S11-01 through S11-05 are functionally complete.

**Files to modify:**
- `apps/web/src/components/chat/voice-toggle-button.tsx` — animation polish
- `apps/web/src/components/chat/inline-voice-panel.tsx` — gradient, spacing, responsive
- `apps/web/src/components/chat/chat-bubble.tsx` — voice message badge styling
- `apps/web/src/app/page.tsx` — home page visual polish

**Acceptance Criteria:**
- [ ] Voice toggle button: gold pulse ring keyframes when active
- [ ] InlineVoicePanel: smooth height animation, no content jumping
- [ ] Voice bubbles: microphone badge is 12px, positioned top-right of bubble, subtle opacity
- [ ] Home page: gradient renders correctly on 375px, 768px, 1440px viewports
- [ ] All animations respect `prefers-reduced-motion` — disable pulse/waveform for reduced motion
- [ ] Consistent border-radius usage: `var(--radius-card)` for panel, `var(--radius-input)` for buttons

**UX Notes (Kira/Milo):**
- Motion budget: no animation longer than 300ms for UI state changes
- Waveform in inline panel: max 32px tall (subtle, not dominating)
- Ensure gold accent (#F4A261) usage is consistent across toggle, CTA, and active states

---

### S11-11: QA validation & regression testing

**Assignee:** Ivy (QA)  
**Priority:** P0 (gate for merge)

**Description:**  
Full QA pass on all Sprint 11 work. Test across Chrome, Safari, Firefox. Mobile (iOS Safari, Android Chrome).

**Test Matrix:**

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Text chat send + receive | Works as before, no regression |
| 2 | Toggle voice ON in chat | InlineVoicePanel appears, mic prompt fires |
| 3 | Speak -> transcript as bubble | User speech shows as user bubble in real-time |
| 4 | Agent responds via voice -> bubble | Agent speech shows as assistant bubble |
| 5 | Toggle voice OFF | Panel dismisses, text input returns, voice disconnects |
| 6 | Navigate away during voice | Voice disconnects cleanly, no orphan connections |
| 7 | Home page -> "Talk to Xara" | Navigates to `/chat?voice=true`, voice auto-starts |
| 8 | Home page -> "Set up manually" | Navigates to `/onboarding` |
| 9 | Visit `/voice` | Redirects to `/chat?voice=true` |
| 10 | No mic permission | Graceful error in panel, falls back to text |
| 11 | Mobile (375px) | All UI fits, touch targets >= 44px, no horizontal scroll |
| 12 | Streaming text response while voice OFF | Still works (visual payloads, streaming tokens) |
| 13 | Rapid voice on/off toggling | No crashes, no orphan LiveKit rooms |

**Acceptance Criteria:**
- [ ] All 13 scenarios pass
- [ ] No console errors (warnings acceptable if pre-existing)
- [ ] No TypeScript build errors (`pnpm build` succeeds)
- [ ] Accessibility: voice toggle is keyboard-navigable, screen reader announces state changes
- [ ] Performance: no memory leaks from repeated voice connect/disconnect

---

## Task Dependencies

```
S11-09 (store actions) ───────┐
                              ├──> S11-04 (transcripts -> bubbles)
S11-01 (toggle button) ───────┤
                              ├──> S11-05 (orchestrate input)
S11-02 (inline panel) ────────┤
                              │
S11-03 (hook integration) ────┘──> S11-07 (?voice=true param)
                                        │
S11-06 (home page) ────────────────────>│
                                        │
S11-08 (deprecate /voice) ─────────────>│
                                        
S11-10 (polish) ──> after S11-01 through S11-05 functionally complete

S11-11 (QA) ──> after ALL tasks complete
```

**Critical path:** S11-09 -> S11-01 -> S11-03 -> S11-04 -> S11-05 -> S11-11

---

## Risk Notes

| Risk | Impact | Mitigation |
|------|--------|------------|
| LiveKit mic permission UX varies by browser | Medium | S11-07 handles with intermediate "tap to start" state |
| Voice + text WS on same conversationId | High | Voice session uses conversationId — ensure server handles both message types without duplicate responses |
| Mobile Safari autoplay restrictions | Medium | Require user gesture (home page button click) before connecting voice |
| Chat store messages array growth during long voice | Low | Voice sessions typically short; cap in future sprint if needed |
| Scope creep: audio-reactive avatar on home page | Medium | Home page avatar is CSS-only breathing — defer real audio-reactive to Sprint 12 |

---

## Agent Prompt (for dev team chat)

> You are building Sprint 11 of Pavelo — "Unified Conversation Experience". The goal is to merge the separate `/chat` and `/voice` pages into ONE unified interface at `/chat`. Read `docs/sprint-11/plan.md` for full task breakdown. Start with S11-09 (store), then S11-01 (button), S11-02 (panel), S11-03 (hook wiring). Work on branch `feat/sprint-11-unified-conversation`. Do NOT delete voice components — they are reused inline. The home page (`/`) gets a complete redesign as a voice-first greeting. `/voice` becomes a redirect.
