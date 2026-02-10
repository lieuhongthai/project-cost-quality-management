import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Emotion Cache - QUAN TRỌNG: import trước MUI
import { CacheProvider } from '@emotion/react'
import muiCache from './emotionCache'

// MUI imports - sử dụng specific imports (recommended)
import { ThemeProvider } from '@mui/material/styles'
import { StyledEngineProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import GlobalStyles from '@mui/material/GlobalStyles'

import theme from './theme'
import { routeTree } from './routeTree.gen'
import './i18n' // Initialize i18n
import './index.css'
import { AuthProvider } from './context/AuthContext'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

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
)
