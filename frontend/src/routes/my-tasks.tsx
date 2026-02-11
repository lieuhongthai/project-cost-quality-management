import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { memberApi, taskWorkflowApi } from '@/services/api'
import { Pencil, Copy, Check, ArrowLeft } from 'lucide-react'
import type { TodoItem } from '@/types'

// MUI imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
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
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

export const Route = createFileRoute('/my-tasks')({
  component: MyTasksPage,
})

function MyTasksPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    status: '',
    stage: '',
    search: '',
  })
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    actualEffort: 0,
    progress: 0,
    actualStartDate: '',
    actualEndDate: '',
    note: '',
  })

  const { data: todoItems, isLoading } = useQuery({
    queryKey: ['myTodo'],
    queryFn: async () => {
      const response = await memberApi.getMyTodoList()
      return response.data
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: (data: { id: number; updates: Record<string, any> }) =>
      taskWorkflowApi.updateStepScreenFunctionMember(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTodo'] })
      setEditingTask(null)
    },
  })

  // Group items by project for the project selection view
  const projectGroups = useMemo(() => {
    if (!todoItems) return []
    const map = new Map<string, { projectId: number; projectName: string; items: TodoItem[] }>()
    for (const item of todoItems) {
      if (!map.has(item.projectName)) {
        map.set(item.projectName, { projectId: item.projectId, projectName: item.projectName, items: [] })
      }
      map.get(item.projectName)!.items.push(item)
    }
    return Array.from(map.values())
  }, [todoItems])

  // Items for the selected project, sorted by stage → step → screenFunction
  const projectItems = useMemo(() => {
    if (!selectedProject || !todoItems) return []

    const items = todoItems.filter((item) => item.projectName === selectedProject)

    // Sort by stageOrder → stepOrder → screenFunctionName
    items.sort((a, b) => {
      if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder
      if (a.stepOrder !== b.stepOrder) return a.stepOrder - b.stepOrder
      return a.screenFunctionName.localeCompare(b.screenFunctionName)
    })

    return items
  }, [selectedProject, todoItems])

  // Get unique stages for the selected project
  const stages = useMemo(() => {
    const stageSet = new Set(projectItems.map((item) => item.stageName))
    return Array.from(stageSet)
  }, [projectItems])

  // Filter items
  const filteredItems = useMemo(() => {
    return projectItems.filter((item) => {
      if (filter.status && item.taskStatus !== filter.status) return false
      if (filter.stage && item.stageName !== filter.stage) return false
      if (filter.search && !item.screenFunctionName.toLowerCase().includes(filter.search.toLowerCase())) return false
      return true
    })
  }, [projectItems, filter])

  // Summary stats for filtered items
  const summary = {
    total: filteredItems.length,
    completed: filteredItems.filter((i) => i.taskStatus === 'Completed').length,
    inProgress: filteredItems.filter((i) => i.taskStatus === 'In Progress').length,
    pending: filteredItems.filter((i) => i.taskStatus === 'Not Started').length,
  }

  const openEditModal = (item: TodoItem) => {
    setEditingTask(item)
    setEditForm({
      actualEffort: item.actualEffort || 0,
      progress: item.progress || 0,
      actualStartDate: item.actualStartDate || '',
      actualEndDate: item.actualEndDate || '',
      note: item.note || '',
    })
  }

  const handleSaveEdit = () => {
    if (!editingTask) return
    updateTaskMutation.mutate({
      id: editingTask.assignmentId,
      updates: {
        actualEffort: editForm.actualEffort,
        progress: editForm.progress,
        actualStartDate: editForm.actualStartDate || undefined,
        actualEndDate: editForm.actualEndDate || undefined,
        note: editForm.note || undefined,
      },
    })
  }

  const getStatusColor = (status: string): 'success' | 'info' | 'default' | 'warning' => {
    switch (status) {
      case 'Completed': return 'success'
      case 'In Progress': return 'info'
      case 'Skipped': return 'default'
      default: return 'warning'
    }
  }

  const copyRowText = (item: TodoItem) => {
    const text = `[${item.projectName}] [${item.stageName}] [${item.stepName}] ${item.screenFunctionName}`
    navigator.clipboard.writeText(text)
    setCopiedId(item.assignmentId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getProjectSummary = (items: TodoItem[]) => {
    const completed = items.filter((i) => i.taskStatus === 'Completed').length
    const total = items.length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, progress }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress />
      </Box>
    )
  }

  // Project Selection View
  if (!selectedProject) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {t('todo.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('todo.subtitle')}
          </Typography>
        </Box>

        {projectGroups.length > 0 ? (
          <Grid container spacing={2}>
            {projectGroups.map((group) => {
              const stats = getProjectSummary(group.items)
              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={group.projectName}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main', boxShadow: 3 },
                    }}
                    onClick={() => {
                      setSelectedProject(group.projectName)
                      setFilter({ status: '', stage: '', search: '' })
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {group.projectName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {stats.total} {t('todo.totalTasks').toLowerCase()}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          {stats.completed} {t('todo.completed').toLowerCase()}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {t('todo.progress')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {stats.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={stats.progress}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary">
                {t('todo.noTasks')}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                {t('todo.noTasksDesc')}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    )
  }

  // Task Table View (after project is selected)
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => setSelectedProject(null)} size="small">
          <ArrowLeft size={20} />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {selectedProject}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('todo.subtitle')}
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('todo.totalTasks')}
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {summary.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('todo.completed')}
              </Typography>
              <Typography variant="h5" fontWeight={600} color="success.main">
                {summary.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('todo.inProgress')}
              </Typography>
              <Typography variant="h5" fontWeight={600} color="info.main">
                {summary.inProgress}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('todo.pending')}
              </Typography>
              <Typography variant="h5" fontWeight={600} color="warning.main">
                {summary.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TextField
          placeholder={t('todo.searchPlaceholder')}
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          size="small"
          sx={{ minWidth: 200, flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('todo.filterByStage')}</InputLabel>
          <Select
            value={filter.stage}
            onChange={(e) => setFilter({ ...filter, stage: e.target.value })}
            label={t('todo.filterByStage')}
            MenuProps={{ disableScrollLock: true }}
          >
            <MenuItem value="">{t('todo.filterByStage')}</MenuItem>
            {stages.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('todo.filterByStatus')}</InputLabel>
          <Select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            label={t('todo.filterByStatus')}
            MenuProps={{ disableScrollLock: true }}
          >
            <MenuItem value="">{t('todo.filterByStatus')}</MenuItem>
            <MenuItem value="Not Started">{t('todo.statusNotStarted')}</MenuItem>
            <MenuItem value="In Progress">{t('todo.statusInProgress')}</MenuItem>
            <MenuItem value="Completed">{t('todo.statusCompleted')}</MenuItem>
            <MenuItem value="Skipped">{t('todo.statusSkipped')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Task Table */}
      {filteredItems.length > 0 ? (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>{t('todo.stage')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('todo.step')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('todo.screen')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('todo.status')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('todo.effort')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('todo.progress')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('todo.dates')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.assignmentId} hover>
                  <TableCell>
                    <Chip
                      label={item.stageName}
                      size="small"
                      sx={{
                        bgcolor: item.stageColor ? `${item.stageColor}20` : 'grey.100',
                        color: item.stageColor || 'text.primary',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.stepName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {item.screenFunctionName}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {item.screenFunctionType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.taskStatus}
                      size="small"
                      color={getStatusColor(item.taskStatus)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      <Typography component="span" color="text.disabled">
                        {item.estimatedEffort || 0}h
                      </Typography>
                      {' / '}
                      <Typography component="span" fontWeight={500}>
                        {item.actualEffort || 0}h
                      </Typography>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={item.progress || 0}
                        sx={{ width: 60, height: 6, borderRadius: 1 }}
                      />
                      <Typography variant="caption">
                        {(item.progress || 0).toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {item.actualStartDate && (
                        <span>{item.actualStartDate} - {item.actualEndDate || '...'}</span>
                      )}
                      {!item.actualStartDate && item.estimatedStartDate && (
                        <span style={{ color: '#9ca3af' }}>
                          {item.estimatedStartDate} - {item.estimatedEndDate || '...'}
                        </span>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => openEditModal(item)}
                        title={t('common.edit')}
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => copyRowText(item)}
                        title={t('todo.copyOutput')}
                      >
                        {copiedId === item.assignmentId ? (
                          <Check size={16} color="green" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              {t('todo.noTasks')}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              {t('todo.noTasksDesc')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Edit Task Dialog */}
      <Dialog
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('todo.editTask')}
          <IconButton size="small" onClick={() => setEditingTask(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editingTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Context Info */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2">
                  <strong>{t('todo.project')}:</strong> {editingTask.projectName}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('todo.stage')}:</strong> {editingTask.stageName} &gt; {editingTask.stepName}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('todo.screen')}:</strong> {editingTask.screenFunctionName}
                </Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label={`${t('todo.actualEffort')} (${t('common.hours')})`}
                    type="number"
                    value={editForm.actualEffort}
                    onChange={(e) => setEditForm({ ...editForm, actualEffort: parseFloat(e.target.value) || 0 })}
                    fullWidth
                    size="small"
                    slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label={`${t('todo.progress')} (%)`}
                    type="number"
                    value={editForm.progress}
                    onChange={(e) => setEditForm({ ...editForm, progress: parseFloat(e.target.value) || 0 })}
                    fullWidth
                    size="small"
                    slotProps={{ htmlInput: { min: 0, max: 100 } }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label={t('todo.actualStartDate')}
                    type="date"
                    value={editForm.actualStartDate}
                    onChange={(e) => setEditForm({ ...editForm, actualStartDate: e.target.value })}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label={t('todo.actualEndDate')}
                    type="date"
                    value={editForm.actualEndDate}
                    onChange={(e) => setEditForm({ ...editForm, actualEndDate: e.target.value })}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </Grid>

              <TextField
                label={t('todo.note')}
                multiline
                rows={3}
                placeholder={t('todo.notePlaceholder')}
                value={editForm.note}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                fullWidth
                size="small"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTask(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={updateTaskMutation.isPending}
          >
            {updateTaskMutation.isPending ? <CircularProgress size={20} /> : t('todo.saveChanges')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
