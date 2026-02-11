import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { projectApi } from '../services/api'

// MUI imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'

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

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'Good': return 'success'
      case 'Warning': return 'warning'
      case 'At Risk': return 'error'
      default: return 'default'
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress />
      </Box>
    )
  }

  const activeProjects = projects?.filter(p => !p.endDate) || []

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.overview')}
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" noWrap>
                {t('common.total')} {t('nav.projects')}
              </Typography>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1 }}>
                {projects?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" noWrap>
                {t('project.statusGood')}
              </Typography>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1, color: 'success.main' }}>
                {activeProjects.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" noWrap>
                {t('project.statusWarning')}
              </Typography>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1, color: 'warning.main' }}>
                {projects?.filter(p => p.status === 'Warning').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" noWrap>
                {t('project.statusAtRisk')}
              </Typography>
              <Typography variant="h4" fontWeight={600} sx={{ mt: 1, color: 'error.main' }}>
                {projects?.filter(p => p.status === 'At Risk').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* All Projects */}
      {projects && projects.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight={500} sx={{ mb: 2 }}>
            {t('project.list')}
          </Typography>
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={project.id}>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id.toString() }}
                  search={{ tab: 'overview' }}
                  style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: 4 },
                    }}
                  >
                    <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {project.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {project.description}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Chip
                        label={getStatusTranslation(project.status)}
                        color={getStatusColor(project.status)}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {project.progress.toFixed(0)}%
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={project.progress}
                      sx={{ height: 8, borderRadius: 1, mb: 2 }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('project.estimatedEffort')}: {project.estimatedEffort} {t('time.mm')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('project.actualEffort')}: {project.actualEffort} {t('time.mm')}
                      </Typography>
                    </Box>
                  </CardContent>
                  </Card>
                </Link>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {projects?.length === 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('project.noProjects')}. {t('project.createFirst')}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
