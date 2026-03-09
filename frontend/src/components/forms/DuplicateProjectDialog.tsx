import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi } from '../../services/api'
import type { Project } from '../../types'

// MUI imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

interface DuplicateOptions {
  copySettings: boolean
  copyStages: boolean
  copySteps: boolean
  copyScreenFunctions: boolean
  copyMembers: boolean
  copyMetrics: boolean
  copyStepScreenFunctions: boolean
}

interface DuplicateProjectDialogProps {
  open: boolean
  project: Project | null
  onClose: () => void
  onSuccess?: (newProject: Project) => void
}

export function DuplicateProjectDialog({
  open,
  project,
  onClose,
  onSuccess,
}: DuplicateProjectDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [options, setOptions] = useState<DuplicateOptions>({
    copySettings: true,
    copyStages: true,
    copySteps: true,
    copyScreenFunctions: true,
    copyMembers: true,
    copyMetrics: true,
    copyStepScreenFunctions: false,
  })

  useEffect(() => {
    if (project && open) {
      setNewName(`${project.name} (Copy)`)
      setNewDescription(project.description ?? '')
    }
  }, [project, open])

  const duplicateMutation = useMutation({
    mutationFn: () =>
      projectApi.duplicate(project!.id, {
        newName: newName.trim(),
        newDescription: newDescription.trim() || undefined,
        ...options,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onSuccess?.(response.data)
      handleClose()
    },
  })

  const handleClose = () => {
    duplicateMutation.reset()
    onClose()
  }

  const allChecked = Object.values(options).every(Boolean)
  const someChecked = Object.values(options).some(Boolean)

  const handleToggleAll = () => {
    const next = !allChecked
    setOptions({
      copySettings: next,
      copyStages: next,
      copySteps: next,
      copyScreenFunctions: next,
      copyMembers: next,
      copyMetrics: next,
      copyStepScreenFunctions: next,
    })
  }

  const handleChange = (key: keyof DuplicateOptions) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setOptions((prev) => {
      const updated = { ...prev, [key]: e.target.checked }
      // If stages or steps are unchecked, automatically uncheck stepScreenFunctions
      if ((key === 'copyStages' || key === 'copySteps' || key === 'copyScreenFunctions') && !e.target.checked) {
        updated.copyStepScreenFunctions = false
      }
      // If steps are unchecked, uncheck stages dependency warning
      if (key === 'copyStages' && !e.target.checked) {
        updated.copySteps = false
        updated.copyStepScreenFunctions = false
      }
      return updated
    })
  }

  const canSubmit = newName.trim().length > 0 && !duplicateMutation.isPending

  const copyItems: Array<{
    key: keyof DuplicateOptions
    labelKey: string
    descKey: string
    disabled?: boolean
  }> = [
    {
      key: 'copySettings',
      labelKey: 'project.duplicateCopySettings',
      descKey: 'project.duplicateCopySettingsDesc',
    },
    {
      key: 'copyStages',
      labelKey: 'project.duplicateCopyStages',
      descKey: 'project.duplicateCopyStagesDesc',
    },
    {
      key: 'copySteps',
      labelKey: 'project.duplicateCopySteps',
      descKey: 'project.duplicateCopyStepsDesc',
      disabled: !options.copyStages,
    },
    {
      key: 'copyScreenFunctions',
      labelKey: 'project.duplicateCopyScreenFunctions',
      descKey: 'project.duplicateCopyScreenFunctionsDesc',
    },
    {
      key: 'copyMembers',
      labelKey: 'project.duplicateCopyMembers',
      descKey: 'project.duplicateCopyMembersDesc',
    },
    {
      key: 'copyMetrics',
      labelKey: 'project.duplicateCopyMetrics',
      descKey: 'project.duplicateCopyMetricsDesc',
    },
    {
      key: 'copyStepScreenFunctions',
      labelKey: 'project.duplicateCopyStepScreenFunctions',
      descKey: 'project.duplicateCopyStepScreenFunctionsDesc',
      disabled: !options.copyStages || !options.copySteps || !options.copyScreenFunctions,
    },
  ]

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableScrollLock>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContentCopyIcon fontSize="small" color="primary" />
          <Typography variant="h6" component="span">
            {t('project.duplicateTitle', { name: project?.name ?? '' })}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* New project name */}
          <TextField
            label={t('project.duplicateNewName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            required
            size="small"
            error={newName.trim().length === 0}
            helperText={newName.trim().length === 0 ? t('project.validation.nameRequired') : ''}
          />

          {/* New description */}
          <TextField
            label={t('project.duplicateNewDescription')}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />

          <Divider />

          {/* Copy options */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {t('project.duplicateSelectContent')}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={handleToggleAll}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={500}>
                    {t('project.duplicateCopyAll')}
                  </Typography>
                }
                sx={{ mr: 0 }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {copyItems.map(({ key, labelKey, descKey, disabled }) => (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: disabled ? 'action.disabledBackground' : 'transparent',
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <Checkbox
                    checked={options[key] && !disabled}
                    onChange={handleChange(key)}
                    disabled={disabled}
                    size="small"
                    sx={{ mt: -0.25, mr: 0.5 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {t(labelKey)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t(descKey)}
                    </Typography>
                  </Box>
                  {disabled && (
                    <Tooltip title={t(descKey)}>
                      <InfoOutlinedIcon fontSize="small" color="disabled" sx={{ mt: 0.5 }} />
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Error message */}
          {duplicateMutation.isError && (
            <Alert severity="error">
              {t('project.duplicateError')}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={duplicateMutation.isPending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          startIcon={duplicateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <ContentCopyIcon />}
          onClick={() => duplicateMutation.mutate()}
          disabled={!canSubmit}
        >
          {t('project.duplicate')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
