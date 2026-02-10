# 📋 KẾ HOẠCH TÍCH HỢP MUI + TAILWIND CSS v4

> **Ngày tạo**: 10/02/2026  
> **Dự án**: Project Cost & Quality Management  
> **Mục tiêu**: Tích hợp Material-UI (MUI) làm component library chính, giữ lại Tailwind CSS v4 cho utility styling

---

## 📊 Tổng quan

| Metric | Value |
|--------|-------|
| **Ước tính thời gian** | 12-15 ngày làm việc |
| **Files cần thay đổi** | ~46 files |
| **Risk level** | Trung bình (CSS Layers giảm conflicts) |
| **Dependencies mới** | `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@emotion/cache`, `react-datepicker` |
| **Upgrade** | Tailwind CSS v3 → v4 |
| **Integration** | CSS Layers + Emotion Cache (`prepend: true`) |

### Chiến lược Hybrid

```
┌─────────────────────────────────────────────────────────────────────┐
│ MUI + Tailwind CSS v4 Integration via CSS Layers                   │
├─────────────────────────────────────────────────────────────────────┤
│ • MUI: Component library (Button, TextField, Dialog, Card, etc.)   │
│ • Tailwind: Utility classes (layout, spacing, colors, responsive)  │
│ • CSS Layers: Kiểm soát specificity, tránh conflicts               │
│ • Theme: Sử dụng default MUI colors + CSS Variables                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Phân tích Files Hiện tại

### Components (`frontend/src/components/`)

| Thư mục | Files | Độ phức tạp |
|---------|-------|-------------|
| `common/` | 10 files | Cao - nhiều custom props |
| `forms/` | 5 forms | Cao - tích hợp react-hook-form |
| `charts/` | 9 files | Thấp - giữ nguyên Recharts |
| `metrics/` | 2 files | Trung bình |
| `task-workflow/` | 7 files | Cao - logic phức tạp |

### Routes (`frontend/src/routes/`)

| File | Mô tả |
|------|-------|
| `__root.tsx` | Layout chính, navigation |
| `index.tsx` | Dashboard |
| `login.tsx` | Trang đăng nhập |
| `projects.tsx` | Layout cho projects |
| `projects.index.tsx` | Danh sách projects |
| `projects.$projectId.tsx` | Chi tiết project |
| `projects_.$projectId.stages.$stageId.tsx` | Chi tiết stage |
| `projects_.$projectId.timeline-interactive.tsx` | Timeline view |
| `reports.tsx` | Layout cho reports |
| `reports.index.tsx` | Danh sách reports |
| `reports.$reportId.tsx` | Chi tiết report |
| `iam.tsx` | Quản lý IAM |
| `my-tasks.tsx` | Tasks của user |
| `benchmarks.tsx` | Benchmarks |
| `force-change-password.tsx` | Đổi mật khẩu bắt buộc |

---

## 🔹 PHASE 0: Chuẩn bị (1 ngày)

### Tasks

| # | Task | Chi tiết |
|---|------|----------|
| 0.1 | Cài đặt dependencies MUI | `npm install @mui/material @mui/icons-material @emotion/react @emotion/styled @emotion/cache` |
| 0.2 | Cài đặt date picker | `npm install react-datepicker` (thay cho @mui/x-date-pickers) |
| 0.3 | Upgrade Tailwind CSS v4 | `npm install tailwindcss@next @tailwindcss/vite@next` |
| 0.4 | Setup Emotion Cache | Cấu hình cache cho CSS layer integration |
| 0.5 | Setup MUI Theme | Sử dụng default MUI colors với CSS Variables |
| 0.6 | Setup CSS Layer Integration | Cấu hình `CacheProvider` + `StyledEngineProvider` + `GlobalStyles` |
| 0.7 | Wrap app với providers | Cập nhật `main.tsx` |
| 0.8 | Tạo mapping table | Document component equivalents |

### Theme Setup (sử dụng MUI Default Colors + CSS Variables)

```typescript
// frontend/src/theme/index.ts
import { createTheme } from '@mui/material/styles';

// Sử dụng default MUI colors, enable CSS variables
const theme = createTheme({
  cssVariables: true, // Enable CSS variables support
  // Giữ nguyên default MUI color palette
  // primary: MUI Blue (#1976d2)
  // secondary: MUI Purple (#9c27b0)
  // error: MUI Red (#d32f2f)
  // warning: MUI Orange (#ed6c02)
  // info: MUI Light Blue (#0288d1)
  // success: MUI Green (#2e7d32)
});

export default theme;
```

### Emotion Cache Setup (QUAN TRỌNG)

```typescript
// frontend/src/emotionCache.ts
import createCache from '@emotion/cache';

// Tạo Emotion cache với prepend: true để MUI styles được inject trước
// CSS Layer sẽ được xử lý bởi StyledEngineProvider
export const muiCache = createCache({
  key: 'mui',
  prepend: true, // Đảm bảo MUI styles được inject ở đầu <head>
});

export default muiCache;
```

**Tại sao cần Emotion Cache?**
- `prepend: true`: Đảm bảo MUI styles được inject ở đầu `<head>`, trước Tailwind
- Kết hợp với CSS Layers: MUI styles nằm trong `@layer mui`, Tailwind utilities nằm trong `@layer utilities`
- Giải quyết vấn đề specificity conflicts

### Tailwind CSS v4 Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
});
```

```css
/* frontend/src/index.css */
@import 'tailwindcss';

/* CSS Layer ordering - MUI sẽ nằm giữa base và components */
@layer theme, base, mui, components, utilities;
```

### Cập nhật main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Emotion Cache - QUAN TRỌNG: import trước MUI
import { CacheProvider } from '@emotion/react';
import muiCache from './emotionCache';

// MUI imports - sử dụng specific imports (recommended)
import { ThemeProvider } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';

import theme from './theme';
import { routeTree } from './routeTree.gen';
import './i18n';
import './index.css';
import { AuthProvider } from './context/AuthContext';

const router = createRouter({ routeTree });
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* CacheProvider: Quản lý Emotion cache cho MUI */}
    <CacheProvider value={muiCache}>
      {/* StyledEngineProvider với enableCssLayer để hỗ trợ CSS Layer ordering */}
      <StyledEngineProvider enableCssLayer>
        <ThemeProvider theme={theme}>
          {/* GlobalStyles để định nghĩa thứ tự CSS layers */}
          <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </CacheProvider>
  </React.StrictMode>,
);
```

### Import Convention

```typescript
// ✅ PREFERRED: Specific imports (better tree-shaking, faster builds)
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import Card from '@mui/material/Card';

// ❌ AVOID: Barrel imports (slower builds, larger bundles)
import { Button, TextField, Dialog, Card } from '@mui/material';
```

### Checklist Phase 0
- [ ] MUI dependencies cài đặt thành công (bao gồm `@emotion/cache`)
- [ ] `react-datepicker` cài đặt thành công
- [ ] Tailwind CSS v4 upgrade thành công
- [ ] Emotion cache được cấu hình với `prepend: true`
- [ ] Theme file được tạo với `cssVariables: true`
- [ ] CSS variables hoạt động (kiểm tra trong DevTools: `--mui-palette-*`)
- [ ] `CacheProvider` wrap đúng thứ tự trong component tree
- [ ] `StyledEngineProvider` với `enableCssLayer` được setup
- [ ] CSS layer ordering hoạt động đúng
- [ ] App vẫn chạy được
- [ ] Tailwind classes vẫn hoạt động song song với MUI

---

## 🔹 PHASE 1: Core Components (3 ngày)

Thay đổi `components/common/` - Đây là foundation của toàn bộ app

### Files cần thay đổi

| File | MUI Replacement | Priority | Est. Time |
|------|----------------|----------|-----------|
| `Button.tsx` | `<Button>` với variant mapping | 🔴 Critical | 2h |
| `Input.tsx` | `<TextField>` | 🔴 Critical | 2h |
| `Modal.tsx` | `<Dialog>` | 🔴 Critical | 3h |
| `UIComponents.tsx` | `<Card>`, `<CircularProgress>`, `<Chip>`, `<LinearProgress>` | 🔴 Critical | 4h |
| `FormFields.tsx` | `<TextField>`, `<Select>`, `<FormControl>` | 🔴 Critical | 3h |
| `DateInput.tsx` | `react-datepicker` với MUI TextField wrapper | 🟡 High | 2h |
| `EffortUnitSelector.tsx` | `<ToggleButtonGroup>` | 🟡 High | 1h |
| `LanguageSwitcher.tsx` | `<Select>` hoặc `<Menu>` | 🟢 Medium | 1h |
| `HolidayImportDialog.tsx` | `<Dialog>` | 🟢 Medium | 2h |
| `index.ts` | Update exports | 🟢 Medium | 0.5h |

### Button Mapping

```typescript
// BEFORE (Tailwind)
<Button variant="primary">Submit</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button variant="success">Approve</Button>
<Button variant="outline">Edit</Button>
<Button variant="ghost">More</Button>

// AFTER (MUI)
<Button variant="contained" color="primary">Submit</Button>
<Button variant="outlined">Cancel</Button>
<Button variant="contained" color="error">Delete</Button>
<Button variant="contained" color="success">Approve</Button>
<Button variant="outlined">Edit</Button>
<Button variant="text">More</Button>
```

### Size Mapping

```typescript
// BEFORE (Tailwind)
size="xs" | "sm" | "md" | "lg"

// AFTER (MUI)
size="small" | "medium" | "large"
// Note: MUI không có "xs", cần custom hoặc dùng sx prop
```

### Checklist Phase 1
- [ ] Button component hoạt động với tất cả variants
- [ ] Input/TextField render đúng, có validation states
- [ ] Modal/Dialog open/close đúng, có animation
- [ ] Card component hiển thị đúng
- [ ] Loading spinner hiển thị
- [ ] Status badges (Chip) hiển thị đúng màu
- [ ] Progress bar hoạt động
- [ ] Tất cả exports trong index.ts đúng

---

## 🔹 PHASE 2: Form Components (2 ngày)

Thay đổi `components/forms/`

### Files cần thay đổi

| File | Complexity | Est. Time | Notes |
|------|------------|-----------|-------|
| `ProjectForm.tsx` | Cao | 4h | Nhiều fields, date pickers |
| `MemberForm.tsx` | Trung bình | 2h | Select, text inputs |
| `ScreenFunctionForm.tsx` | Trung bình | 2h | |
| `ReportForm.tsx` | Cao | 3h | Có thể có rich text |
| `CommentaryForm.tsx` | Thấp | 1h | Textarea chính |
| `index.ts` | - | 0.5h | Update exports |

### Integration với react-hook-form

```tsx
// Giữ nguyên react-hook-form, chỉ đổi UI
import { Controller, useForm } from 'react-hook-form';
// Sử dụng specific imports
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';

<Controller
  name="name"
  control={control}
  render={({ field, fieldState: { error } }) => (
    <TextField
      {...field}
      label="Project Name"
      error={!!error}
      helperText={error?.message}
      fullWidth
    />
  )}
/>
```

### Checklist Phase 2
- [ ] Tất cả forms submit được
- [ ] Validation errors hiển thị đúng
- [ ] Date pickers hoạt động
- [ ] Select/Dropdown hoạt động
- [ ] Form reset hoạt động

---

## 🔹 PHASE 3: Layout & Navigation (2 ngày)

Thay đổi `routes/__root.tsx` và layout chung

### Components cần thay đổi

| Component hiện tại | MUI Replacement |
|-------------------|----------------|
| Navigation bar (`<nav>`) | `<AppBar>`, `<Toolbar>` |
| Nav links | `<Button component={Link}>` hoặc custom styled Link |
| User menu | `<Menu>`, `<MenuItem>`, `<Avatar>` |
| Footer (nếu có) | `<Box>` |
| Page container | `<Container>` |
| Loading overlay | `<Backdrop>`, `<CircularProgress>` |

### Navigation Structure

```tsx
<AppBar position="static" color="default" elevation={1}>
  <Toolbar>
    <Typography variant="h6" sx={{ flexGrow: 0 }}>
      PCQM
    </Typography>
    
    <Box sx={{ flexGrow: 1, display: 'flex', ml: 4, gap: 1 }}>
      <Button component={Link} to="/">Dashboard</Button>
      <Button component={Link} to="/projects">Projects</Button>
      <Button component={Link} to="/reports">Reports</Button>
      {/* ... */}
    </Box>
    
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <LanguageSwitcher />
      <IconButton onClick={handleUserMenu}>
        <Avatar>{user?.name?.[0]}</Avatar>
      </IconButton>
    </Box>
  </Toolbar>
</AppBar>
```

### Checklist Phase 3
- [ ] Navigation hiển thị đúng
- [ ] Active link được highlight
- [ ] User menu dropdown hoạt động
- [ ] Logout hoạt động
- [ ] Responsive trên mobile (hamburger menu nếu cần)

---

## 🔹 PHASE 4: Route Pages (4 ngày)

### Files và ước tính thời gian

| Route | Complexity | Est. Time | Key Components |
|-------|------------|-----------|----------------|
| `index.tsx` | Cao | 4h | Dashboard cards, stats |
| `login.tsx` | Thấp | 2h | Form, branding |
| `projects.tsx` | Thấp | 1h | Layout wrapper |
| `projects.index.tsx` | Trung bình | 3h | Table/List, filters |
| `projects.$projectId.tsx` | **Rất cao** | 8h | Tabs, many sections |
| `projects_.$projectId.stages.$stageId.tsx` | Cao | 4h | Stage details |
| `projects_.$projectId.timeline-interactive.tsx` | Trung bình | 2h | Gantt wrapper |
| `reports.tsx` | Thấp | 1h | Layout wrapper |
| `reports.index.tsx` | Trung bình | 2h | Table/List |
| `reports.$reportId.tsx` | Cao | 4h | Report details |
| `iam.tsx` | Cao | 4h | Users, roles, permissions |
| `my-tasks.tsx` | Trung bình | 2h | Task list |
| `benchmarks.tsx` | Thấp | 2h | Comparison view |
| `force-change-password.tsx` | Thấp | 1h | Simple form |

### Common Patterns

```tsx
// Grid layouts
<Grid container spacing={3}>
  <Grid item xs={12} md={6} lg={4}>
    <Card>...</Card>
  </Grid>
</Grid>

// Tables
<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Name</TableCell>
        <TableCell>Status</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {data.map(item => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell><Chip label={item.status} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>

// Tabs
<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
  <Tabs value={tabValue} onChange={handleTabChange}>
    <Tab label="Overview" />
    <Tab label="Details" />
    <Tab label="Settings" />
  </Tabs>
</Box>
<TabPanel value={tabValue} index={0}>Overview content</TabPanel>
```

### Checklist Phase 4
- [ ] Tất cả pages render đúng
- [ ] Navigation giữa pages hoạt động
- [ ] Data fetching và loading states đúng
- [ ] Error states hiển thị
- [ ] Empty states hiển thị
- [ ] Responsive trên các screen sizes

---

## 🔹 PHASE 5: Task Workflow Components (2 ngày)

`components/task-workflow/` - Logic phức tạp nhất

### Files cần thay đổi

| File | Est. Time | MUI Components |
|------|-----------|----------------|
| `TaskWorkflowTable.tsx` | 4h | `<Table>` hoặc `<DataGrid>` |
| `StagesOverviewPanel.tsx` | 3h | `<Accordion>`, `<Card>`, `<List>` |
| `StageEditModal.tsx` | 2h | `<Dialog>`, `<TextField>` |
| `StepScreenFunctionEditModal.tsx` | 2h | `<Dialog>`, form controls |
| `MetricConfigPanel.tsx` | 2h | `<TextField>`, `<Switch>`, `<Slider>` |
| `WorkflowConfigPanel.tsx` | 3h | Complex forms |
| `index.ts` | 0.5h | Update exports |

### DataGrid Option (nếu cần advanced table)

```bash
npm install @mui/x-data-grid
```

```tsx
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Name', width: 200 },
  { field: 'status', headerName: 'Status', width: 120 },
  // ...
];

<DataGrid
  rows={data}
  columns={columns}
  pageSize={10}
  checkboxSelection
/>
```

### Checklist Phase 5
- [ ] Workflow table hiển thị đúng
- [ ] Drag & drop (nếu có) hoạt động
- [ ] Edit modals hoạt động
- [ ] Accordion expand/collapse đúng
- [ ] Config panels save được

---

## 🔹 PHASE 6: Charts & Metrics (0.5 ngày)

### Chiến lược: GIỮ NGUYÊN RECHARTS

| File | Action | Notes |
|------|--------|-------|
| `EnhancedMetricsChart.tsx` | Chỉ đổi wrapper | Container styling |
| `EnhancedProgressChart.tsx` | Chỉ đổi wrapper | |
| `EnhancedTestingQualityChart.tsx` | Chỉ đổi wrapper | |
| `MetricsChart.tsx` | Chỉ đổi wrapper | |
| `ProgressChart.tsx` | Chỉ đổi wrapper | |
| `TestingQualityChart.tsx` | Chỉ đổi wrapper | |
| `StageTimelineGantt.tsx` | Giữ nguyên | Gantt library |
| `StageTimelineSvarGantt.tsx` | Giữ nguyên | Svar library |
| `MetricsDashboard.tsx` | Đổi layout | Grid, Card wrappers |

### Wrapper Pattern

```tsx
// Chỉ đổi container, giữ nguyên Recharts
<Card>
  <CardHeader title="Progress Chart" />
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        {/* Recharts content - KHÔNG ĐỔI */}
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

### Checklist Phase 6
- [ ] Charts render đúng
- [ ] Responsive containers hoạt động
- [ ] Tooltips hiển thị
- [ ] Legends hiển thị

---

## 🔹 PHASE 7: Finalization & Testing (1 ngày)

### Tasks

| # | Task | Chi tiết |
|---|------|----------|
| 7.1 | Verify CSS Layer integration | Kiểm tra MUI và Tailwind không conflict |
| 7.2 | Remove old Tailwind config | Xóa `tailwind.config.js`, `postcss.config.js` (v4 không cần) |
| 7.3 | Clean up unused custom CSS | Xóa các CSS classes tự định nghĩa không còn dùng |
| 7.4 | Verify CSS specificity | Đảm bảo MUI styles có thể override bởi Tailwind utilities |
| 7.5 | Full regression testing | Test tất cả flows |
| 7.6 | Fix responsive issues | Kiểm tra tablet/mobile |
| 7.7 | Performance check | Bundle size comparison |

### index.css với Tailwind v4 + MUI Integration

```css
/* Tailwind CSS v4 import */
@import 'tailwindcss';

/* CSS Layer ordering - quan trọng để kiểm soát specificity */
/* Thứ tự: theme < base < mui < components < utilities */
/* MUI styles nằm ở layer 'mui', Tailwind utilities nằm ở 'utilities' */
/* => Tailwind utilities có thể override MUI styles khi cần */
@layer theme, base, mui, components, utilities;

/* Custom global styles */
html {
  scrollbar-gutter: stable;
}

/* Svar Gantt - nếu vẫn dùng */
.gantt-svar-container {
  overflow: hidden;
}

.gantt-svar-container .gantt-chart-wrapper {
  overflow: auto;
  padding-bottom: 80px;
}
```

### CSS Layer Benefits

```
┌─────────────────────────────────────────────────────────────┐
│ Layer Order (thấp → cao specificity)                       │
├─────────────────────────────────────────────────────────────┤
│ 1. theme      - CSS variables, custom properties           │
│ 2. base       - Reset styles, typography defaults          │
│ 3. mui        - MUI component styles (tự động từ MUI)      │
│ 4. components - Custom Tailwind components (@apply)        │
│ 5. utilities  - Tailwind utility classes (cao nhất)        │
└─────────────────────────────────────────────────────────────┘

Ví dụ sử dụng:
- MUI Button: <Button>Click</Button>
- Override với Tailwind: <Button className="bg-red-500">Click</Button>
- Tailwind "bg-red-500" sẽ override MUI background vì nằm ở layer cao hơn
```

### Testing Checklist

#### Functional Testing
- [ ] Login/Logout flow
- [ ] Create/Edit/Delete Project
- [ ] Create/Edit/Delete Phase
- [ ] Create/Edit/Delete Member
- [ ] Create/Edit/Delete Screen Function
- [ ] Create/Edit/Delete Report
- [ ] IAM - User management
- [ ] IAM - Role management
- [ ] IAM - Permission assignment
- [ ] Language switching (EN/VI)
- [ ] All modals open/close correctly
- [ ] All forms submit successfully
- [ ] All validation errors display
- [ ] Charts render with data
- [ ] Empty states display

#### Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

#### Performance
- [ ] Initial load time < 3s
- [ ] Bundle size acceptable
- [ ] No memory leaks

---

## 📊 Component Mapping Reference

### Core Component Replacement

```
┌─────────────────────────────────────────────────────────────────────┐
│ CUSTOM COMPONENT (HIỆN TẠI)      →    MUI COMPONENT                │
├─────────────────────────────────────────────────────────────────────┤
│ <Button variant="primary">       → <Button variant="contained">    │
│ <Button variant="secondary">     → <Button variant="outlined">     │
│ <Button variant="danger">        → <Button color="error">          │
│ <Button variant="ghost">         → <Button variant="text">         │
│ <Card> (custom)                  → <Card> (MUI)                    │
│ <Input> (custom)                 → <TextField>                     │
│ className="label"                → <InputLabel> or <FormLabel>     │
│ <StatusBadge status="Good">      → <Chip color="success">          │
│ <StatusBadge status="Warning">   → <Chip color="warning">          │
│ <StatusBadge status="At Risk">   → <Chip color="error">            │
│ <Modal>                          → <Dialog>                        │
│ <LoadingSpinner>                 → <CircularProgress>              │
│ <ProgressBar>                    → <LinearProgress>                │
│ <EmptyState>                     → Custom với <Box>, <Typography>  │
└─────────────────────────────────────────────────────────────────────┘
```

### Tailwind Utilities - VẪN SỬ DỤNG ĐƯỢC

```
┌─────────────────────────────────────────────────────────────────────┐
│ Tailwind utilities vẫn hoạt động với MUI components                │
├─────────────────────────────────────────────────────────────────────┤
│ className="grid grid-cols-3"     → Tailwind layout ✅              │
│ className="flex gap-4"           → Tailwind flexbox ✅             │
│ className="p-4 m-2"              → Tailwind spacing ✅             │
│ className="text-sm text-gray-500"→ Tailwind typography ✅          │
│ className="bg-gray-50"           → Tailwind background ✅          │
│ className="rounded-lg shadow"    → Tailwind effects ✅             │
│ className="hover:bg-blue-100"    → Tailwind states ✅              │
│ className="md:flex lg:grid"      → Tailwind responsive ✅          │
└─────────────────────────────────────────────────────────────────────┘

Ví dụ hybrid:
<Button variant="contained" className="shadow-xl hover:scale-105">
  MUI Button + Tailwind enhancements
</Button>

<Card className="hover:shadow-2xl transition-shadow">
  MUI Card + Tailwind hover effect
</Card>
```

### Spacing Reference (khi dùng MUI sx prop)

```
Tailwind → MUI (1 MUI unit = 8px)
p-1 (4px)   → p: 0.5
p-2 (8px)   → p: 1
p-3 (12px)  → p: 1.5
p-4 (16px)  → p: 2
p-5 (20px)  → p: 2.5
p-6 (24px)  → p: 3
p-8 (32px)  → p: 4

Hoặc dùng trực tiếp Tailwind: className="p-4"
```

---

## ⚠️ Rủi ro & Giải pháp

| Rủi ro | Xác suất | Impact | Giải pháp |
|--------|----------|--------|-----------|
| CSS conflicts giữa MUI và Tailwind | Thấp | Medium | CSS Layer ordering + Emotion cache với `prepend: true` |
| Emotion cache không hoạt động đúng | Trung bình | High | Kiểm tra thứ tự provider, đảm bảo `CacheProvider` wrap ngoài cùng |
| Props interface mismatch | Trung bình | High | Tạo adapter/wrapper components |
| Performance regression | Thấp | Medium | Benchmark bundle size trước/sau |
| Missing features | Thấp | Low | Document và tạo custom components |
| Breaking changes trong forms | Cao | High | Test validation kỹ |
| Responsive breakpoints khác | Thấp | Low | Dùng Tailwind breakpoints (vẫn hoạt động) |
| react-datepicker styling conflicts | Thấp | Low | Import CSS và customize với Tailwind |

### Troubleshooting Emotion Cache

```tsx
// Nếu MUI styles bị override bởi Tailwind không mong muốn:
// 1. Kiểm tra DevTools > Elements > <head>
//    - MUI styles (<style data-emotion="mui">) phải nằm TRƯỚC Tailwind
//    - Nếu không đúng thứ tự, kiểm tra lại emotionCache.ts

// 2. Verify CSS Layers trong DevTools > Styles
//    - MUI styles phải nằm trong @layer mui
//    - Tailwind utilities phải nằm trong @layer utilities

// 3. Nếu cần debug:
const muiCache = createCache({
  key: 'mui',
  prepend: true,
  // Thêm để debug
  stylisPlugins: [],
});

// 4. Alternative: Sử dụng insertionPoint
const muiCache = createCache({
  key: 'mui',
  insertionPoint: document.querySelector<HTMLElement>('#emotion-insertion-point'),
});
// Thêm vào index.html: <meta id="emotion-insertion-point" />
```

---

## ✅ Definition of Done (cho mỗi Phase)

Mỗi phase được coi là hoàn thành khi:

1. [ ] Không có TypeScript errors
2. [ ] Không có ESLint warnings/errors
3. [ ] UI render giống hoặc tốt hơn trước
4. [ ] Tất cả user interactions hoạt động
5. [ ] Loading states hiển thị đúng
6. [ ] Error states hiển thị đúng
7. [ ] Responsive trên mobile/tablet/desktop
8. [ ] Không có console errors
9. [ ] i18n vẫn hoạt động (EN/VI)
10. [ ] Build production thành công

---

## 📅 Timeline Tổng hợp

```
Week 1:
├── Day 1: Phase 0 - Chuẩn bị
├── Day 2-4: Phase 1 - Core Components
└── Day 5: Phase 2 - Form Components (1/2)

Week 2:
├── Day 6: Phase 2 - Form Components (2/2)
├── Day 7-8: Phase 3 - Layout & Navigation
└── Day 9-10: Phase 4 - Route Pages (1/2)

Week 3:
├── Day 11-12: Phase 4 - Route Pages (2/2)
├── Day 13-14: Phase 5 - Task Workflow
└── Day 15: Phase 6 & 7 - Charts, Cleanup, Testing
```

---

## 📝 Notes

### Libraries giữ nguyên
- `react-hook-form` + `zod` cho form validation
- `Recharts` cho charts
- `@tanstack/react-query` cho data fetching
- `@tanstack/react-router` cho routing
- `i18next` cho internationalization
- **`Tailwind CSS v4`** - giữ lại và tích hợp qua CSS Layers

### MUI packages cân nhắc thêm
- `@mui/x-data-grid` cho tables phức tạp

### Date Picker - Sử dụng react-datepicker

Thay vì `@mui/x-date-pickers`, sử dụng `react-datepicker` vì:
- Nhẹ hơn, ít dependencies
- Dễ customize styling với Tailwind
- Đã có sẵn `date-fns` trong project

```tsx
// DateInput.tsx - Wrapper cho react-datepicker với MUI styling
import DatePicker from 'react-datepicker';
import TextField from '@mui/material/TextField';
import 'react-datepicker/dist/react-datepicker.css';

interface DateInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
}) => {
  return (
    <DatePicker
      selected={value}
      onChange={onChange}
      dateFormat="dd/MM/yyyy"
      customInput={
        <TextField
          label={label}
          error={error}
          helperText={helperText}
          fullWidth
          size="small"
        />
      }
    />
  );
};
```

### Hybrid Approach - MUI + Tailwind

Với CSS Layer integration, có thể sử dụng cả hai:

```tsx
// MUI component với Tailwind utilities cho fine-tuning
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';

// Override MUI styles với Tailwind khi cần
<Button className="shadow-lg hover:shadow-xl">
  Enhanced Button
</Button>

// Layout với Tailwind, components với MUI
<div className="grid grid-cols-3 gap-4 p-6">
  <Card>MUI Card 1</Card>
  <Card>MUI Card 2</Card>
  <Card>MUI Card 3</Card>
</div>

// Kết hợp sx prop và className
<Box sx={{ p: 2 }} className="bg-gradient-to-r from-blue-500 to-purple-500">
  Mixed styling
</Box>
```

---

## 🔗 Tài liệu tham khảo

### MUI
- [MUI Documentation](https://mui.com/material-ui/getting-started/)
- [MUI Component API](https://mui.com/material-ui/api/)
- [MUI System (sx prop)](https://mui.com/system/getting-started/)
- [MUI Theming](https://mui.com/material-ui/customization/theming/)
- [MUI CSS Variables](https://mui.com/material-ui/customization/css-theme-variables/overview/)
- [**MUI + Tailwind CSS v4 Integration**](https://mui.com/material-ui/integrations/tailwindcss/tailwindcss-v4/#vite-js-or-any-other-spa)

### Emotion Cache
- [Emotion Cache Documentation](https://emotion.sh/docs/@emotion/cache)
- [MUI Styled Engine](https://mui.com/material-ui/integrations/styled-components/)
- [CSS Injection Order](https://mui.com/material-ui/guides/interoperability/#css-injection-order)

### Tailwind & Date Picker
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [react-datepicker Documentation](https://reactdatepicker.com/)
- [react-datepicker GitHub](https://github.com/Hacker0x01/react-datepicker)
