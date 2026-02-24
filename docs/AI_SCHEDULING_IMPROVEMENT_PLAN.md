# Rút ngắn quy trình AI Scheduling: từ 12 bước xuống 3 bước

## Context

Hệ thống PCQM có tính năng AI Scheduling (GPT-4o) để ước tính effort và lập lịch tự động. Tuy nhiên, quy trình hiện tại quá phức tạp: **12 bước thủ công**, phải chuyển qua nhiều tab, và phải lặp lại thao tác cho từng stage. User yêu cầu đơn giản hóa quy trình.

**Quy trình hiện tại (12 bước):**
1. Tạo project → 2. Cấu hình settings → 3. Thêm members → 4. Thêm screen functions → 5. Initialize workflow (thủ công) → 6. Quick link screen functions (thủ công) → 7. Mở Stages tab → 8. Mở AI dialog + check prerequisites → 9. Run estimation + apply → 10. Chuyển Schedule tab + chọn stage → 11. Run schedule + apply → 12. Lặp lại bước 10-11 cho từng stage

**Quy trình mục tiêu (3 bước):**
1. Tạo project (auto-init workflow) → 2. Thêm members + screen functions (auto-link) → 3. Click "AI Plan Everything" (1 nút duy nhất)

---

## Phase 1: Auto-Initialize Workflow + Auto-Link (Bỏ bước 5-6)

### 1.1 Backend: Auto-init khi tạo project

**Sửa**: `backend/src/modules/project/project.service.ts`
- Trong method `create()`, sau khi tạo project + settings, gọi thêm `taskWorkflowService.initializeProjectWorkflow({ projectId })`
- Inject `TaskWorkflowService` vào `ProjectService` dùng `@Inject(forwardRef(() => TaskWorkflowService))`

**Sửa**: `backend/src/modules/project/project.module.ts`
- Thêm import `TaskWorkflowModule` (dùng forwardRef)

### 1.2 Backend: Auto-link khi tạo screen function

**Sửa**: `backend/src/modules/screen-function/screen-function.service.ts`
- Trong method `create()`, sau khi tạo screen function, kiểm tra project đã có stages chưa
- Nếu có → gọi `taskWorkflowService.linkScreenFunctionToAllStages(projectId, screenFunctionId)` để tự động tạo StepScreenFunction records

**Sửa**: `backend/src/modules/task-workflow/task-workflow.service.ts`
- Thêm method `linkScreenFunctionToAllStages(projectId, screenFunctionId)`:
  - Lấy tất cả stages của project → lấy tất cả steps → tạo StepScreenFunction cho mỗi step × screen function
  - Pattern tương tự `quickLinkByType()` nhưng cho 1 screen function thay vì tất cả

### 1.3 Frontend: Cập nhật UI

**Sửa**: `frontend/src/components/task-workflow/WorkflowConfigPanel.tsx`
- Nút "Initialize Workflow" vẫn giữ cho backward compatibility (project cũ)
- Thêm thông báo: "Workflow đã được tự động khởi tạo khi tạo project"

---

## Phase 2: "AI Plan Everything" (Gộp bước 7-12 thành 1 bước)

### 2.1 Backend: Endpoint mới `planAll()`

**Tạo mới**: `backend/src/modules/task-workflow/ai-plan-all.dto.ts`

**Sửa**: `backend/src/modules/task-workflow/ai-scheduling.service.ts`
- Thêm method `planAll(dto)` — orchestrator gọi tuần tự:
  1. `estimateEffort()` → `applyEstimation()`
  2. `estimateStageEffort()` → `applyStageEstimation()`
  3. Loop qua tất cả stages → `generateSchedule()` → `applySchedule()`
- Return kết quả gộp: `{ estimation, stageEstimation, schedules[], summary }`

**Sửa**: `backend/src/modules/task-workflow/task-workflow.controller.ts`
- Thêm endpoint `POST /task-workflow/ai/plan-all`

### 2.2 Frontend: Dialog "AI Plan Everything" mới

**Tạo mới**: `frontend/src/components/ai/AIPlanAllDialog.tsx`
- **Phase 1 - Preflight Check**: Checklist prerequisites với inline fix forms
- **Phase 2 - Processing**: Stepper/progress bar
- **Phase 3 - Review + Apply**: Accordion với kết quả gộp

### 2.3 Frontend: Tích hợp nút mới

**Sửa**: `frontend/src/routes/projects.$projectId.tsx`
- Nút chính: "AI Plan Everything" → mở AIPlanAllDialog
- Nút phụ: "Advanced AI Options" → mở AISchedulingDialog (giữ nguyên cho power users)

---

## Phase 3: Inline Quick Setup (Bỏ vòng lặp prerequisites fail)

### 3.1 Backend: Endpoint quick-setup

**Sửa**: `backend/src/modules/project/project.controller.ts` + `project.service.ts`
- `POST /projects/:id/quick-setup` — Tạo members + screen functions hàng loạt với smart defaults

### 3.2 Frontend: Inline forms trong dialog

- `QuickAddMembers`: Form inline nhỏ gọn (Name + Role dropdown)
- `QuickAddScreenFunctions`: Textarea paste nhiều tên
- Khi prerequisite thiếu → hiển thị inline form thay vì icon đỏ

---

## Files tạo mới (2 files)

| File | Mục đích |
|------|---------|
| `backend/src/modules/task-workflow/ai-plan-all.dto.ts` | DTO cho endpoint plan-all |
| `frontend/src/components/ai/AIPlanAllDialog.tsx` | Dialog "AI Plan Everything" mới |

## Files sửa (9 files)

| File | Thay đổi |
|------|---------|
| `backend/src/modules/project/project.service.ts` | +auto-init workflow, +quickSetup() |
| `backend/src/modules/project/project.controller.ts` | +endpoint quick-setup |
| `backend/src/modules/project/project.module.ts` | +import TaskWorkflowModule |
| `backend/src/modules/screen-function/screen-function.service.ts` | +auto-link |
| `backend/src/modules/task-workflow/ai-scheduling.service.ts` | +planAll() |
| `backend/src/modules/task-workflow/task-workflow.service.ts` | +linkScreenFunctionToAllStages() |
| `backend/src/modules/task-workflow/task-workflow.controller.ts` | +endpoint plan-all |
| `frontend/src/services/api.ts` | +2 methods |
| `frontend/src/routes/projects.$projectId.tsx` | +AI Plan Everything button |

## Thứ tự triển khai

1. **Phase 1** → 2. **Phase 2** → 3. **Phase 3**

## Kết quả: 12 bước → 3 bước (giảm 75%), backward compatible
