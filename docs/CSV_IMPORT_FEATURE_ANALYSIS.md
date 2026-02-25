# Khảo sát hiện trạng & đặc tả đã chốt cho tính năng import CSV worklog

## 1) Hiện trạng hệ thống (đã có)

### 1.1 Kiến trúc tổng thể
- Backend dùng NestJS, chia module theo domain (`project`, `member`, `screen-function`, `task-workflow`, `metrics`, `report`, `commentary`, `iam`, ...).
- Frontend dùng React + TanStack Router + TanStack Query; API tập trung tại `frontend/src/services/api.ts`.

### 1.2 Luồng sử dụng hiện tại (người dùng)
1. **Đăng nhập / phân quyền**: hệ thống kiểm tra auth, force đổi mật khẩu, hiển thị menu theo quyền.
2. **Quản lý project**: xem danh sách project, vào màn hình chi tiết project theo tab.
3. **Trong project detail**: có các tab chính như overview, timeline, stages, screen functions, members, task workflow, metric summary, settings.
4. **Task workflow**: quản lý stage/step, gán screen function vào step, cập nhật trạng thái theo từng step, xuất Excel theo ma trận workflow.
5. **Báo cáo & metrics**: tính toán metrics realtime/cho report, hiển thị dashboard/báo cáo.

### 1.3 Điểm mạnh sẵn có để tái sử dụng
- Đã có đầy đủ entity/endpoint liên quan đến **stage/step/screen function/member** nên có thể map worklog CSV trực tiếp vào mô hình hiện có.
- Đã có pattern UI “import + chọn record trước khi xác nhận”.
- Đã có endpoint export (Excel) ở `task-workflow`, có thể mở rộng thêm export CSV cho record không nhập.

### 1.4 Khoảng trống hiện tại
- Chưa có endpoint/parser CSV worklog.
- Chưa có cơ chế “gợi ý stage/step theo workDetail”.
- Chưa có “preview + chọn/bỏ chọn” trước khi ghi vào hệ thống.
- Chưa có nơi lưu/đối chiếu lịch sử import (đã nhập/chưa nhập/lỗi map).

---

## 2) Yêu cầu đã chốt với business
1. CSV thực tế **luôn đầy đủ cột**: `day, fullName, email, phase_name, workDetail, workTime, minutes`.
2. Nếu `email` không khớp member của project hiện tại => **bỏ qua record** (không map qua user ngoài project).
3. Dữ liệu import ghi chính vào thực thể **`StepScreenFunctionMember`**.
4. **Không chống nhập trùng** ở phiên bản đầu.
5. Rule map stage/step phải **cấu hình được ngay từ UI** ở phiên bản đầu.

---

## 3) Thiết kế MVP

### 3.1 Chuỗi xử lý
1. Upload CSV
2. Parse + chuẩn hoá
3. Map `memberId` + `stageId/stepId` theo rule
4. Preview (ready / needs_review / unmapped)
5. User chọn record để import
6. Commit vào `StepScreenFunctionMember`
7. Export CSV phần không chọn / không map được

### 3.2 Mapping rule
- **Member**: match theo email trong danh sách member của project.
- **Work time**:
  - ưu tiên `minutes`
  - fallback parse `workTime` (`H:mm`)
  - `effortDays = minutes / 60 / workingHoursPerDay`
- **Stage/step từ `workDetail`**:
  - dùng dictionary rule theo project
  - mỗi rule có: keyword -> stageId + stepId + priority + isActive
  - chọn rule có điểm/priority cao nhất

### 3.3 Data model đề xuất
- `worklog_import_batch`
  - id, projectId, uploadedBy, sourceFileName, createdAt
- `worklog_import_item`
  - batchId, rawRowJson, normalized fields,
  - suggested member/stage/step,
  - confidence, isSelected,
  - importStatus (`pending/committed/skipped/error`), errorReason

### 3.4 API mục tiêu
- `POST /task-workflow/worklog-import/preview`
- `POST /task-workflow/worklog-import/commit`
- `GET /task-workflow/worklog-import/:batchId/unselected/export`
- `GET /task-workflow/worklog-import/:batchId`

### 3.5 UI mục tiêu
1. Upload CSV
2. Preview + filter trạng thái
3. Cho chỉnh tay mapping
4. Confirm import
5. Export unselected

---

## 4) Phần đã triển khai trong PR này
Đã bổ sung API backend/frontend để **quản lý rule map stage/step theo project** (nền tảng cho yêu cầu “cấu hình được từ UI”):

- **Backend**
  - Model `worklog_mapping_rules`
  - CRUD endpoint:
    - `GET /task-workflow/worklog-mapping-rules/project/:projectId`
    - `POST /task-workflow/worklog-mapping-rules`
    - `PUT /task-workflow/worklog-mapping-rules/:id`
    - `DELETE /task-workflow/worklog-mapping-rules/:id`
- **Frontend API client**
  - Thêm method tương ứng trong `taskWorkflowApi`

