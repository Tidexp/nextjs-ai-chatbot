# Hướng Dẫn Sử Dụng Hệ Thống Quản Lý Dự Án Agile

## Giới Thiệu

Hệ thống Agile Project Management (APM) là một nền tảng hiện đại được thiết kế để giúp các đội ngũ quản lý dự án theo phương pháp Agile. Hệ thống này hỗ trợ Scrum, Kanban, và các phương pháp Agile khác.

## Các Tính Năng Chính

### 1. Sprint Planning

- **Thời gian Sprint:** 2 tuần (14 ngày)
- **Ngày bắt đầu:** Thứ Hai hàng tuần
- **Ngày kết thúc:** Thứ Năm của tuần thứ hai
- **Cuộc họp Planning:** 4 giờ cho dự án lớn, 2 giờ cho dự án nhỏ
- Mỗi thành viên có thể thêm từ 20-40 điểm công việc mỗi sprint

### 2. Backlog Management

- Tối đa 500 user stories trong backlog
- Ưu tiên: Critical (P0), High (P1), Medium (P2), Low (P3)
- Mỗi user story phải có:
  - Tiêu đề rõ ràng
  - Mô tả chi tiết
  - Tiêu chí chấp nhận
  - Ước tính điểm (1-13 theo Fibonacci)

### 3. Daily Standup

- **Thời gian:** 9:00 AM - 9:15 AM (15 phút)
- **Người tham gia:** Tất cả thành viên nhóm
- **Nội dung báo cáo:**
  - Đã làm được gì hôm qua
  - Kế hoạch hôm nay
  - Chặn thúc (nếu có)

### 4. Tracking & Monitoring

- **Velocity tracking:** Theo dõi tốc độ hoàn thành công việc
- **Burndown chart:** Biểu đồ giảm công việc hàng ngày
- **Cumulative flow:** Theo dõi luồng công việc
- **Lead time:** Thời gian từ request đến hoàn thành

## Quyền Hạn Vai Trò

### Scrum Master

- Quyền: Tạo sprint, chỉnh sửa backlog, xóa user stories
- Không quyền: Thay đổi cấu hình hệ thống, xóa dự án

### Product Owner

- Quyền: Quản lý backlog, ưu tiên user stories, phê duyệt kết quả
- Không quyền: Thay đổi cài đặt hệ thống

### Development Team

- Quyền: Cập nhật trạng thái task, thêm comments, tạo subtask
- Không quyền: Xóa user stories, thay đổi ưu tiên

### Stakeholder (View only)

- Quyền: Xem báo cáo, theo dõi tiến độ
- Không quyền: Chỉnh sửa bất kỳ thứ gì

## Trạng Thái Công Việc

1. **Backlog** - Chưa được lên kế hoạch
2. **Ready** - Sẵn sàng cho sprint tiếp theo
3. **In Progress** - Đang thực hiện
4. **In Review** - Chờ code review
5. **Testing** - Đang test
6. **Done** - Hoàn thành và đã merge

## Quy Trình Giải Quyết Vấn Đề

### Nếu gặp lỗi trong Development

1. Tạo bug ticket với mức độ ưu tiên
   - **Critical:** Hệ thống không hoạt động, dừng production
   - **High:** Tính năng chính bị hỏng, ảnh hưởng lớn
   - **Medium:** Tính năng phụ bị lỗi
   - **Low:** Lỗi nhỏ, không ảnh hưởng trải nghiệm
2. Assign cho developer phù hợp
3. Set deadline (thường là 24-48 giờ với Critical)
4. Theo dõi quá trình fix
5. Test lại sau khi fix hoàn thành

### Nếu vượt quá deadline

1. Thảo luận với Scrum Master
2. Có thể kéo dài sprint 1-2 ngày hoặc chuyển sang sprint tiếp theo
3. Phân tích nguyên nhân trong retrospective

## Các Số Liệu Quan Trọng

- **Velocity trung bình:** 40 điểm/sprint
- **Tỷ lệ thành công:** 85-90% user stories hoàn thành/sprint
- **Defect rate:** < 2% số user stories
- **Lead time trung bình:** 7-10 ngày
- **Cycle time trung bình:** 3-5 ngày
- **Team size:** 5-9 người/team

## Công Cụ Hỗ Trợ

- **Jira:** Quản lý backlog và tracking
- **Confluence:** Tài liệu dự án
- **Slack:** Giao tiếp nhóm
- **GitHub:** Quản lý code
- **Jenkins:** CI/CD pipeline

## Lịch Sinh Nhật Team

- Thành viên 1: 15/03 (Bảo hành đã kết thúc)
- Thành viên 2: 22/05 (Bảo hành 2 năm)
- Thành viên 3: 10/08 (Bảo hành 6 tháng)
- Thành viên 4: 03/11 (Bảo hành 1 năm)
- Thành viên 5: 28/12 (Bảo hành 3 tháng)

## Mục Tiêu Năm Nay

1. Tăng velocity lên 50 điểm/sprint (từ 40)
2. Giảm defect rate xuống 1% (từ 2%)
3. Giảm lead time xuống 5 ngày (từ 7-10)
4. Đạt tỷ lệ thành công 95% (từ 85-90%)
5. Tuyển thêm 2 developer mới

## Liên Hệ & Support

- **Scrum Master:** Nguyễn Văn A (ext. 123)
- **Product Owner:** Trần Thị B (ext. 124)
- **Tech Lead:** Phạm Văn C (ext. 125)
- **Support Team:** support@apm.company.com
