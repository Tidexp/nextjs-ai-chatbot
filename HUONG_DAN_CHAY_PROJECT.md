# 🚀 Hướng Dẫn Chạy Project - IT Education Chatbot

## 📋 Yêu Cầu Hệ Thống

- **Node.js**: phiên bản 18.x trở lên
- **pnpm**: package manager (hoặc npm/yarn)
- **PostgreSQL Database**: Neon hoặc bất kỳ PostgreSQL nào
- **Gemini API Key**: từ Google AI Studio

---

## 🔧 Bước 1: Cài Đặt Dependencies

### 1.1. Cài pnpm (nếu chưa có)

```bash
npm install -g pnpm
```

### 1.2. Cài đặt các packages

```bash
pnpm install
```

Hoặc nếu dùng npm:

```bash
npm install
```

---

## 🔑 Bước 2: Cấu Hình Environment Variables

### 2.1. Tạo file `.env`

Tạo file `.env` ở thư mục gốc project (copy từ `env.template`):

```bash
cp env.template .env
```

### 2.2. Cấu hình các biến môi trường

Mở file `.env` và điền các thông tin:

```env
# 1. Database Configuration (Neon PostgreSQL)
POSTGRES_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# 2. AI Configuration (Gemini API)
GEMINI_API_KEY=your_gemini_api_key_here

# 3. NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_string_here
NEXTAUTH_URL=http://localhost:3000

# 4. Optional: Redis (cho resumable streams - không bắt buộc)
# REDIS_URL=redis://localhost:6379
```

---

## 🗄️ Bước 3: Lấy Các API Keys

### 3.1. Lấy Gemini API Key

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập tài khoản Google
3. Click **"Create API Key"**
4. Copy API key và paste vào file `.env`:
   ```env
   GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 3.2. Tạo PostgreSQL Database (Neon - MIỄN PHÍ)

1. Truy cập: https://neon.tech
2. Đăng ký tài khoản miễn phí
3. Tạo project mới
4. Copy **Connection String** và paste vào file `.env`:
   ```env
   POSTGRES_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### 3.3. Tạo NextAuth Secret

Tạo một chuỗi ngẫu nhiên bằng lệnh:

```bash
openssl rand -base64 32
```

Hoặc online tại: https://generate-secret.vercel.app/32

Paste vào file `.env`:

```env
NEXTAUTH_SECRET=abc123xyz456randomsecretstring
```

---

## 🗃️ Bước 4: Chạy Database Migrations

### 4.1. Kiểm tra kết nối database

```bash
pnpm db:test
```

Nếu thành công, bạn sẽ thấy: `✅ Database connection successful`

### 4.2. Chạy migrations (tạo bảng trong database)

```bash
pnpm db:migrate
```

Hoặc:

```bash
npx tsx lib/db/migrate.ts
```

### 4.3. Xem database (tùy chọn)

```bash
pnpm db:studio
```

Drizzle Studio sẽ mở tại `https://local.drizzle.studio`

---

## ▶️ Bước 5: Chạy Project

### 5.1. Chạy development server

```bash
pnpm dev
```

Hoặc:

```bash
npm run dev
```

### 5.2. Mở trình duyệt

Truy cập: **http://localhost:3000**

---

## ✅ Bước 6: Kiểm Tra Hoạt Động

1. **Trang chủ** sẽ tự động tạo guest user và chuyển đến chat
2. **Gửi tin nhắn thử**: "Hello, bạn là ai?"
3. **Kiểm tra streaming**: AI sẽ trả lời từng từ một (streaming)

---

## 🛠️ Các Lệnh Hữu Ích

| Lệnh              | Mô tả                               |
| ----------------- | ----------------------------------- |
| `pnpm dev`        | Chạy development server (cổng 3000) |
| `pnpm build`      | Build project cho production        |
| `pnpm start`      | Chạy production build               |
| `pnpm db:migrate` | Chạy database migrations            |
| `pnpm db:studio`  | Mở Drizzle Studio để xem database   |
| `pnpm db:test`    | Test kết nối database               |
| `pnpm lint`       | Kiểm tra code style                 |

---

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi 1: `POSTGRES_URL is not defined`

**Nguyên nhân:** File `.env` chưa được tạo hoặc thiếu biến

**Giải pháp:**

```bash
# Kiểm tra file .env có tồn tại không
ls -la .env

# Nếu không có, tạo từ template
cp env.template .env
```

### Lỗi 2: `Failed to connect to database`

**Nguyên nhân:** Connection string sai hoặc database chưa được tạo

**Giải pháp:**

1. Kiểm tra lại connection string từ Neon
2. Đảm bảo có `?sslmode=require` ở cuối URL
3. Test kết nối: `pnpm db:test`

### Lỗi 3: `GEMINI_API_KEY is not defined`

**Nguyên nhân:** Chưa có Gemini API key

**Giải pháp:**

1. Lấy API key tại: https://aistudio.google.com/app/apikey
2. Thêm vào file `.env`

### Lỗi 4: `Module not found`

**Nguyên nhân:** Dependencies chưa được cài đặt

**Giải pháp:**

```bash
# Xóa node_modules và cài lại
rm -rf node_modules
pnpm install
```

### Lỗi 5: Port 3000 đã được sử dụng

**Giải pháp:**

```bash
# Chạy trên port khác
PORT=3001 pnpm dev
```

---

## 🎯 Tùy Chỉnh Cho IT Education

### 1. Thay đổi system prompt

File: `lib/ai/prompts.ts`

```typescript
export const regularPrompt = `Bạn là giáo viên IT chuyên nghiệp...`;
```

### 2. Thay đổi model mặc định

File: `lib/ai/models.ts`

```typescript
export const DEFAULT_CHAT_MODEL = "gemini-2.5-flash"; // Nhanh và rẻ
// hoặc
export const DEFAULT_CHAT_MODEL = "gemini-2.5-pro"; // Thông minh hơn
```

### 3. Tắt các tính năng không cần thiết

Để tạm thời tắt artifacts (code editor):

File: `components/chat.tsx` - Comment dòng:

```typescript
// <Artifact ... />
```

---

## 📊 Cấu Trúc Thư Mục Quan Trọng

```
nextjs-ai-chatbot-main/
├── .env                    ← TẠO FILE NÀY (quan trọng!)
├── app/
│   └── (chat)/
│       └── api/
│           └── chat/
│               └── route.ts   ← API endpoint chính
├── components/
│   └── chat.tsx            ← UI chat chính
├── lib/
│   ├── ai/
│   │   ├── providers.ts    ← Kết nối Gemini
│   │   ├── prompts.ts      ← System prompts (CHỈNH Ở ĐÂY)
│   │   └── models.ts       ← Danh sách models
│   └── db/
│       ├── schema.ts       ← Database schema
│       └── queries.ts      ← Database queries
└── package.json
```

---

## 🎓 Tóm Tắt Nhanh

### Setup nhanh trong 5 phút:

```bash
# 1. Clone/download project
cd nextjs-ai-chatbot-main

# 2. Cài dependencies
pnpm install

# 3. Tạo file .env
cp env.template .env

# 4. Lấy Gemini API key từ: https://aistudio.google.com/app/apikey
# 5. Tạo database miễn phí tại: https://neon.tech
# 6. Điền thông tin vào file .env

# 7. Chạy migrations
pnpm db:migrate

# 8. Chạy project
pnpm dev

# 9. Mở http://localhost:3000
```

---

## 🆘 Cần Trợ Giúp?

### Tài liệu tham khảo:

- **Next.js**: https://nextjs.org/docs
- **Gemini API**: https://ai.google.dev/docs
- **Neon Database**: https://neon.tech/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs

### Kiểm tra logs:

```bash
# Xem logs chi tiết khi chạy
pnpm dev

# Logs sẽ hiển thị trong terminal
```

---

**Chúc bạn thành công! 🎉**

Nếu gặp lỗi, hãy kiểm tra lại:

1. ✅ File `.env` đã được tạo
2. ✅ Các API keys đã đúng
3. ✅ Database connection string đã đúng
4. ✅ Dependencies đã được cài đặt (`node_modules` có tồn tại)
5. ✅ Port 3000 không bị chiếm dụng
