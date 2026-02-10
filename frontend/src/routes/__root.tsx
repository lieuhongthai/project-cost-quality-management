import { createRootRoute, Link, Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/common'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAppAbility } from '@/ability'

// MUI imports
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import LogoutIcon from '@mui/icons-material/Logout'

function RootComponent() {
  const { t } = useTranslation()
  const { user, isLoading, logout } = useAuth()
  const ability = useAppAbility()
  const location = useLocation()

  // User menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleUserMenuClose()
    logout()
  }

  // Auth redirects
  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" />
  }

  // Check for force password change
  if (user?.mustChangePassword && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" />
  }

  // Helper to check if route is active
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Navigation items
  const navItems = [
    { path: '/', label: t('nav.dashboard'), show: true },
    { path: '/projects', label: t('nav.projects'), show: ability.can('read', 'project') },
    { path: '/my-tasks', label: t('nav.myTasks'), show: ability.can('read', 'member') },
    { path: '/reports', label: t('nav.reports'), show: ability.can('read', 'report') },
    { path: '/benchmarks', label: t('nav.benchmarks'), show: true },
    {
      path: '/iam',
      label: t('nav.accessControl'),
      show: ability.can('manage', 'role') || ability.can('manage', 'position') || ability.can('manage', 'user'),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* App Bar */}
      <AppBar position="static" color="inherit" elevation={1}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: 2 }}>
            {/* Logo */}
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                mr: 4,
              }}
            >
              PCQM
            </Typography>

            {/* Navigation Links */}
            {user && (
              <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
                {navItems
                  .filter((item) => item.show)
                  .map((item) => (
                    <Button
                      key={item.path}
                      component={Link}
                      to={item.path}
                      sx={{
                        color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                        borderBottom: isActive(item.path) ? 2 : 0,
                        borderColor: 'primary.main',
                        borderRadius: 0,
                        px: 2,
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderBottom: 2,
                          borderColor: isActive(item.path) ? 'primary.main' : 'grey.300',
                        },
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
              </Box>
            )}

            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Right side: Language + User */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LanguageSwitcher />

              {user && (
                <>
                  <IconButton
                    onClick={handleUserMenuClick}
                    size="small"
                    aria-controls={menuOpen ? 'user-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={menuOpen ? 'true' : undefined}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {user.username?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  </IconButton>
                  <Menu
                    id="user-menu"
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleUserMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    disableScrollLock
                    slotProps={{
                      paper: {
                        elevation: 3,
                        sx: { minWidth: 180, mt: 1 },
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography variant="subtitle2">{user.username}</Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                      </ListItemIcon>
                      {t('auth.logout')}
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content */}
      <Container component="main" maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        <Outlet />
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', mt: 'auto' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                PCQM
              </Typography>
              <Typography variant="body2" color="text.secondary">
                — {t('footer.description', 'Project Cost & Quality Management')}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.disabled">
              &copy; {new Date().getFullYear()} PCQM. {t('footer.rights', 'All rights reserved.')}
            </Typography>
          </Box>
        </Container>
      </Box>

      <TanStackRouterDevtools />
    </Box>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
