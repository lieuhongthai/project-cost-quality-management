import { createRootRoute, Link, Navigate, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/common'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAppAbility } from '@/ability'
import { Button } from '@/components/common/Button'

function RootComponent() {
  const { t } = useTranslation()
  const { user, isLoading, logout } = useAuth()
  const ability = useAppAbility()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (!user && location.pathname !== '/login') {
      navigate({ to: '/login' })
      return
    }
    if (user?.mustChangePassword && location.pathname !== '/force-change-password') {
      navigate({ to: '/force-change-password' })
    }
  }, [isLoading, user, location.pathname, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary-600">
                  PCQM
                </h1>
              </div>
              {user ? (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/"
                    className="border-primary-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    activeProps={{ className: 'border-primary-500 text-primary-600' }}
                    inactiveProps={{ className: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700' }}
                  >
                    {t('nav.dashboard')}
                  </Link>
                  {ability.can('read', 'project') && (
                    <Link
                      to="/projects"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      activeProps={{ className: 'border-primary-500 text-primary-600' }}
                    >
                      {t('nav.projects')}
                    </Link>
                  )}
                  {ability.can('read', 'member') && (
                    <Link
                      to="/my-tasks"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      activeProps={{ className: 'border-primary-500 text-primary-600' }}
                    >
                      {t('nav.myTasks')}
                    </Link>
                  )}
                  {ability.can('read', 'report') && (
                    <Link
                      to="/reports"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      activeProps={{ className: 'border-primary-500 text-primary-600' }}
                    >
                      {t('nav.reports')}
                    </Link>
                  )}
                  <Link
                    to="/benchmarks"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    activeProps={{ className: 'border-primary-500 text-primary-600' }}
                  >
                    {t('nav.benchmarks')}
                  </Link>
                  {(ability.can('manage', 'role') || ability.can('manage', 'position') || ability.can('manage', 'user')) && (
                    <Link
                      to="/iam"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      activeProps={{ className: 'border-primary-500 text-primary-600' }}
                    >
                      {t('nav.accessControl')}
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{user.username}</span>
                  <Button variant="secondary" size="sm" onClick={logout}>
                    {t('auth.logout')}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <TanStackRouterDevtools />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
