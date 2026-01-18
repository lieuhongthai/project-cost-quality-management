import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { projectApi } from '../services/api'
import { LoadingSpinner } from '../components/common'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { t } = useTranslation()

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectApi.getAll()
      return response.data
    },
  })

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'Good': return t('project.statusGood')
      case 'Warning': return t('project.statusWarning')
      case 'At Risk': return t('project.statusAtRisk')
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const activeProjects = projects?.filter(p => !p.endDate) || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('dashboard.overview')}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            {t('common.total')} {t('nav.projects')}
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            {projects?.length || 0}
          </dd>
        </div>

        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            {t('project.statusGood')}
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-primary-600">
            {activeProjects.length}
          </dd>
        </div>

        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            {t('project.statusWarning')}
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-yellow-600">
            {projects?.filter(p => p.status === 'Warning').length || 0}
          </dd>
        </div>

        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            {t('project.statusAtRisk')}
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-red-600">
            {projects?.filter(p => p.status === 'At Risk').length || 0}
          </dd>
        </div>
      </div>

      {/* All Projects */}
      {projects && projects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('project.list')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id.toString() }}
                className="card hover:shadow-lg transition-shadow cursor-pointer block"
              >
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{project.description}</p>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`status-${project.status.toLowerCase().replace(' ', '-')}`}>
                    {getStatusTranslation(project.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {project.progress.toFixed(0)}%
                  </span>
                </div>

                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                <div className="mt-4 flex justify-between text-xs text-gray-500">
                  <span>{t('project.estimatedEffort')}: {project.estimatedEffort} {t('time.mm')}</span>
                  <span>{t('project.actualEffort')}: {project.actualEffort} {t('time.mm')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {projects?.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-gray-500">{t('project.noProjects')}. {t('project.createFirst')}</p>
        </div>
      )}
    </div>
  )
}
