import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi, projectApi } from '@/services/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import type { StageOverviewData, StageStatus, EffortUnit, ProjectSettings } from '@/types';
import { convertEffort, EFFORT_UNIT_LABELS } from '@/utils/effortUtils';
import { DEFAULT_NON_WORKING_DAYS } from '@/types';
import { format } from 'date-fns';

interface StageEditModalProps {
  stage: StageOverviewData;
  projectId: number;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
  onClose: (saved?: boolean) => void;
}

export function StageEditModal({
  stage,
  projectId,
  effortUnit = 'man-hour',
  workSettings,
  onClose,
}: StageEditModalProps) {
  const { t } = useTranslation();

  // Convert effort from hours (stored) to display unit for editing
  const initialEstimatedEffort = stage.estimatedEffort
    ? convertEffort(stage.estimatedEffort, 'man-hour', effortUnit, workSettings)
    : 0;
  const initialActualEffort = stage.actualEffort
    ? convertEffort(stage.actualEffort, 'man-hour', effortUnit, workSettings)
    : 0;

  // Form state
  const [formData, setFormData] = useState({
    startDate: stage.startDate || '',
    endDate: stage.endDate || '',
    actualStartDate: stage.actualStartDate || '',
    actualEndDate: stage.actualEndDate || '',
    estimatedEffort: initialEstimatedEffort,
    actualEffort: initialActualEffort,
    status: stage.status || 'Good',
  });

  // Suggested date states
  const [suggestedEndDate, setSuggestedEndDate] = useState<string | null>(null);
  const [suggestedActualEndDate, setSuggestedActualEndDate] = useState<string | null>(null);
  const [isCalculatingEnd, setIsCalculatingEnd] = useState(false);
  const [isCalculatingActualEnd, setIsCalculatingActualEnd] = useState(false);
  const [showEstSuggestion, setShowEstSuggestion] = useState(false);
  const [showActSuggestion, setShowActSuggestion] = useState(false);
  const [estSuggestionUsed, setEstSuggestionUsed] = useState(false);
  const [actSuggestionUsed, setActSuggestionUsed] = useState(false);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      // Convert effort back to hours for storage
      const estimatedEffortHours = convertEffort(
        data.estimatedEffort,
        effortUnit,
        'man-hour',
        workSettings
      );
      const actualEffortHours = convertEffort(
        data.actualEffort,
        effortUnit,
        'man-hour',
        workSettings
      );

      return taskWorkflowApi.updateStage(stage.id, {
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        actualStartDate: data.actualStartDate || undefined,
        actualEndDate: data.actualEndDate || undefined,
        estimatedEffort: estimatedEffortHours || undefined,
        actualEffort: actualEffortHours || undefined,
        status: data.status as StageStatus,
      });
    },
    onSuccess: () => {
      onClose(true);
    },
  });

  // Calculate suggested end date for estimated dates
  const calculateSuggestedEndDate = useCallback(async () => {
    if (!formData.startDate || formData.estimatedEffort <= 0) {
      setSuggestedEndDate(null);
      return;
    }

    setIsCalculatingEnd(true);
    try {
      // Convert effort to man-days for calculation
      const effortInDays = convertEffort(
        formData.estimatedEffort,
        effortUnit,
        'man-day',
        workSettings
      );

      const wholeDays = Math.ceil(effortInDays);
      if (wholeDays <= 0) {
        setSuggestedEndDate(null);
        return;
      }

      const response = await projectApi.calculateEndDate({
        startDate: formData.startDate,
        estimatedEffortDays: wholeDays,
        projectId: projectId,
        nonWorkingDays: workSettings?.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: workSettings?.holidays || [],
      });

      setSuggestedEndDate(response.data.endDate);
    } catch (error) {
      console.error('Error calculating end date:', error);
      setSuggestedEndDate(null);
    } finally {
      setIsCalculatingEnd(false);
    }
  }, [formData.startDate, formData.estimatedEffort, effortUnit, workSettings, projectId]);

  // Calculate suggested end date for actual dates
  const calculateSuggestedActualEndDate = useCallback(async () => {
    if (!formData.actualStartDate || formData.actualEffort <= 0) {
      setSuggestedActualEndDate(null);
      return;
    }

    setIsCalculatingActualEnd(true);
    try {
      // Convert effort to man-days for calculation
      const effortInDays = convertEffort(
        formData.actualEffort,
        effortUnit,
        'man-day',
        workSettings
      );

      const wholeDays = Math.ceil(effortInDays);
      if (wholeDays <= 0) {
        setSuggestedActualEndDate(null);
        return;
      }

      const response = await projectApi.calculateEndDate({
        startDate: formData.actualStartDate,
        estimatedEffortDays: wholeDays,
        projectId: projectId,
        nonWorkingDays: workSettings?.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: workSettings?.holidays || [],
      });

      setSuggestedActualEndDate(response.data.endDate);
    } catch (error) {
      console.error('Error calculating actual end date:', error);
      setSuggestedActualEndDate(null);
    } finally {
      setIsCalculatingActualEnd(false);
    }
  }, [formData.actualStartDate, formData.actualEffort, effortUnit, workSettings, projectId]);

  // Calculate suggestion when start date or effort changes
  useEffect(() => {
    if (!showEstSuggestion) return;
    const debounceTimer = setTimeout(() => {
      calculateSuggestedEndDate();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [calculateSuggestedEndDate, showEstSuggestion]);

  useEffect(() => {
    if (!showActSuggestion) return;
    const debounceTimer = setTimeout(() => {
      calculateSuggestedActualEndDate();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [calculateSuggestedActualEndDate, showActSuggestion]);

  // Handle form field change
  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Show suggestion when start date or effort changes
    if (field === 'startDate' || field === 'estimatedEffort') {
      setShowEstSuggestion(true);
      setEstSuggestionUsed(false);
    }
    if (field === 'actualStartDate' || field === 'actualEffort') {
      setShowActSuggestion(true);
      setActSuggestionUsed(false);
    }
  };

  // Handle date change from DateInput
  const handleDateChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(field, e.target.value);
  };

  // Use suggested dates
  const useEstSuggestedDate = () => {
    if (suggestedEndDate) {
      setFormData((prev) => ({ ...prev, endDate: suggestedEndDate }));
      setEstSuggestionUsed(true);
    }
  };

  const useActSuggestedDate = () => {
    if (suggestedActualEndDate) {
      setFormData((prev) => ({ ...prev, actualEndDate: suggestedActualEndDate }));
      setActSuggestionUsed(true);
    }
  };

  // Format suggested date for display
  const formatSuggestedDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy (EEEE)');
    } catch {
      return dateStr;
    }
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  // Status options for Select
  const statusOptions = [
    { value: 'Good', label: t('status.good') },
    { value: 'Warning', label: t('status.warning') },
    { value: 'At Risk', label: t('status.atRisk') },
  ];

  // Get effort unit label
  const unitLabel = EFFORT_UNIT_LABELS[effortUnit];

  // Calculate working days for display
  const estWorkingDays = Math.ceil(convertEffort(formData.estimatedEffort, effortUnit, 'man-day', workSettings));
  const actWorkingDays = Math.ceil(convertEffort(formData.actualEffort, effortUnit, 'man-day', workSettings));

  return (
    <Dialog
      open
      onClose={() => onClose()}
      maxWidth="md"
      fullWidth
      disableScrollLock
    >
      <DialogTitle>{t('stages.editStage')}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Stage Name (readonly) */}
          <Box>
            <TextField
              label={t('stages.stageName')}
              value={stage.name}
              disabled
              fullWidth
              size="small"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('stages.stageNameReadonly')}
            </Typography>
          </Box>

          {/* Dates Section */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1.5 }}>{t('stages.scheduleDates')}</Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label={t('stages.estimatedStartDate')}
                  type="date"
                  value={formData.startDate}
                  onChange={handleDateChange('startDate')}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label={t('stages.estimatedEndDate')}
                  type="date"
                  value={formData.endDate}
                  onChange={handleDateChange('endDate')}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label={t('stages.actualStartDate')}
                  type="date"
                  value={formData.actualStartDate}
                  onChange={handleDateChange('actualStartDate')}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label={t('stages.actualEndDate')}
                  type="date"
                  value={formData.actualEndDate}
                  onChange={handleDateChange('actualEndDate')}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Effort Section */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1.5 }}>{t('stages.effort')}</Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label={`${t('stages.estimatedEffort')} (${unitLabel})`}
                  type="number"
                  value={formData.estimatedEffort}
                  onChange={(e) => handleChange('estimatedEffort', parseFloat(e.target.value) || 0)}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label={`${t('stages.actualEffort')} (${unitLabel})`}
                  type="number"
                  value={formData.actualEffort}
                  onChange={(e) => handleChange('actualEffort', parseFloat(e.target.value) || 0)}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
            </Grid>

            {/* Suggested End Date for Estimated */}
            {showEstSuggestion && formData.startDate && formData.estimatedEffort > 0 && (
              <Box sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: 1,
                border: 1,
                borderColor: estSuggestionUsed ? 'success.main' : 'primary.main',
                bgcolor: estSuggestionUsed ? 'success.light' : 'primary.light',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500} color={estSuggestionUsed ? 'success.dark' : 'primary.dark'}>
                      {estSuggestionUsed ? t('stages.endDateApplied') : t('stages.suggestedEndDate')}
                    </Typography>
                    {isCalculatingEnd ? (
                      <Typography variant="body2" color="primary">{t('common.loading')}</Typography>
                    ) : suggestedEndDate ? (
                      <Typography variant="h6" fontWeight={600} color={estSuggestionUsed ? 'success.dark' : 'primary.dark'}>
                        {formatSuggestedDate(suggestedEndDate)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{t('stages.unableToCalculate')}</Typography>
                    )}
                    <Typography variant="caption" color={estSuggestionUsed ? 'success.main' : 'primary.main'}>
                      {t('stages.basedOnWorkingDays', { days: estWorkingDays })}
                    </Typography>
                  </Box>
                  {suggestedEndDate && !estSuggestionUsed && (
                    <Button variant="contained" size="small" onClick={useEstSuggestedDate} disabled={isCalculatingEnd}>
                      {t('stages.useThisDate')}
                    </Button>
                  )}
                  {estSuggestionUsed && (
                    <Typography variant="body2" color="success.main" fontWeight={500}>{t('common.applied')}</Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Suggested End Date for Actual */}
            {showActSuggestion && formData.actualStartDate && formData.actualEffort > 0 && (
              <Box sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: 1,
                border: 1,
                borderColor: actSuggestionUsed ? 'success.main' : 'primary.main',
                bgcolor: actSuggestionUsed ? 'success.light' : 'primary.light',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500} color={actSuggestionUsed ? 'success.dark' : 'primary.dark'}>
                      {actSuggestionUsed ? t('stages.actualEndDateApplied') : t('stages.suggestedActualEndDate')}
                    </Typography>
                    {isCalculatingActualEnd ? (
                      <Typography variant="body2" color="primary">{t('common.loading')}</Typography>
                    ) : suggestedActualEndDate ? (
                      <Typography variant="h6" fontWeight={600} color={actSuggestionUsed ? 'success.dark' : 'primary.dark'}>
                        {formatSuggestedDate(suggestedActualEndDate)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{t('stages.unableToCalculate')}</Typography>
                    )}
                    <Typography variant="caption" color={actSuggestionUsed ? 'success.main' : 'primary.main'}>
                      {t('stages.basedOnWorkingDays', { days: actWorkingDays })}
                    </Typography>
                  </Box>
                  {suggestedActualEndDate && !actSuggestionUsed && (
                    <Button variant="contained" size="small" onClick={useActSuggestedDate} disabled={isCalculatingActualEnd}>
                      {t('stages.useThisDate')}
                    </Button>
                  )}
                  {actSuggestionUsed && (
                    <Typography variant="body2" color="success.main" fontWeight={500}>{t('common.applied')}</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Status Section */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1.5 }}>{t('stages.manualStatus')}</Typography>
            <FormControl fullWidth size="small">
              <InputLabel>{t('stages.status')}</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                label={t('stages.status')}
                MenuProps={{ disableScrollLock: true }}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('stages.statusAutoCalculated')}
            </Typography>
          </Box>

          {/* Info Section */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, bgcolor: 'grey.50', mx: -3, mb: -3, px: 3, py: 2 }}>
            <Grid container spacing={2}>
              <Grid size={4}>
                <Typography variant="body2" color="text.secondary">{t('stages.progress')}:</Typography>
                <Typography variant="body2" fontWeight={500}>{stage.progress}%</Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="body2" color="text.secondary">{t('stages.steps')}:</Typography>
                <Typography variant="body2" fontWeight={500}>{stage.stepsCount}</Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="body2" color="text.secondary">{t('stages.linkedScreens')}:</Typography>
                <Typography variant="body2" fontWeight={500}>{stage.linkedScreensCount}</Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 2 }}>
            <Button variant="outlined" onClick={() => onClose()}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </Box>

          {/* Error display */}
          {updateMutation.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t('common.error')}: {(updateMutation.error as Error).message}
            </Alert>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
