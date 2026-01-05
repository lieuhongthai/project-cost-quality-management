import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { projectApi } from '../services/api'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectApi.getAll()
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const activeProjects = projects?.filter(p => !p.endDate) || []
  const completedProjects = projects?.filter(p => p.endDate) || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Overview of all projects and their current status
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            Total Projects
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            {projects?.length || 0}
          </dd>
        </div>
        
        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            Active Projects
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-primary-600">
            {activeProjects.length}
          </dd>
        </div>
        
        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            Completed Projects
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">
            {completedProjects.length}
          </dd>
        </div>
        
        <div className="card">
          <dt className="text-sm font-medium text-gray-500 truncate">
            At Risk
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-red-600">
            {projects?.filter(p => p.status === 'At Risk').length || 0}
          </dd>
        </div>
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Active Projects</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project) => (
              <div key={project.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className={`status-${project.status.toLowerCase().replace(' ', '-')}`}>
                    {project.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {project.progress.toFixed(0)}% Complete
                  </span>
                </div>
                
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                
                <div className="mt-4 flex justify-between text-xs text-gray-500">
                  <span>Est: {project.estimatedEffort} MM</span>
                  <span>Act: {project.actualEffort} MM</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects?.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-gray-500">No projects found. Create your first project to get started.</p>
        </div>
      )}
    </div>
  )
}
