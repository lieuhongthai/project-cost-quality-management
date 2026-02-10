import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { projectApi } from '../services/api'
import { format } from 'date-fns'
import { Can } from '@/ability'
import { ProjectForm } from '../components/forms/ProjectForm'

// MUI imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'

export const Route = createFileRoute('/projects/')({
  component: ProjectsList,
})

function ProjectsList() {
  const { t } = useTranslation()
  const [showAddProject, setShowAddProject] = useState(false)

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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {t('project.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('project.list')}
          </Typography>
        </Box>
        <Can I="create" a="project">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddProject(true)}
          >
            {t('project.create')}
          </Button>
        </Can>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>{t('common.name')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('common.status')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('common.progress')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('project.estimatedEffort')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('project.actualEffort')}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{t('project.startDate')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects?.map((project) => (
              <TableRow key={project.id} hover>
                <TableCell>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id.toString() }}
                    search={{ tab: 'overview' }}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {project.name}
                    </Typography>
                  </Link>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusTranslation(project.status)}
                    color={getStatusColor(project.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={project.progress}
                      sx={{ width: 64, height: 6, borderRadius: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {project.progress.toFixed(0)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {project.estimatedEffort} {t('time.mm')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {project.actualEffort} {t('time.mm')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(project.startDate), 'MMM dd, yyyy')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id.toString() }}
                    search={{ tab: 'overview' }}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button
                      size="small"
                      color="primary"
                    >
                      {t('common.view')}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {projects?.length === 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('project.noProjects')}. {t('project.createFirst')}
          </Typography>
        </Box>
      )}

      {/* Add Project Dialog */}
      <Dialog
        open={showAddProject}
        onClose={() => setShowAddProject(false)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('project.create')}
          <IconButton size="small" onClick={() => setShowAddProject(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <ProjectForm
            onSuccess={() => setShowAddProject(false)}
            onCancel={() => setShowAddProject(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
