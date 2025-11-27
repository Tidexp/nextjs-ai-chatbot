# 🧠 Cơ Chế Hoạt Động Các Function Chính

Tài liệu này mô tả cơ chế hoạt động (inputs, outputs, side-effects, error handling) của các hàm quan trọng trong hệ thống chatbot học lập trình. Tập trung vào luồng xử lý chat, provider AI, quản lý artifact, hook trạng thái và vòng phản hồi chất lượng.

## Mục Lục

1. Tổng Quan Kiến Trúc
2. Nhóm Hàm Provider AI (`lib/ai/providers.ts`)
3. Model & Entitlement (`lib/ai/models.ts`, `lib/ai/entitlements.ts`)
4. API Route Chat (`app/(chat)/api/chat/route.ts`)
5. Component Chat (`components/chat.tsx`)
6. Hooks Artifact (`hooks/use-artifact.ts`)
7. Hook Tin Nhắn (`hooks/use-messages.tsx`)
8. Vòng Phản Hồi & Cá Nhân Hóa (`lib/ai/feedback-loop.ts`)
9. Utils (`lib/utils.ts`)
10. Artifact Actions Server (`artifacts/actions.ts`)
11. Mở Rộng & Thêm Mô Hình Mới

---

## 1. Tổng Quan Kiến Trúc

Luồng chính: UI gửi yêu cầu → `/api/chat` chuẩn hoá & kiểm tra → gọi provider (Gemini / CodeLlama) qua `streamText` hoặc custom streaming → stream token trả về UI → lưu message assistant vào DB sau khi kết thúc stream (sử dụng `after()` / resumable stream context) → hiển thị artifact / phân tích / phản hồi người dùng.

Các lớp trọng tâm:

- UI: `Chat` component quản lý state cục bộ (messages, stream, abort, regenerate).
- API: route `/api/chat` lo validate, entitlement, lưu DB, ghép system prompt, gọi model.
- Provider: hàm adapter chuẩn hoá định dạng message và gọi API model thực tế (Gemini, FastAPI CodeLlama tự host).
- Hooks: quản lý scroll, artifact state, grouping messages.
- Feedback loop: phân tích preference & chất lượng để tạo system prompt cá nhân hoá.

---

## 2. Nhóm Hàm Provider AI (`lib/ai/providers.ts`)

### `convertToGoogleFormat(messages, limit)`

- Input: cấu trúc messages từ Vercel AI SDK (có thể dạng `{ messages: [...] }` hoặc array).
- Xử lý: lọc system message; chuyển phần còn lại thành định dạng `contents` gồm các `parts` (text, inlineData image/pdf/txt). Giới hạn số lượng tin nhắn cuối theo `limit`.
- Side-effects: log chi tiết, validate cấu trúc, fetch dữ liệu ảnh/tệp từ URL hoặc data URI, encode base64.
- Output: `{ systemInstruction?, contents }` phục vụ Gemini API.
- Lỗi: ném `Error` nếu format sai (không có role/content hợp lệ).

### `streamGemini(model, options)`

- Chuẩn bị payload với temperature, maxOutputTokens, topP.
- Gọi `ai.models.generateContentStream` với retry (503) exponential backoff.
- Trả về `ReadableStream` tự enqueue các sự kiện kiểu `{ type: 'text-delta', delta }` và cuối cùng `{ type: 'finish' }`.
- Error: phát sự kiện `{ type: 'error' }` và `controller.error()`.

### `callGemini(model, options)`

- Gọi sinh nội dung không streaming qua `ai.models.generateContent`.
- Trích `response.candidates[0].content.parts[0].text` và metadata token.
- Output: `{ content: [{type:'text', text}], usage, finishReason }`.

### `streamCodeLlama(model, options)` / `callCodeLlama(model, options)`

- Trích prompt từ tin nhắn cuối (parts hoặc string).
- POST tới `CODELLAMA_API_URL/generate` (FastAPI backend tự host).
- Auto-detect pattern code (regex các từ khóa) → nếu chưa có `markdown` thì wrap vào code fence với ngôn ngữ suy đoán từ prompt.
- `streamCodeLlama`: giả lập chunk nhỏ (10 ký tự) để tạo hiệu ứng streaming; tổng kết bằng sự kiện finish.
- Error: nếu `response.ok` false hoặc `data.success` false thì throw.

### `myProvider`

- Định nghĩa mapping `languageModels` cho từng `modelId` → chỉ định `doGenerate` và `doStream` tương ứng hàm adapter ở trên.
- Dùng trong route `/api/chat` qua `streamText({ model: myProvider.languageModel(id), messages })`.

---

## 3. Model & Entitlement

### `chatModels`

Danh sách các mô hình khả dụng (id, name, description). Dùng để hiển thị selector và validate model.

### `entitlementsByUserType`

- Chứa quota `maxMessagesPerDay` và list `availableChatModelIds` cho từng loại user (`guest`, `regular`).
- Dùng ở route `/api/chat` để chặn truy cập model không được phép hoặc vượt giới hạn.

---

## 4. API Route Chat (`app/(chat)/api/chat/route.ts`)

### `getStreamContext()`

- Khởi tạo context resumable stream nếu có REDIS; fallback nếu thiếu env. Lưu global singleton.

### `convertSchemaMessagesToUIMessages(messages)`

- Chuẩn hoá messages từ schema thành dạng nội bộ (mảng parts: text/image/file/pdf/txt).
- Bỏ qua part không hợp lệ bằng filter null.

### `POST(request)` – Luồng xử lý chính

1. Parse body → chuẩn hoá `content` về array parts.
2. Kiểm tra session user; lấy entitlement → validate model & quota.
3. Xác định `chatId` (từ body hoặc tạo mới) → kiểm tra quyền sở hữu.
4. Tải message hiện có từ DB để tránh lưu trùng ID.
5. Lesson context (nếu có) → tạo/ghi đè system message đầu tiên bằng `systemPrompt()`.
6. Lưu chat mới (nếu chưa tồn tại) rồi lưu các user messages mới.
7. Chuẩn hoá lại mảng message cho provider (`promptMessages`).
8. Tạo `messageId` assistant trước streaming.
9. Gọi `streamText()` với provider tương ứng model.
10. Dùng `TransformStream` tích lũy text trả về đồng thời stream xuống client.
11. Sau flush dùng `after()` để lưu assistant message vào DB (tính bền vững sau khi response kết thúc).
12. Response: body là stream text/plain + header `X-Message-Id`.

### Error Handling

- Dùng `ChatSDKError` với mã chuẩn (`bad_request:api`, `forbidden:chat`, `rate_limit:chat`, `unauthorized:chat`).
- Bất thường khác => `bad_request:api`.

---

## 5. Component Chat (`components/chat.tsx`)

### `sendMessage(message)`

- Tạo user message (UUID) → push vào state `messages`.
- POST `/api/chat` với `{ chatId, model, messages:[{id,role,content(parts)}] }`.
- Đọc stream body qua reader → ghép chunk vào assistant message cuối cùng.
- Hoàn tất: cập nhật sidebar history (mutate) + dispatch event `chatCreated`.
- Abort support qua `AbortController`.

### `stop()`

- Gọi `abortControllerRef.current.abort()` nếu đang streaming → đặt lại trạng thái.

### `regenerate({ messageId? })`

- Xác định assistant message cần tạo lại (tham số hoặc cuối cùng).
- Tìm user message đứng trước → cắt state đến đó → gửi lại toàn bộ ngữ cảnh trước user đó → stream assistant mới.
- Lưu & cập nhật UI tương tự `sendMessage`.

Trạng thái chính: `status` = `ready | submitted | streaming`. Quản lý disable input và hiển thị đang tải.

---

## 6. Hooks Artifact (`hooks/use-artifact.ts`)

### `initialArtifactData`

State mặc định artifact trước khi AI sinh ra nội dung.

### `useArtifactSelector(selector)`

- Lấy state artifact từ SWR key `artifact` (fallback). Áp dụng selector để tối ưu re-render.

### `useArtifact()`

- Trả về `{ artifact, setArtifact, metadata, setMetadata }`.
- `setArtifact(updater)` hỗ trợ truyền trực tiếp object hoặc hàm updater.
- Metadata tách riêng theo key động `artifact-metadata-${documentId}`.

---

## 7. Hook Tin Nhắn (`hooks/use-messages.tsx`)

### `useMessages({ chatId, status })`

- Quản lý refs scroll, trạng thái đã gửi tin nhắn (`hasSentMessage`).
- Khi đổi `chatId` → scroll xuống cuối ngay lập tức.
- Khi status chuyển `submitted` → đặt `hasSentMessage=true` (phục vụ hiệu ứng UI).

---

## 8. Vòng Phản Hồi & Cá Nhân Hóa (`lib/ai/feedback-loop.ts`)

### `generateUserContext(userId)`

- Song song lấy `preferences` và `qualityMetrics` từ DB.
- Tính `averageQuality`, trích `commonIssues`, suy luận style ưa thích.
- Fallback an toàn nếu lỗi.

### `generatePersonalizedSystemPrompt(userContext)`

- Xây dựng chuỗi prompt hệ thống dựa vào preference: response_style, detail_level, tone, chất lượng.
- Chèn hướng dẫn cải thiện nếu chất lượng thấp.

### `generateFeedbackInsights(userContext)`

- Kết hợp preferences + qualityHistory → gợi ý nâng cao: system prompt cá nhân hoá + mảng enhancement.

### `updatePreferencesFromFeedback(userId, feedback, messageContent)`

- Phân tích nội dung message (regex kỹ thuật, độ dài, biểu hiện conversational).
- Dựa vào vote/up/down + lý do downvote → cập nhật preference với confidence.
- Import động `updateUserPreference` để giảm chi phí tải ban đầu.

---

## 9. Utils (`lib/utils.ts`)

| Hàm                           | Chức Năng Chính                                      |
| ----------------------------- | ---------------------------------------------------- |
| `cn`                          | Merge class tailwind tránh trùng lặp.                |
| `fetcher`                     | Generic fetch + chuyển lỗi API thành `ChatSDKError`. |
| `fetchWithErrorHandlers`      | Bắt offline + chuyển lỗi có cấu trúc.                |
| `getLocalStorage`             | Đọc JSON từ localStorage (browser check).            |
| `generateUUID`                | Sinh UUID pseudo theo pattern.                       |
| `getMostRecentUserMessage`    | Lấy user message cuối cùng.                          |
| `getDocumentTimestampByIndex` | Lấy timestamp tài liệu theo index an toàn.           |
| `getTrailingMessageId`        | Lấy ID message cuối cùng hoặc null.                  |
| `sanitizeText`                | Loại tag đặc biệt `<has_function_call>`.             |
| `convertToUIMessages`         | Map DBMessage → ChatMessage UI (parts + metadata).   |
| `getTextFromMessage`          | Ghép các part text thành một chuỗi.                  |

---

## 10. Artifact Actions Server (`artifacts/actions.ts`)

### `getSuggestions({ documentId })`

- Server action gọi DB query `getSuggestionsByDocumentId` → trả mảng suggestion (fallback `[]`).
- Dùng để hiển thị gợi ý refactor / cải tiến artifact.

---

## 11. Mở Rộng & Thêm Mô Hình Mới

Các bước tiêu chuẩn:

1. Thêm model vào `chatModels` (id, name, description).
2. Cập nhật entitlement nếu muốn user loại nào truy cập.
3. Viết hàm adapter tương tự `callX`, `streamX` (chuẩn hoá messages, gọi API, xử lý streaming, mã hoá dữ liệu hình ảnh nếu cần).
4. Thêm vào `myProvider.languageModels` với `doGenerate` / `doStream`.
5. Đảm bảo UI truyền đúng `model` khi POST `/api/chat`.
6. (Tuỳ chọn) Bổ sung logic auto-wrap code / hỗ trợ multimodal.

## 12. Ghi Chú Thiết Kế

- Phân tách phần tạo system prompt (topic + personalization) trước khi gửi tới provider giúp linh hoạt thay thế mô hình.
- Streaming Gemini dùng iterator gốc; CodeLlama tự streaming giả lập chunk để giả lập cảm giác real-time.
- Sử dụng `after()` đảm bảo lưu DB không chặn phản hồi SSE.
- Luồng regenerate tái sử dụng ngữ cảnh trước user message kích hoạt → tránh gửi lại toàn bộ lịch sử dài.

---

## 13. Module Topics & Lesson Content

### 14.1 Mục Tiêu

Quản lý cấu trúc học liệu: Topic → Module → Lesson. Cung cấp lesson context cho model để trả lời phù hợp chủ đề, đồng bộ tiến độ người dùng và cho phép quay lại bài học gần nhất.

### 14.2 Cấu Trúc Bảng (Schema)

| Bảng                | Vai Trò                  | Các Cột Chính                                         | Ghi Chú                                                                 |
| ------------------- | ------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `topic`             | Chủ đề gốc               | `id`, `slug`, `title`, `description`, `category`      | Dùng `slug` làm URL friendly.                                           |
| `topicModule`       | Module thuộc topic       | `id`, `topicId`, `title`, `order`                     | `order` xác định thứ tự hiển thị.                                       |
| `topicLesson`       | Bài học trong module     | `id`, `moduleId`, `title`, `type`, `order`, `content` | `content` là markdown/raw text. `type` (ví dụ: theory, exercise).       |
| `userTopicProgress` | Tiến độ chung theo topic | `id`, `userId`, `topicId`, `progress`, `lastAccessed` | Cập nhật khi người dùng học.                                            |
| `lessonProgress`    | Tiến độ từng lesson      | `userId`, `lessonId`, `lastAccessedAt`, `completedAt` | Composite key `(userId, lessonId)` dùng `onConflictDoUpdate` để upsert. |

### 14.3 Các Hàm Truy Vấn Chính (`lib/db/queries.ts`)

- `getTopics() / getTopicBySlug(slug)`: Lấy danh sách hoặc một topic.
- `getModulesByTopicId(topicId)`: Lấy modules theo thứ tự `order`.
- `getLessonsByModuleId(moduleId)`: Lấy lessons theo thứ tự.
- `getModulesAndLessonsByTopicId(topicId)`: Gom module + lessons nhóm theo `moduleId` (reduce) cho UI render cây.
- `trackLessonProgress({ userId, lessonId })`: Cập nhật `lastAccessedAt` (upsert).
- `markLessonComplete({ userId, lessonId })`: Đánh dấu hoàn thành và cập nhật thời gian.
- `getLastAccessedLesson({ userId, topicId })`: Lấy bài học gần nhất trong một topic.
- `getLastAccessedLessonsByUser({ userId })`: Trả về bài gần nhất mỗi topic (map by topicId).
- `getLessonContextByChatId({ chatId })`: Truy ngược từ chat → lesson → module → topic để tạo context (title, type, content, slug).

### 14.4 Luồng Dữ Liệu UI

1. Người dùng vào trang Topic (`/topics/[slug]`) → tải `topic` + modules + lessons bằng `getModulesAndLessonsByTopicId`.
2. Chọn một lesson → (tuỳ logic) tạo hoặc tìm chat liên kết (`chat.lessonId`), gọi `saveChat` nếu cần.
3. Khi gửi tin nhắn trong chat, API `/api/chat` gọi `getLessonContextByChatId` để lấy info, tạo system prompt có phần tóm tắt lesson.
4. Khi người dùng mở lại topic, có thể dùng `getLastAccessedLesson` để tự động highlight hoặc đề xuất tiếp tục.
5. Tiến độ lesson cập nhật qua `trackLessonProgress` mỗi lần truy cập; khi hoàn thành gọi `markLessonComplete`.

### 14.5 Chèn Context Vào System Prompt

- Trong `POST /api/chat`, sau khi lấy `lessonContext`, hàm `systemPrompt(...)` được gọi với các tham số:
  - `topicTitle`, `moduleTitle`, `lessonTitle`, `lessonType`, `lessonContent.slice(0, 500)` để tránh prompt quá dài.
- Nếu chưa có system message: prepend một system message mới.
- Nếu đã tồn tại: ghi đè nội dung parts của system message đầu.
- Giúp mô hình trả lời phù hợp phạm vi bài học, tránh lan man.

### 14.6 Phân Tích & Hiển Thị Markdown Lesson

Hiện tại lesson `content` được lưu thẳng trong cột `topicLesson.content`. Khi render:

- Component trang bài học (ví dụ page lesson) đọc `lessonContent` và hiển thị dạng markdown (có thể dùng MDX / markdown parser nếu tích hợp; nếu chưa, hiển thị raw hoặc qua một component chuyển đổi).
- Đề xuất mở rộng: tiền xử lý (pre-processing) để:
  - Trích đoạn code → highlight.
  - Tạo mục lục (TOC) tự động bằng regex các heading `^#{1,6}`.
  - Tạo summary embedding để cung cấp context rút gọn cho mô hình (cache).

### 14.7 Đồng Bộ Chat & Navigation

- Mỗi chat có thể chứa `lessonId`, giúp tái tạo đúng context khi người dùng quay lại.
- Nút "Back to Topics" ở trang lesson cho phép quay về danh sách, không làm mất chat hiện tại.
- Có thể mở rộng: khi người dùng chuyển lesson khác trong cùng topic, hỏi xác nhận tạo chat mới hoặc tiếp tục chat cũ để giữ continuity.

### 13.8 (Lược bỏ phần mở rộng)

Chỉ giữ phần giới thiệu và cơ chế chính. Các chiến lược mở rộng, bảo vệ, tối ưu hoá và tóm tắt nhanh đã được lược bỏ theo yêu cầu.
