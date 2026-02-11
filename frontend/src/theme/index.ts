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
