import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { projectApi } from '../services/api'
import { format } from 'date-fns'
import { Can } from '@/ability'
import { ProjectForm } from '../components/forms/ProjectForm'
import { DuplicateProjectDialog } from '../components/forms/DuplicateProjectDialog'
import { DataTable } from '../components/common/DataTable'
import type { ColumnDef } from '../components/common/DataTable'
import type { Project } from '@/types'

// MUI imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

export const Route = createFileRoute('/projects/')({
  component: ProjectsList,
})

function ProjectsList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showAddProject, setShowAddProject] = useState(false)
  const [duplicateProject, setDuplicateProject] = useState<Project | null>(null)

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

  const columns: ColumnDef<Project>[] = [
    {
      key: 'name',
      header: t('common.name'),
      render: (project) => (
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
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (project) => (
        <Chip
          label={getStatusTranslation(project.status)}
          color={getStatusColor(project.status)}
          size="small"
        />
      ),
    },
    {
      key: 'progress',
      header: t('common.progress'),
      render: (project) => (
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
      ),
    },
    {
      key: 'estimatedEffort',
      header: t('project.estimatedEffort'),
      render: (project) => (
        <Typography variant="body2" color="text.secondary">
          {project.estimatedEffort} {t('time.mm')}
        </Typography>
      ),
    },
    {
      key: 'actualEffort',
      header: t('project.actualEffort'),
      render: (project) => (
        <Typography variant="body2" color="text.secondary">
          {project.actualEffort} {t('time.mm')}
        </Typography>
      ),
    },
    {
      key: 'startDate',
      header: t('project.startDate'),
      render: (project) => (
        <Typography variant="body2" color="text.secondary">
          {format(new Date(project.startDate), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right',
      render: (project) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id.toString() }}
            search={{ tab: 'overview' }}
            style={{ textDecoration: 'none' }}
          >
            <Button size="small" color="primary">
              {t('common.view')}
            </Button>
          </Link>
          <Can I="create" a="project">
            <Tooltip title={t('project.duplicate')}>
              <IconButton
                size="small"
                color="default"
                onClick={() => setDuplicateProject(project)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Can>
        </Box>
      ),
    },
  ]

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

      <DataTable
        columns={columns}
        data={projects ?? []}
        keyExtractor={(p) => p.id}
        emptyTitle={`${t('project.noProjects')}. ${t('project.createFirst')}`}
      />

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

      {/* Duplicate Project Dialog */}
      <DuplicateProjectDialog
        open={duplicateProject !== null}
        project={duplicateProject}
        onClose={() => setDuplicateProject(null)}
        onSuccess={(newProject) => {
          navigate({
            to: '/projects/$projectId',
            params: { projectId: newProject.id.toString() },
            search: { tab: 'overview' },
          })
        }}
      />
    </Box>
  )
}
