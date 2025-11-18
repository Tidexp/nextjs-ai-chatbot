# Code Playground Enhancement - AI Chat Integration

## Overview

Transformed the Code Playground to use an interactive AI chat interface instead of a static console panel. The "Check with AI" button now initiates a conversation with the AI tutor, starting with code validation feedback.

## Key Changes

### 1. **Check with AI → Chat Interface**

- **Before**: Static console panel with read-only AI feedback
- **After**: Full interactive chat interface using LessonChat component
- The AI conversation starts with automated code validation
- Students can continue asking questions and getting help in the same chat

### 2. **Resizable Preview Panel**

- Added drag-to-resize functionality for the code preview
- Constraints: 20% - 80% width
- Visual resize handle with hover effects
- Smooth percentage-based resizing

### 3. **Resizable Chat Panel**

- Chat panel is also resizable (20% - 60% width)
- Independent resize controls for preview vs chat
- Chat remembers initial AI feedback message

## Technical Implementation

### Component Changes: `code-playground.tsx`

#### New Imports

```typescript
import { LessonChat } from "@/components/lesson-chat";
import type { Session } from "next-auth";
```

#### New State Management

```typescript
const [previewWidth, setPreviewWidth] = useState(50); // Preview panel width %
const [chatWidth, setChatWidth] = useState(40); // Chat panel width %
const [isResizingPreview, setIsResizingPreview] = useState(false);
const [isResizingChat, setIsResizingChat] = useState(false);
const [initialChatMessage, setInitialChatMessage] = useState<string | null>(
  null
);
```

#### handleCheckWithAI Logic

```typescript
const handleCheckWithAI = useCallback(async () => {
  // Validate code with AI
  const response = await fetch('/api/code-check', ...);
  const result = await response.json();

  // Create formatted message with emoji indicators
  const message = result.isValid
    ? `✅ Great job! Your code looks good!\n\n${result.message}\n\nFeel free to ask...`
    : `⚠️ Your code needs some improvements:\n\n${result.message}\n\nLet me know...`;

  // Open chat with initial message
  setInitialChatMessage(message);
  setShowChat(true);
}, [code, language, lessonId]);
```

#### Resize Handlers

- **Preview Panel**: Drag from left edge, constrained 20-80%
- **Chat Panel**: Drag from right edge, constrained 20-60%
- Both use `useEffect` with mouse event listeners
- Calculate percentage-based widths relative to container

### Chat Integration

The AI chat uses LessonChat component with:

- **lessonId**: `lessonId || 'playground'`
- **lessonType**: `'practice'`
- **initialSystemPrompt**: Includes current code context and validation feedback
- **autoCreate**: `false` (lazy initialization)
- **session**: Passed from page component

#### System Prompt Template

```typescript
`I am your AI coding assistant. I can help you understand code concepts, debug issues, and improve your solutions.

Current code context:
- Language: ${language}
- Code length: ${code.length} characters

${initialChatMessage ? `\nInitial feedback:\n${initialChatMessage}` : ""}`;
```

### UI Layout

#### Button States

- **Run Code**: Shows preview panel
- **Check with AI**: Validates code, opens chat with feedback
- **Get Help / Close Chat**: Toggles chat for general questions

#### Panel Visibility Logic

- **Preview visible**: When `showPreview && !showChat`
- **Chat visible**: When `showChat`
- **Preview** and **Chat** are mutually exclusive
- **Editor** dynamically adjusts width based on active panel

#### Width Calculations

```typescript
// Editor width
width: showChat
  ? `${100 - chatWidth}%` // Chat open
  : showPreview
  ? `${previewWidth}%` // Preview open
  : "100%"; // Both closed

// Preview width
width: `${100 - previewWidth}%`;

// Chat width
width: `${chatWidth}%`;
```

## User Experience Flow

### 1. Code Validation Flow

1. Student writes code in editor
2. Clicks "Check with AI"
3. System validates code via `/api/code-check`
4. Chat panel opens with formatted feedback:
   - ✅ Success message with encouragement
   - ⚠️ Improvement suggestions with guidance
5. Student can ask follow-up questions in chat
6. AI has full context of code and initial feedback

### 2. General Help Flow

1. Student clicks "Get Help"
2. Chat opens without initial validation
3. Student asks any coding questions
4. AI provides guidance based on current code context

### 3. Preview Flow

1. Student clicks "Run Code"
2. Preview panel opens (chat closes if open)
3. Student can resize preview width
4. Live preview of HTML/CSS/JavaScript

## Benefits

### Educational Value

- **Conversational Learning**: Students learn through dialogue, not just static feedback
- **Iterative Improvement**: Can ask clarifying questions about feedback
- **Contextual Help**: AI remembers initial validation in ongoing conversation
- **Natural Workflow**: Check code → discuss → improve → recheck

### Technical Benefits

- **Reuses Existing Components**: LessonChat provides full chat functionality
- **Consistent UX**: Same chat experience as lesson pages
- **Scalable**: Easy to add more AI features
- **Maintainable**: Single source of truth for chat logic

### UX Improvements

- **Flexible Layout**: Resize any panel to preferred size
- **Visual Feedback**: Hover states on resize handles
- **Smooth Transitions**: Percentage-based widths resize smoothly
- **Clear Actions**: Button text shows current state

## Files Modified

### 1. `components/code-playground.tsx` (Complete Rewrite)

- Replaced console panel with LessonChat
- Added preview resize functionality
- Added chat resize functionality
- Integrated AI validation with chat initialization

### 2. `app/(chat)/playground/page.tsx` (Minor Update)

- Added `session` prop to CodePlayground component

## Dependencies

### Required Components

- **LessonChat**: Main chat interface
- **CodeEditor**: Multi-language code editor
- **CodePreview**: Live preview for HTML/CSS/JS
- **Button**: UI button component

### API Endpoints

- **POST /api/code-check**: Validates code and returns feedback
- **POST /api/lesson-chat**: Creates/retrieves lesson chat session

### Type Definitions

- **Session**: From `next-auth` for authentication
- **CodePlaygroundProps**: Component props interface

## Configuration

### Width Constraints

```typescript
// Preview Panel
MIN_WIDTH: 20%
MAX_WIDTH: 80%
DEFAULT_WIDTH: 50%

// Chat Panel
MIN_WIDTH: 20%
MAX_WIDTH: 60%
DEFAULT_WIDTH: 40%
```

### Supported Languages

- HTML
- CSS
- JavaScript
- Python (editor only, no preview)

## Testing Checklist

- [ ] Click "Check with AI" validates code
- [ ] Chat opens with formatted feedback
- [ ] Can ask follow-up questions in chat
- [ ] "Get Help" opens chat without validation
- [ ] Preview panel is resizable
- [ ] Chat panel is resizable
- [ ] Resize handles show on hover
- [ ] Width constraints enforced (20-80% / 20-60%)
- [ ] Preview and chat are mutually exclusive
- [ ] Editor width adjusts correctly
- [ ] Back button returns to lesson
- [ ] Session authentication works
- [ ] Code changes don't clear chat history

## Future Enhancements

### Potential Features

1. **Split Mode**: Show preview AND chat simultaneously (3-panel layout)
2. **Code Suggestions**: AI can propose code changes directly in editor
3. **Voice Input**: Ask questions via voice in chat
4. **History**: Save chat conversations for later review
5. **Hints System**: Progressive hints without full answers
6. **Peer Comparison**: Anonymous comparison with other students
7. **Export Chat**: Download conversation as markdown/PDF

### Performance Optimizations

1. **Lazy Load Chat**: Only render LessonChat when opened
2. **Debounce Resize**: Reduce reflows during drag
3. **Virtual Scrolling**: For long chat histories
4. **Code Diff**: Show what changed since last check

## Conclusion

This enhancement transforms the Code Playground from a static learning tool into an interactive, conversational coding environment. Students can now learn through dialogue with an AI tutor that understands their code and provides personalized guidance.
