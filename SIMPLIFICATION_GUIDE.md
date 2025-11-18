# 🎓 Hướng Dẫn Đơn Giản Hóa Chatbot

## ✅ Những điều BẮT BUỘC phải hiểu (4 phần chính)

### 1. **Tích hợp AI** (`lib/ai/`)

**Các file:**

- `lib/ai/providers.ts` - Cách kết nối AI (Gemini API)
- `lib/ai/prompts.ts` - Prompt hệ thống điều khiển hành vi AI
- `lib/ai/models.ts` - Danh sách các mô hình AI

**Cần làm:**

```typescript
// Trong lib/ai/prompts.ts - Thay đổi nội dung này cho chatbot giáo dục IT:
export const regularPrompt = `Bạn là chuyên gia hướng dẫn IT, tập trung vào:
- Kiến thức lập trình cơ bản (Python, JavaScript, Java, C++)
- Web development (HTML, CSS, React, Node.js)
- Best practices trong phát triển phần mềm
- Thiết kế database và SQL
- Các khái niệm khoa học máy tính

Khi giải thích:
1. Bắt đầu bằng giải thích rõ ràng, đơn giản
2. Cung cấp ví dụ code thực tế
3. Chia nhỏ các chủ đề phức tạp
4. Dùng ví dụ so sánh để giải thích khái niệm trừu tượng
5. Bao gồm best practices và ứng dụng trong thực tế

Luôn format code đúng chuẩn với syntax highlighting.`;
```

### 2. **Chat Component** (`components/chat.tsx`)

**Công dụng:** Giao diện chat chính, xử lý gửi/nhận tin nhắn  
**Hàm quan trọng:**

- `sendMessage()` - Gửi tin nhắn đến AI
- `messages` - Mảng tin nhắn
- `status` - Trạng thái loading/idle

### 3. **Database Schema** (`lib/db/schema.ts`)

**Các bảng cốt lõi:**

- `user` - Tài khoản người dùng
- `chat` - Phiên chat
- `message` - Tin nhắn
- `vote` - Feedback vote

**Có thể bổ sung chủ đề học tập:**

```typescript
export const itProgress = pgTable("ITProgress", {
  id: uuid("id").primaryKey(),
  userId: uuid("userId").references(() => user.id),
  topic: text("topic").notNull(), // ví dụ: "Python Basics"
  level: integer("level").notNull(), // độ khó 1-5
  completed: boolean("completed").default(false),
  quizScores: json("quizScores"),
  lastAccessed: timestamp("lastAccessed"),
});
```

### 4. **API Route** (`app/(chat)/api/chat/route.ts`)

**Công dụng:**

- Nhận request chat
- Gọi AI provider
- Stream phản hồi về client
- Lưu vào database

---

## 🟡 Những thứ CÓ THỂ giữ lại (Hữu ích)

### **Artifacts System**

(`components/code-editor.tsx`, `components/text-editor.tsx`)

**Lý do giữ:** Học sinh có thể học bằng cách viết và sửa code trực tiếp

### **Sidebar** (`components/app-sidebar.tsx`)

**Lý do giữ:** Theo dõi lịch sử học và khóa học

### **Authentication** (`app/(auth)`)

**Lý do giữ:** Lưu tiến độ học tập

---

## 🔴 Những thứ NÊN GỠ BỎ (Quá phức tạp)

### **Xóa toàn bộ:**

1. **`artifacts/`** - nếu không cần code editor
2. **`lib/ai/tools/`** - công cụ AI nâng cao (thời tiết, web search…)
3. **`components/enhanced-message-actions.tsx`** - feedback phức tạp
4. **`lib/ai/feedback-loop.ts`** - phân tích nâng cao (có thể đơn giản hóa)

### **Đơn giản hóa kiểu tin nhắn:**

Hiện có: text, image, file, code block  
Đối với IT: chỉ cần **text + code block**

### **Loại bỏ các tính năng phức tạp khác:**

- `components/voting-demo.tsx`
- `components/feedback-analytics.tsx`
- Các bảng DB không cần thiết:
  - `responseFeedback`
  - `userPreferences`
  - `responseAnalytics`

---

## 🎯 Lộ trình học đề xuất

### **Tuần 1: Hiểu phần lõi**

1. Đọc `lib/ai/providers.ts`
2. Đọc `lib/ai/prompts.ts`
3. Đọc `components/chat.tsx`
4. Đọc `app/(chat)/api/chat/route.ts`

### **Tuần 2: Tùy chỉnh**

1. Chỉnh `lib/ai/prompts.ts`
2. Đơn giản hóa `lib/db/schema.ts`
3. Tùy chỉnh hiển thị tin nhắn cho code

### **Tuần 3: Tính năng nâng cao**

1. Thêm quizzes & tracking tiến độ
2. Thêm khóa học theo module
3. Thêm chạy code (tùy chọn)

---

## 📝 Quick Start

### Bước 1: Nắm 4 file chính

```
1. lib/ai/providers.ts
2. lib/ai/prompts.ts
3. components/chat.tsx
4. app/(chat)/api/chat/route.ts
```

### Bước 2: Chỉnh Prompt

### Bước 3: Gỡ bớt tính năng

### Bước 4: Bổ sung tính năng giáo dục IT

---

## 🔧 Chức năng từng file

| File                           | Vai trò             | Cần hiểu?   |
| ------------------------------ | ------------------- | ----------- |
| `lib/ai/providers.ts`          | Kết nối AI (Gemini) | ✅ Có       |
| `lib/ai/prompts.ts`            | Điều khiển AI       | ✅ Có       |
| `components/chat.tsx`          | UI chat             | ✅ Có       |
| `app/(chat)/api/chat/route.ts` | Xử lý API           | ✅ Có       |
| `lib/db/schema.ts`             | Cấu trúc database   | ⚠️ Một phần |
| `components/messages.tsx`      | Hiển thị tin nhắn   | ⚠️ Có thể   |
| `artifacts/*`                  | Code editor         | ❌ Không    |
| `lib/ai/tools/*`               | Công cụ AI nâng cao | ❌ Không    |

---

## 💡 Mẹo hay

1. Tập trung 4 phần chính trước
2. Chỉnh prompt để thay đổi hành vi AI nhanh nhất
3. Xóa thứ không cần dùng
4. Cải tiến theo từng bước
5. Prompt tốt = Chatbot thông minh

---

## 🎓 Tổng kết

**BẮT BUỘC hiểu:**

- AI integration
- UI chat flow
- DB cơ bản

**Có thể gỡ bỏ:**

- Artifact system phức tạp
- AI tools nâng cao
- Feedback analytics

**Tùy chỉnh chính:**

- `lib/ai/prompts.ts`
- Bảng DB cho IT Progress

**Không cần quá đào sâu:**

- Mọi component
- Authentication nâng cao
- Streaming nâng cao

---

**Ước tính thời gian:**

- Hiểu core: 1-2 tuần
- Tùy chỉnh IT: 1 tuần
- Dọn project: 2-3 ngày

**Tổng thời gian: ~3-4 tuần để có chatbot giáo dục IT hoàn chỉnh**
