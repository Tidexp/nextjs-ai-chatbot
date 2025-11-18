
# 📁 Tổng quan cấu trúc dự án & Hướng dẫn đọc file quan trọng

Đây là bản giải thích dễ hiểu để biết **mình cần mò ở đâu khi vô dự án này**.

---

## 🏗 Cấu trúc dự án chính

```
nextjs-ai-chatbot-main/
├── app/                          # Next.js App Router
├── components/                   # React components
├── lib/                          # Thư viện & logic dùng chung
├── hooks/                        # Custom React hooks
├── scripts/                      # Script tiện ích
├── tests/                        # Test E2E
├── artifacts/                    # Xử lý các loại "artifact" (code, ảnh...)
└── public/                       # Static assets
```

---

## 📌 Giải thích từng folder

### **app/** — Trung tâm của ứng dụng Next.js App Router

Có các route group chính:

- **(auth)** — Đăng nhập, đăng ký, quản lý session
- **(chat)** — Trang chat chính, xem lịch sử, analytics
- **api/** — API endpoints
- Root layout, cấu hình global: `layout.tsx`, `globals.css`, favicon

✅ Đây là nơi **hành vi giao diện & routing** tập trung.

---

### **components/** — Các React UI component tự chế

Gồm:

- **ui/** — Component cơ bản lấy từ shadcn (button, sheet, card...)
- **elements/** — Render tin nhắn: code blocks, reasoning, hình ảnh...
- **artifact components** — Editor và viewer cho code/ảnh/text/bảng
- **auth** — UI đăng nhập & đăng ký
- **sidebar** — Thanh điều hướng

✅ Khi muốn sửa UI hay style → **quẹo vô đây**.

---

### **lib/** — Logic backend mini + AI + Database

- **ai/**: models, prompts, providers, công cụ AI
- **db/**: schema Drizzle ORM, migrations, CRUD helpers
- **editor/**: cấu hình ProseMirror (editor văn bản)
- `constants.ts`, `utils.ts`

✅ Đây là **não bộ** của dự án: AI, DB, config.

---

### **hooks/** — Custom React hooks cực hữu dụng

Ví dụ:

- `use-messages` — Quản lý tin nhắn trong chat
- `use-artifact` — Quản lý artifact (code, ảnh...)
- `use-scroll-to-bottom` — Auto scroll khi chat
- `use-mobile` — Detect mobile

✅ Muốn biết state chat hoạt động sao → vô đây soi.

---

### **artifacts/** — Xử lý các loại nội dung đặc biệt

- **code**: Highlight, chạy code
- **image**: Chỉnh sửa
- **sheet**: Bảng dữ liệu
- **text**: Rich text

⚠️ Phức tạp, chỉ mò nếu **cần tính năng editor**.

---

### **scripts/** — Script hỗ trợ dev/test

Ví dụ:

- Test kết nối DB
- Tạo chat test
- Test guest user

💡 Chỉ dùng khi debug backend.

---

### **tests/** — Playwright E2E test

- Test UI
- Test API
- Test hành vi hệ thống

✅ Có thể bỏ thời gian tìm hiểu sau cùng.

---

### **public/** — Static files

- Ảnh
- Icon
- Fonts

😌 Không có gì hack não.

---

## 🎯 Kết luận cho người mới vào dự án

| Nơi cần tập trung | Lý do |
|------------------|------|
| `app/(chat)`     | Giao diện chat chính |
| `lib/ai/`        | Prompts, models điều khiển AI |
| `lib/db/`        | Lưu trữ tin nhắn, user |
| `components/chat`| UI nhập & hiển thị tin nhắn |

Những thứ có thể **để dành sau**:

- `artifacts/`
- `tests/`
- Tool nâng cao trong `lib/ai/tools/*`

---

## ✅ Checklist để hiểu dự án

1. Mở `app/(chat)/page.tsx`: luồng UI chat
2. Mở `app/(chat)/api/chat/route.ts`: tin nhắn đi đâu về đâu
3. Mở `lib/ai/prompts.ts`: AI được huấn luyện như thế nào
4. Mở `lib/db/schema.ts`: dữ liệu được lưu ra sao

**Nắm vững 4 thứ trên là bạn đã điều khiển được con AI này rồi.**

---

Nếu ăng bếu cần phiên bản **tối giản** dùng cho giáo dục IT hay chatbot đơn giản hơn, em cũng cân luôn.
