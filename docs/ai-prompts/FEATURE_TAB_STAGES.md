# Feature: Tab Stages - Task Workflow Management

## Overview

Thêm tab "Stages" trong Project Detail để quản lý các giai đoạn (Stages) từ Workflow Configuration. Mỗi Stage có thể liên kết với Screen/Functions và theo dõi tiến độ dựa trên effort và schedule.

## Yêu cầu chức năng

### 1. Tab Stages trong Project Detail

**Vị trí**: Thêm tab "Stages" trong trang Project Detail (song song với Phases tab, không thay thế)

**Hiển thị danh sách Stages dạng Grid với thông tin**:
- Stage Name
- Status (Good / Warning / At Risk)
- Progress (%)
- Planned Start Date / End Date
- Actual Start Date / End Date
- Estimated Effort / Actual Effort (hours)
- Steps Count
- Linked Screens Count

**Actions**:
- Click vào Stage → Navigate đến Stage Detail page
- Button Edit → Mở modal chỉnh sửa Stage

### 2. Stage Edit Modal

**Fields có thể chỉnh sửa**:
- Stage Name (readonly - chỉ hiển thị, không cho sửa)
- Planned Start Date
- Planned End Date
- Actual Start Date
- Actual End Date
- Estimated Effort (hours)
- Actual Effort (hours)
- Status Override (dropdown: Good / Warning / At Risk)

**Readonly Info hiển thị**:
- Progress (%)
- Steps Count
- Linked Screens Count

### 3. Stage Detail Page

**Route**: `/projects/:projectId/stages/:stageId`

**Layout**:
- Header: Stage name, status badge, back button
- Overview section: Progress, Effort stats, Status indicator
- Tabs: Steps (mỗi step là 1 tab)

### 4. Steps Tabs trong Stage Detail

**Mỗi Step tab hiển thị**:
- Danh sách Screen/Functions đã được liên kết với Step này
- Mỗi Screen/Function có thể inline edit:
  - Assignee
  - Estimated Effort
  - Actual Effort
  - Progress (0-100%)
  - Status (Not Started / In Progress / Completed / Skipped)
  - Note

**Actions**:
- Button "Link Screen/Functions" → Modal chọn Screen/Functions để liên kết
- Unlink (xóa liên kết) từng Screen/Function

### 5. Link Screen/Functions Modal

**Hiển thị**:
- Danh sách tất cả Screen/Functions của Project (chưa được link với Step này)
- Checkbox để chọn nhiều
- Search/Filter

**Actions**:
- Confirm → Bulk create StepScreenFunction records

## Tính toán Progress và Status

### Progress Calculation

```
Stage Progress = (Screens hoàn thành TẤT CẢ steps trong Stage) / (Tổng Screens được link trong Stage) × 100

"Hoàn thành" = Screen có status = "Completed" ở TẤT CẢ các Steps trong Stage
```

**Ví dụ**:
- Stage có 3 Steps: Design, Code, Test
- Screen A: Design ✓, Code ✓, Test ✓ → Completed
- Screen B: Design ✓, Code ✓, Test ✗ → In Progress
- Screen C: Design ✓, Code ✗, Test ✗ → In Progress
- Progress = 1/3 = 33%

### Status Evaluation

Status được đánh giá dựa trên **CẢ HAI**: Effort Variance VÀ Schedule

#### Effort-based Status:
```
Effort Variance = (Actual Effort - Estimated Effort) / Estimated Effort × 100

- Variance > 20%    → At Risk
- Variance 10-20%   → Warning
- Variance < 10%    → Good
```

#### Schedule-based Status:
```
Expected Progress = (Today - Start Date) / (End Date - Start Date) × 100

- Actual Progress < Expected Progress - 20%  → At Risk
- Actual Progress < Expected Progress - 10%  → Warning
- Otherwise                                   → Good
```

#### Combined Status:
```
Final Status = MAX(Effort Status, Schedule Status)
// "At Risk" > "Warning" > "Good"
```

## Data Models

### WorkflowStage (Extended)

```typescript
// Existing fields
id: number
projectId: number
name: string
displayOrder: number
isActive: boolean
color?: string

// New fields
startDate?: Date           // Planned start date
endDate?: Date             // Planned end date
actualStartDate?: Date     // Actual start date
actualEndDate?: Date       // Actual end date
estimatedEffort?: number   // Hours
actualEffort?: number      // Hours
progress?: number          // 0-100, calculated
status?: StageStatus       // 'Good' | 'Warning' | 'At Risk'
```

### StepScreenFunction (New Model)

```typescript
id: number
stepId: number              // FK to WorkflowStep
screenFunctionId: number    // FK to ScreenFunction
assigneeId?: number         // FK to Member
estimatedEffort: number     // Hours, default 0
actualEffort: number        // Hours, default 0
progress: number            // 0-100, default 0
status: StepScreenFunctionStatus  // 'Not Started' | 'In Progress' | 'Completed' | 'Skipped'
note?: string
createdAt: Date
updatedAt: Date

// Unique constraint: (stepId, screenFunctionId)
```

### StageStatus Enum

```typescript
type StageStatus = 'Good' | 'Warning' | 'At Risk';
```

### StepScreenFunctionStatus Enum

```typescript
type StepScreenFunctionStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Skipped';
```

## API Endpoints

### Stage APIs

```
GET    /api/task-workflow/stages/overview/project/:projectId
       → Returns: StageOverviewData[]

GET    /api/task-workflow/stages/:id/detail
       → Returns: StageDetailData

PUT    /api/task-workflow/stages/:id
       → Body: { startDate?, endDate?, actualStartDate?, actualEndDate?,
                 estimatedEffort?, actualEffort?, status? }
```

### StepScreenFunction APIs

```
GET    /api/task-workflow/step-screen-functions/step/:stepId
       → Returns: StepScreenFunction[]

POST   /api/task-workflow/step-screen-functions
       → Body: { stepId, screenFunctionId, assigneeId?, estimatedEffort?,
                 actualEffort?, progress?, status?, note? }

PUT    /api/task-workflow/step-screen-functions/:id
       → Body: { assigneeId?, estimatedEffort?, actualEffort?, progress?, status?, note? }

DELETE /api/task-workflow/step-screen-functions/:id

POST   /api/task-workflow/step-screen-functions/bulk
       → Body: { stepId, items: [{ screenFunctionId, estimatedEffort?, note? }] }

PUT    /api/task-workflow/step-screen-functions/bulk
       → Body: { items: [{ id, estimatedEffort?, actualEffort?, progress?, status?, note? }] }

GET    /api/task-workflow/steps/:stepId/available-screen-functions
       → Returns: ScreenFunction[] (not yet linked to this step)
```

## Response DTOs

### StageOverviewData

```typescript
interface StageOverviewData {
  id: number;
  name: string;
  displayOrder: number;
  color?: string;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: StageStatus;
  stepsCount: number;
  linkedScreensCount: number;
}
```

### StageDetailData

```typescript
interface StageDetailData {
  stage: WorkflowStage;
  steps: (WorkflowStep & {
    screenFunctions: Array<{
      id: number;
      screenFunctionId: number;
      screenFunction: ScreenFunction;
      assignee?: Member;
      estimatedEffort: number;
      actualEffort: number;
      progress: number;
      status: StepScreenFunctionStatus;
      note?: string;
    }>;
  })[];
  progress: {
    total: number;      // Total unique screens
    completed: number;  // Screens completed ALL steps
    percentage: number;
  };
  effort: {
    estimated: number;
    actual: number;
    variance: number;   // Percentage
  };
  status: StageStatus;
}
```

## Frontend Components

### 1. StagesOverviewPanel

**Location**: `frontend/src/components/task-workflow/StagesOverviewPanel.tsx`

**Props**:
```typescript
interface StagesOverviewPanelProps {
  projectId: number;
}
```

**Features**:
- Grid display of stages
- Click stage → navigate to Stage Detail
- Edit button → open StageEditModal
- Refresh button

### 2. StageEditModal

**Location**: `frontend/src/components/task-workflow/StageEditModal.tsx`

**Props**:
```typescript
interface StageEditModalProps {
  stage: StageOverviewData;
  onClose: (saved?: boolean) => void;
}
```

**Features**:
- Form with date inputs and effort inputs
- Status dropdown
- Save/Cancel buttons

### 3. Stage Detail Page

**Location**: `frontend/src/routes/projects.$projectId.stages.$stageId.tsx`

**Features**:
- Overview section with progress bar and stats
- Steps as tabs
- Each step tab shows linked Screen/Functions
- Inline editing for each Screen/Function
- Link/Unlink functionality

## Implementation Checklist

### Backend

- [x] Extend WorkflowStage model with date/effort fields
- [x] Create StepScreenFunction model
- [x] Create DTOs for StageOverview and StageDetail
- [x] Add service methods:
  - [x] getStagesOverview(projectId)
  - [x] getStageDetail(stageId)
  - [x] updateStage with new fields
  - [x] CRUD for StepScreenFunction
  - [x] bulkCreate/bulkUpdate for StepScreenFunction
  - [x] getAvailableScreenFunctions(stepId)
- [x] Add controller endpoints
- [x] Add progress/status calculation logic

### Frontend

- [x] Update types/index.ts with new types
- [x] Update api.ts with new endpoints
- [x] Create StagesOverviewPanel component
- [x] Create StageEditModal component
- [x] Create Stage Detail page with route
- [x] Add Steps tabs with Screen/Function linking
- [x] Add Stages tab to Project Detail page
- [x] Add translations (EN/VI)

### Testing

- [ ] Test stage CRUD operations
- [ ] Test progress calculation
- [ ] Test status evaluation
- [ ] Test Screen/Function linking
- [ ] Test inline editing
- [ ] Test bulk operations

## Translations

### English (en.json)

```json
{
  "stages": {
    "title": "Stages Overview",
    "noStages": "No stages configured",
    "initializeWorkflowFirst": "Initialize workflow configuration first to see stages",
    "editStage": "Edit Stage",
    "stageName": "Stage Name",
    "stageNameReadonly": "Stage name can only be changed in Workflow Configuration",
    "scheduleDates": "Schedule Dates",
    "estimatedStartDate": "Estimated Start Date",
    "estimatedEndDate": "Estimated End Date",
    "actualStartDate": "Actual Start Date",
    "actualEndDate": "Actual End Date",
    "effort": "Effort",
    "estimatedEffort": "Estimated Effort",
    "actualEffort": "Actual Effort",
    "manualStatus": "Manual Status Override",
    "status": "Status",
    "statusAutoCalculated": "Status is auto-calculated based on effort and schedule, but can be overridden",
    "progress": "Progress",
    "steps": "Steps",
    "linkedScreens": "Linked Screens",
    "startDate": "Start",
    "endDate": "End",
    "actualStart": "Actual Start",
    "actualEnd": "Actual End",
    "viewDetails": "View Details"
  },
  "stageDetail": {
    "backToProject": "Back to Project",
    "overview": "Overview",
    "stepsTab": "Steps",
    "totalScreens": "Total Screens",
    "completedScreens": "Completed",
    "effortVariance": "Effort Variance",
    "linkScreenFunctions": "Link Screen/Functions",
    "noScreenFunctions": "No screen/functions linked to this step",
    "linkScreenFunctionsDescription": "Link screen/functions to track progress for this step",
    "selectScreenFunctions": "Select Screen/Functions to Link",
    "searchScreenFunctions": "Search screen/functions...",
    "noAvailableScreenFunctions": "All screen/functions are already linked to this step",
    "linkSelected": "Link Selected",
    "unlink": "Unlink",
    "confirmUnlink": "Remove this screen/function from the step?",
    "screenFunction": "Screen/Function",
    "assignee": "Assignee",
    "note": "Note"
  }
}
```

### Vietnamese (vi.json)

```json
{
  "stages": {
    "title": "Tổng quan Giai đoạn",
    "noStages": "Chưa cấu hình giai đoạn",
    "initializeWorkflowFirst": "Khởi tạo cấu hình workflow trước để xem các giai đoạn",
    "editStage": "Chỉnh sửa Giai đoạn",
    "stageName": "Tên Giai đoạn",
    "stageNameReadonly": "Tên giai đoạn chỉ có thể thay đổi trong Cấu hình Workflow",
    "scheduleDates": "Ngày Kế hoạch",
    "estimatedStartDate": "Ngày Bắt đầu Dự kiến",
    "estimatedEndDate": "Ngày Kết thúc Dự kiến",
    "actualStartDate": "Ngày Bắt đầu Thực tế",
    "actualEndDate": "Ngày Kết thúc Thực tế",
    "effort": "Công sức",
    "estimatedEffort": "Công sức Dự kiến",
    "actualEffort": "Công sức Thực tế",
    "manualStatus": "Ghi đè Trạng thái",
    "status": "Trạng thái",
    "statusAutoCalculated": "Trạng thái được tính tự động dựa trên công sức và tiến độ, nhưng có thể ghi đè",
    "progress": "Tiến độ",
    "steps": "Bước",
    "linkedScreens": "Màn hình liên kết",
    "startDate": "Bắt đầu",
    "endDate": "Kết thúc",
    "actualStart": "Thực tế BĐ",
    "actualEnd": "Thực tế KT",
    "viewDetails": "Xem chi tiết"
  },
  "stageDetail": {
    "backToProject": "Quay lại Dự án",
    "overview": "Tổng quan",
    "stepsTab": "Các bước",
    "totalScreens": "Tổng Màn hình",
    "completedScreens": "Hoàn thành",
    "effortVariance": "Chênh lệch Công sức",
    "linkScreenFunctions": "Liên kết Màn hình/Chức năng",
    "noScreenFunctions": "Chưa có màn hình/chức năng nào được liên kết với bước này",
    "linkScreenFunctionsDescription": "Liên kết màn hình/chức năng để theo dõi tiến độ cho bước này",
    "selectScreenFunctions": "Chọn Màn hình/Chức năng để Liên kết",
    "searchScreenFunctions": "Tìm màn hình/chức năng...",
    "noAvailableScreenFunctions": "Tất cả màn hình/chức năng đã được liên kết với bước này",
    "linkSelected": "Liên kết đã chọn",
    "unlink": "Hủy liên kết",
    "confirmUnlink": "Xóa màn hình/chức năng này khỏi bước?",
    "screenFunction": "Màn hình/Chức năng",
    "assignee": "Người thực hiện",
    "note": "Ghi chú"
  }
}
```

## Notes

### Relationship với Phases

- **Stages** và **Phases** hoạt động **song song, độc lập**
- Stages dùng cho workflow-based tracking (Design → Code → Test)
- Phases dùng cho timeline-based tracking (Sprint 1, Sprint 2, ...)
- Không cần migration từ Phases sang Stages

### Database Migration

Cần chạy migration để:
1. Thêm columns mới vào bảng `workflow_stages`
2. Tạo bảng `step_screen_functions`

### Performance Considerations

- Progress và Status nên được tính toán on-demand hoặc cached
- Sử dụng bulk operations cho việc link/update nhiều Screen/Functions
- Index trên `(stepId, screenFunctionId)` cho StepScreenFunction

## Related Files

### Backend
- `backend/src/modules/task-workflow/models/workflow-stage.model.ts`
- `backend/src/modules/task-workflow/models/step-screen-function.model.ts`
- `backend/src/modules/task-workflow/task-workflow.service.ts`
- `backend/src/modules/task-workflow/task-workflow.controller.ts`
- `backend/src/modules/task-workflow/dto/*.dto.ts`

### Frontend
- `frontend/src/components/task-workflow/StagesOverviewPanel.tsx`
- `frontend/src/components/task-workflow/StageEditModal.tsx`
- `frontend/src/routes/projects.$projectId.stages.$stageId.tsx`
- `frontend/src/routes/projects.$projectId.tsx` (add Stages tab)
- `frontend/src/services/api.ts`
- `frontend/src/types/index.ts`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/vi.json`

---

*Document created: 2026-01-29*
*Last updated: 2026-01-29*
*Implementation status: COMPLETED*
