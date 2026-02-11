import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import type { StepScreenFunctionStatus, Member, ScreenFunction, StepScreenFunctionMember, TaskMemberMetric } from '@/types';

interface StepScreenFunctionData {
  id: number;
  screenFunction?: ScreenFunction;
  members?: StepScreenFunctionMember[];
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: StepScreenFunctionStatus;
  note?: string;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}

interface MemberFormData {
  id?: number;
  memberId: number;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  note: string;
  isNew?: boolean;
  isEditing?: boolean;
}

interface StepScreenFunctionEditModalProps {
  data: StepScreenFunctionData;
  members: Member[];
  projectId: number;
  onClose: (saved?: boolean) => void;
}

export function StepScreenFunctionEditModal({
  data,
  members,
  projectId,
  onClose,
}: StepScreenFunctionEditModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch metric types for this project
  const { data: metricTypes = [] } = useQuery({
    queryKey: ['metricTypes', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getMetricTypes(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  // State for member metrics (keyed by memberId)
  const [memberMetrics, setMemberMetrics] = useState<Record<number, Record<number, number>>>({});

  // State for member edit tabs: 'details' or 'metrics'
  const [memberActiveTab, setMemberActiveTab] = useState<Record<number, 'details' | 'metrics'>>({});

  // State for tracking which metric types are enabled per member (by metric type ID)
  const [memberEnabledMetricTypes, setMemberEnabledMetricTypes] = useState<Record<number, number[]>>({});

  // State for showing add metric type dropdown per member
  const [showAddMetricDropdown, setShowAddMetricDropdown] = useState<Record<number, boolean>>({});

  // Fetch metrics for a member when they expand
  const fetchMemberMetrics = async (memberId: number) => {
    if (memberMetrics[memberId]) return; // Already fetched
    try {
      const response = await taskWorkflowApi.getTaskMemberMetrics(memberId);
      const metrics = response.data;
      const metricsMap: Record<number, number> = {};
      metrics.forEach((m: TaskMemberMetric) => {
        metricsMap[m.metricCategoryId] = m.value;
      });
      setMemberMetrics((prev) => ({ ...prev, [memberId]: metricsMap }));

      // Auto-enable metric types that have values
      if (metricTypes.length > 0) {
        const enabledTypeIds: number[] = [];
        metricTypes.forEach((type) => {
          const hasValues = type.categories?.some((cat) => metricsMap[cat.id] > 0);
          if (hasValues) {
            enabledTypeIds.push(type.id);
          }
        });
        if (enabledTypeIds.length > 0) {
          setMemberEnabledMetricTypes((prev) => ({ ...prev, [memberId]: enabledTypeIds }));
        }
      }
    } catch {
      // Error handled silently
    }
  };

  // Add a specific metric type for a member
  const addMetricTypeForMember = (memberId: number, metricTypeId: number) => {
    setMemberEnabledMetricTypes((prev) => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), metricTypeId],
    }));
    setShowAddMetricDropdown((prev) => ({ ...prev, [memberId]: false }));
    // Switch to metrics tab
    setMemberActiveTab((prev) => ({ ...prev, [memberId]: 'metrics' }));
  };

  // Remove a specific metric type for a member
  const removeMetricTypeForMember = (memberId: number, metricTypeId: number) => {
    setMemberEnabledMetricTypes((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).filter((id) => id !== metricTypeId),
    }));
  };

  // Get enabled metric types for a member
  const getEnabledMetricTypes = (memberId: number) => {
    const enabledIds = memberEnabledMetricTypes[memberId] || [];
    return metricTypes.filter((type) => enabledIds.includes(type.id));
  };

  // Get available metric types to add for a member (not yet enabled)
  const getAvailableMetricTypes = (memberId: number) => {
    const enabledIds = memberEnabledMetricTypes[memberId] || [];
    return metricTypes.filter((type) => !enabledIds.includes(type.id));
  };

  // Check if member has any metric types enabled
  const hasMemberMetrics = (memberId: number) => {
    return (memberEnabledMetricTypes[memberId] || []).length > 0;
  };

  // Get active tab for a member
  const getMemberTab = (memberId: number) => memberActiveTab[memberId] || 'details';

  // Update metric value locally
  const updateMetricValue = (memberId: number, categoryId: number, value: number) => {
    setMemberMetrics((prev) => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [categoryId]: value,
      },
    }));
  };

  // Save member metrics
  const saveMetricsMutation = useMutation({
    mutationFn: async ({ memberId, metrics }: { memberId: number; metrics: Record<number, number> }) => {
      const metricsArray = Object.entries(metrics).map(([categoryId, value]) => ({
        metricCategoryId: parseInt(categoryId),
        value: value || 0,
      }));
      return taskWorkflowApi.bulkUpsertTaskMemberMetrics({
        stepScreenFunctionMemberId: memberId,
        metrics: metricsArray,
      });
    },
  });

  // Form state for SSF level fields
  const [formData, setFormData] = useState({
    status: data.status || 'Not Started',
    note: data.note || '',
    estimatedStartDate: data.estimatedStartDate || '',
    estimatedEndDate: data.estimatedEndDate || '',
    actualStartDate: data.actualStartDate || '',
    actualEndDate: data.actualEndDate || '',
  });

  // Members list state
  const [membersList, setMembersList] = useState<MemberFormData[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState<MemberFormData>({
    memberId: 0,
    estimatedEffort: 0,
    actualEffort: 0,
    progress: 0,
    estimatedStartDate: '',
    estimatedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    note: '',
    isNew: true,
  });

  // Initialize members list from data
  useEffect(() => {
    if (data.members) {
      setMembersList(
        data.members.map((m) => ({
          id: m.id,
          memberId: m.memberId,
          estimatedEffort: m.estimatedEffort || 0,
          actualEffort: m.actualEffort || 0,
          progress: m.progress || 0,
          estimatedStartDate: m.estimatedStartDate || '',
          estimatedEndDate: m.estimatedEndDate || '',
          actualStartDate: m.actualStartDate || '',
          actualEndDate: m.actualEndDate || '',
          note: m.note || '',
          isEditing: false,
        }))
      );
    }
  }, [data.members]);

  // Calculate totals from members
  const totalEstimatedEffort = membersList.reduce((sum, m) => sum + (m.estimatedEffort || 0), 0);
  const totalActualEffort = membersList.reduce((sum, m) => sum + (m.actualEffort || 0), 0);
  const avgProgress = membersList.length > 0
    ? Math.round(membersList.reduce((sum, m) => sum + (m.progress || 0), 0) / membersList.length)
    : 0;

  // Calculate actual dates from members (MIN start, MAX end)
  const calculatedActualStartDate = membersList.length > 0
    ? membersList
        .map((m) => m.actualStartDate)
        .filter((d) => d && d.trim() !== '')
        .sort()[0] || ''
    : '';
  const calculatedActualEndDate = membersList.length > 0
    ? membersList
        .map((m) => m.actualEndDate)
        .filter((d) => d && d.trim() !== '')
        .sort()
        .reverse()[0] || ''
    : '';

  // Update SSF mutation
  const updateSSFMutation = useMutation({
    mutationFn: () =>
      taskWorkflowApi.updateStepScreenFunction(data.id, {
        status: formData.status as StepScreenFunctionStatus,
        note: formData.note || undefined,
        estimatedStartDate: formData.estimatedStartDate || undefined,
        estimatedEndDate: formData.estimatedEndDate || undefined,
        // Actual dates are calculated from members
        actualStartDate: calculatedActualStartDate || undefined,
        actualEndDate: calculatedActualEndDate || undefined,
      }),
  });

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: (memberData: MemberFormData) =>
      taskWorkflowApi.createStepScreenFunctionMember({
        stepScreenFunctionId: data.id,
        memberId: memberData.memberId,
        estimatedEffort: memberData.estimatedEffort,
        actualEffort: memberData.actualEffort,
        progress: memberData.progress,
        estimatedStartDate: memberData.estimatedStartDate || undefined,
        estimatedEndDate: memberData.estimatedEndDate || undefined,
        actualStartDate: memberData.actualStartDate || undefined,
        actualEndDate: memberData.actualEndDate || undefined,
        note: memberData.note || undefined,
      }),
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ id, ...memberData }: MemberFormData & { id: number }) =>
      taskWorkflowApi.updateStepScreenFunctionMember(id, {
        memberId: memberData.memberId,
        estimatedEffort: memberData.estimatedEffort,
        actualEffort: memberData.actualEffort,
        progress: memberData.progress,
        estimatedStartDate: memberData.estimatedStartDate || undefined,
        estimatedEndDate: memberData.estimatedEndDate || undefined,
        actualStartDate: memberData.actualStartDate || undefined,
        actualEndDate: memberData.actualEndDate || undefined,
        note: memberData.note || undefined,
      }),
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteStepScreenFunctionMember(id),
  });

  // Handle form field change
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle date change from DateInput
  const handleDateChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(field, e.target.value);
  };

  // Add new member
  const handleAddMember = async () => {
    if (newMember.memberId === 0) return;

    try {
      const response = await createMemberMutation.mutateAsync(newMember);
      const createdMember = response.data;
      // Add new member to local state
      setMembersList((prev) => [
        ...prev,
        {
          id: createdMember.id,
          memberId: createdMember.memberId,
          estimatedEffort: createdMember.estimatedEffort || 0,
          actualEffort: createdMember.actualEffort || 0,
          progress: createdMember.progress || 0,
          estimatedStartDate: createdMember.estimatedStartDate || '',
          estimatedEndDate: createdMember.estimatedEndDate || '',
          actualStartDate: createdMember.actualStartDate || '',
          actualEndDate: createdMember.actualEndDate || '',
          note: createdMember.note || '',
          isEditing: false,
        },
      ]);
      // Reset form
      setNewMember({
        memberId: 0,
        estimatedEffort: 0,
        actualEffort: 0,
        progress: 0,
        estimatedStartDate: '',
        estimatedEndDate: '',
        actualStartDate: '',
        actualEndDate: '',
        note: '',
        isNew: true,
      });
      setShowAddMember(false);
      // Refresh data in background (don't close modal)
      queryClient.invalidateQueries({ queryKey: ['stageDetail'] });
    } catch {
      // Error handled by mutation
    }
  };

  // Update existing member
  const handleUpdateMember = async (memberData: MemberFormData) => {
    if (!memberData.id) return;

    try {
      await updateMemberMutation.mutateAsync({ id: memberData.id, ...memberData });

      // Save metrics if any
      const metrics = memberMetrics[memberData.id];
      if (metrics && Object.keys(metrics).length > 0) {
        await saveMetricsMutation.mutateAsync({ memberId: memberData.id, metrics });
      }

      // Update local state
      setMembersList((prev) =>
        prev.map((m) => (m.id === memberData.id ? { ...memberData, isEditing: false } : m))
      );
      queryClient.invalidateQueries({ queryKey: ['stageDetail'] });
    } catch {
      // Error handled by mutation
    }
  };

  // Delete member
  const handleDeleteMember = async (id: number) => {
    if (!confirm(t('stages.confirmDeleteMember'))) return;

    try {
      await deleteMemberMutation.mutateAsync(id);
      setMembersList((prev) => prev.filter((m) => m.id !== id));
      queryClient.invalidateQueries({ queryKey: ['stageDetail'] });
    } catch {
      // Error handled by mutation
    }
  };

  // Toggle edit mode for a member
  const toggleEditMember = (id: number) => {
    const member = membersList.find((m) => m.id === id);
    if (member && !member.isEditing) {
      // Fetch metrics when expanding
      fetchMemberMetrics(id);
    }
    setMembersList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isEditing: !m.isEditing } : m))
    );
  };

  // Update member field locally
  const updateMemberField = (id: number, field: keyof MemberFormData, value: string | number) => {
    setMembersList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSSFMutation.mutateAsync();
      onClose(true);
    } catch {
      // Error handled by mutation
    }
  };

  // Get member name by ID
  const getMemberName = (memberId: number) => {
    const member = members.find((m) => m.id === memberId);
    return member ? `${member.name} (${member.role})` : t('common.unknown');
  };

  // Get available members (not yet assigned)
  const getAvailableMembers = () => {
    const assignedIds = membersList.map((m) => m.memberId);
    return members.filter((m) => !assignedIds.includes(m.id));
  };

  // Status options
  const statusOptions = [
    { value: 'Not Started', label: t('screenFunction.statusNotStarted') },
    { value: 'In Progress', label: t('screenFunction.statusInProgress') },
    { value: 'Completed', label: t('screenFunction.statusCompleted') },
    { value: 'Skipped', label: t('screenFunction.statusSkipped') },
  ];

  return (
    <Dialog
      open
      onClose={() => onClose()}
      maxWidth="lg"
      fullWidth
      disableScrollLock
    >
      <DialogTitle>{t('stages.editScreenFunction')}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Screen/Function Info (readonly) */}
          <Box sx={{ bgcolor: 'grey.50', mx: -3, mt: -1, px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">{t('screenFunction.name')}</Typography>
            <Typography variant="h6" fontWeight={500}>
              {data.screenFunction?.name || t('common.unknown')}
            </Typography>
            <Chip
              label={data.screenFunction?.type || '-'}
              size="small"
              color={data.screenFunction?.type === 'Screen' ? 'secondary' : 'primary'}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Status */}
          <Grid container spacing={2}>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('screenFunction.status')}</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label={t('screenFunction.status')}
                  MenuProps={{ disableScrollLock: true }}
                >
                  {statusOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              {/* Summary info */}
              <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>{t('stages.summary')}</Typography>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, px: 1.5, py: 1 }}>
                <Typography variant="body2">{t('screenFunction.estimatedEffort')}: <strong>{totalEstimatedEffort}h</strong></Typography>
                <Typography variant="body2">{t('screenFunction.actualEffort')}: <strong>{totalActualEffort}h</strong></Typography>
                <Typography variant="body2">{t('screenFunction.progress')}: <strong>{avgProgress}%</strong></Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Members Section */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={500}>{t('stages.assignedMembers')}</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowAddMember(true)}
                disabled={getAvailableMembers().length === 0}
              >
                + {t('stages.addMember')}
              </Button>
            </Box>

            {/* Members Table */}
            {membersList.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {membersList.map((member) => (
                  <Box key={member.id} sx={{ border: 1, borderRadius: 1, borderColor: member.isEditing ? 'primary.main' : 'divider', bgcolor: member.isEditing ? 'primary.light' : 'background.paper' }}>
                    {/* Member Header Row */}
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>{getMemberName(member.memberId)}</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">{t('screenFunction.estimatedEffort')}: {member.estimatedEffort}h</Typography>
                          <Typography variant="caption" color="text.secondary">{t('screenFunction.actualEffort')}: {member.actualEffort}h</Typography>
                          <Typography variant="caption" color="text.secondary">{t('screenFunction.progress')}: {member.progress}%</Typography>
                          {member.estimatedStartDate && (
                            <Typography variant="caption" color="text.secondary">{t('stages.dates')}: {member.estimatedStartDate} → {member.estimatedEndDate || '?'}</Typography>
                          )}
                          {member.note && (
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={member.note}>📝 {member.note}</Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!member.isEditing ? (
                          <>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => toggleEditMember(member.id!)}
                            >
                              {t('common.edit')}
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleDeleteMember(member.id!)}
                              disabled={deleteMemberMutation.isPending}
                            >
                              {t('common.delete')}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleUpdateMember(member)}
                              disabled={updateMemberMutation.isPending}
                            >
                              {t('common.save')}
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => toggleEditMember(member.id!)}
                            >
                              {t('common.cancel')}
                            </Button>
                        </>
                      )}
                      </Box>
                    </Box>

                  {/* Expanded Edit Form */}
                  {member.isEditing && (
                    <Box sx={{ borderTop: 1, borderColor: 'primary.light' }}>
                      {/* Tabs */}
                      <Tabs
                        value={getMemberTab(member.id!) === 'metrics' ? 1 : 0}
                        onChange={(_, newValue) => setMemberActiveTab((prev) => ({ ...prev, [member.id!]: newValue === 1 ? 'metrics' : 'details' }))}
                        sx={{ bgcolor: 'primary.light', minHeight: 40 }}
                      >
                        <Tab label={t('metrics.detailsTab')} sx={{ minHeight: 40 }} />
                        {hasMemberMetrics(member.id!) && (
                          <Tab label={`${t('metrics.metricsTab')} (${getEnabledMetricTypes(member.id!).length})`} sx={{ minHeight: 40 }} />
                        )}
                      </Tabs>
                      {/* Add Metric Type Dropdown */}
                      {metricTypes.length > 0 && getAvailableMetricTypes(member.id!).length > 0 && (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <Button
                            size="small"
                            color="success"
                            onClick={() => setShowAddMetricDropdown((prev) => ({ ...prev, [member.id!]: !prev[member.id!] }))}
                            sx={{ mx: 1 }}
                          >
                            + {t('metrics.addMetricType')}
                          </Button>
                          {showAddMetricDropdown[member.id!] && (
                            <Box sx={{ position: 'absolute', top: '100%', left: 8, mt: 0.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 2, zIndex: 10, minWidth: 200 }}>
                              {getAvailableMetricTypes(member.id!).map((type) => (
                                <Box
                                  key={type.id}
                                  onClick={() => addMetricTypeForMember(member.id!, type.id)}
                                  sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, display: 'flex', alignItems: 'center', gap: 1 }}
                                >
                                  <Typography variant="body2" color="success.main">+</Typography>
                                  <Typography variant="body2">{type.name}</Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Tab Content */}
                      <Box sx={{ px: 2, pb: 2, pt: 1.5 }}>
                        {/* Details Tab */}
                        {getMemberTab(member.id!) === 'details' && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {/* Effort and Progress Row */}
                            <Grid container spacing={2}>
                              <Grid size={4}>
                                <TextField
                                  label={`${t('screenFunction.estimatedEffort')} (h)`}
                                  type="number"
                                  size="small"
                                  fullWidth
                                  value={member.estimatedEffort}
                                  onChange={(e) => updateMemberField(member.id!, 'estimatedEffort', Number(e.target.value))}
                                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                                />
                              </Grid>
                              <Grid size={4}>
                                <TextField
                                  label={`${t('screenFunction.actualEffort')} (h)`}
                                  type="number"
                                  size="small"
                                  fullWidth
                                  value={member.actualEffort}
                                  onChange={(e) => updateMemberField(member.id!, 'actualEffort', Number(e.target.value))}
                                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                                />
                              </Grid>
                              <Grid size={4}>
                                <TextField
                                  label={`${t('screenFunction.progress')} (%)`}
                                  type="number"
                                  size="small"
                                  fullWidth
                                  value={member.progress}
                                  onChange={(e) => updateMemberField(member.id!, 'progress', Number(e.target.value))}
                                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                />
                              </Grid>
                            </Grid>

                            {/* Estimated Dates Row */}
                            <Box>
                              <Typography variant="caption" fontWeight={500} sx={{ mb: 0.5 }}>{t('stages.estimatedSchedule')}</Typography>
                              <Grid container spacing={2}>
                                <Grid size={6}>
                                  <TextField
                                    label={t('stages.startDate')}
                                    type="date"
                                    size="small"
                                    fullWidth
                                    value={member.estimatedStartDate}
                                    onChange={(e) => updateMemberField(member.id!, 'estimatedStartDate', e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                  />
                                </Grid>
                                <Grid size={6}>
                                  <TextField
                                    label={t('stages.endDate')}
                                    type="date"
                                    size="small"
                                    fullWidth
                                    value={member.estimatedEndDate}
                                    onChange={(e) => updateMemberField(member.id!, 'estimatedEndDate', e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                  />
                                </Grid>
                              </Grid>
                            </Box>

                            {/* Actual Dates Row */}
                            <Box>
                              <Typography variant="caption" fontWeight={500} sx={{ mb: 0.5 }}>{t('stages.actualSchedule')}</Typography>
                              <Grid container spacing={2}>
                                <Grid size={6}>
                                  <TextField
                                    label={t('stages.startDate')}
                                    type="date"
                                    size="small"
                                    fullWidth
                                    value={member.actualStartDate}
                                    onChange={(e) => updateMemberField(member.id!, 'actualStartDate', e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                  />
                                </Grid>
                                <Grid size={6}>
                                  <TextField
                                    label={t('stages.endDate')}
                                    type="date"
                                    size="small"
                                    fullWidth
                                    value={member.actualEndDate}
                                    onChange={(e) => updateMemberField(member.id!, 'actualEndDate', e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                  />
                                </Grid>
                              </Grid>
                            </Box>

                            {/* Note Row */}
                            <TextField
                              label={t('common.note')}
                              multiline
                              rows={2}
                              size="small"
                              fullWidth
                              value={member.note}
                              onChange={(e) => updateMemberField(member.id!, 'note', e.target.value)}
                              placeholder={t('stages.memberNotePlaceholder')}
                            />
                          </Box>
                        )}

                        {/* Metrics Tab */}
                        {getMemberTab(member.id!) === 'metrics' && hasMemberMetrics(member.id!) && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {getEnabledMetricTypes(member.id!).map((metricType) => (
                              <Box key={metricType.id} sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                  <Typography variant="body2" fontWeight={500}>{metricType.name}</Typography>
                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() => removeMetricTypeForMember(member.id!, metricType.id)}
                                  >
                                    {t('common.delete')}
                                  </Button>
                                </Box>
                                <Grid container spacing={1.5}>
                                  {metricType.categories?.map((category) => (
                                    <Grid key={category.id} size={4}>
                                      <TextField
                                        label={category.name}
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={memberMetrics[member.id!]?.[category.id] || 0}
                                        onChange={(e) => updateMetricValue(member.id!, category.id, Number(e.target.value))}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                      />
                                    </Grid>
                                  ))}
                                </Grid>
                              </Box>
                            ))}
                            {getEnabledMetricTypes(member.id!).length === 0 && (
                              <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="body2" color="text.secondary">{t('metrics.noMetricsSelected')}</Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">{t('stages.noMembersAssigned')}</Typography>
              </Box>
            )}

            {/* Add Member Form */}
            {showAddMember && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1, border: 1, borderColor: 'primary.main' }}>
                <Typography variant="subtitle2" color="primary.dark" sx={{ mb: 1.5 }}>{t('stages.addNewMember')}</Typography>

                {/* Member Selection */}
                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                  <InputLabel>{t('member.name')}</InputLabel>
                  <Select
                    value={newMember.memberId}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, memberId: Number(e.target.value) }))}
                    label={t('member.name')}
                    MenuProps={{ disableScrollLock: true }}
                  >
                    <MenuItem value={0}>{t('stages.selectMember')}</MenuItem>
                    {getAvailableMembers().map((member) => (
                      <MenuItem key={member.id} value={member.id}>{member.name} ({member.role})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Effort and Progress */}
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  <Grid size={4}>
                    <TextField
                      label={`${t('screenFunction.estimatedEffort')} (h)`}
                      type="number"
                      size="small"
                      fullWidth
                      value={newMember.estimatedEffort}
                      onChange={(e) => setNewMember((prev) => ({ ...prev, estimatedEffort: Number(e.target.value) }))}
                      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      label={`${t('screenFunction.actualEffort')} (h)`}
                      type="number"
                      size="small"
                      fullWidth
                      value={newMember.actualEffort}
                      onChange={(e) => setNewMember((prev) => ({ ...prev, actualEffort: Number(e.target.value) }))}
                      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      label={`${t('screenFunction.progress')} (%)`}
                      type="number"
                      size="small"
                      fullWidth
                      value={newMember.progress}
                      onChange={(e) => setNewMember((prev) => ({ ...prev, progress: Number(e.target.value) }))}
                      slotProps={{ htmlInput: { min: 0, max: 100 } }}
                    />
                  </Grid>
                </Grid>

                {/* Estimated Dates */}
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={500}>{t('stages.estimatedSchedule')}</Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <TextField
                        label={t('stages.startDate')}
                        type="date"
                        size="small"
                        fullWidth
                        value={newMember.estimatedStartDate}
                        onChange={(e) => setNewMember((prev) => ({ ...prev, estimatedStartDate: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        label={t('stages.endDate')}
                        type="date"
                        size="small"
                        fullWidth
                        value={newMember.estimatedEndDate}
                        onChange={(e) => setNewMember((prev) => ({ ...prev, estimatedEndDate: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Actual Dates */}
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={500}>{t('stages.actualSchedule')}</Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <TextField
                        label={t('stages.startDate')}
                        type="date"
                        size="small"
                        fullWidth
                        value={newMember.actualStartDate}
                        onChange={(e) => setNewMember((prev) => ({ ...prev, actualStartDate: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        label={t('stages.endDate')}
                        type="date"
                        size="small"
                        fullWidth
                        value={newMember.actualEndDate}
                        onChange={(e) => setNewMember((prev) => ({ ...prev, actualEndDate: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Note */}
                <TextField
                  label={t('common.note')}
                  multiline
                  rows={2}
                  size="small"
                  fullWidth
                  value={newMember.note}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder={t('stages.memberNotePlaceholder')}
                  sx={{ mb: 1.5 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowAddMember(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAddMember}
                    disabled={newMember.memberId === 0 || createMemberMutation.isPending}
                  >
                    {createMemberMutation.isPending ? t('common.saving') : t('common.add')}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {/* SSF-level Dates */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1.5 }}>{t('stages.estimatedSchedule')}</Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label={t('stages.estimatedStartDate')}
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.estimatedStartDate}
                  onChange={handleDateChange('estimatedStartDate')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label={t('stages.estimatedEndDate')}
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.estimatedEndDate}
                  onChange={handleDateChange('estimatedEndDate')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1.5 }}>{t('stages.actualSchedule')}</Typography>
            {membersList.length > 0 ? (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>{t('stages.actualDatesAutoCalculated')}</Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t('stages.actualStartDate')}</Typography>
                    <Box sx={{ px: 1.5, py: 1, bgcolor: 'grey.100', border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                      <Typography variant="body2">{calculatedActualStartDate || '-'}</Typography>
                    </Box>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t('stages.actualEndDate')}</Typography>
                    <Box sx={{ px: 1.5, py: 1, bgcolor: 'grey.100', border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                      <Typography variant="body2">{calculatedActualEndDate || '-'}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </>
            ) : (
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, px: 1.5, py: 1 }}>
                <Typography variant="body2" color="text.secondary">{t('stages.actualDatesNoMembers')}</Typography>
              </Box>
            )}
          </Box>

          {/* Note */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <TextField
              label={t('common.note')}
              multiline
              rows={3}
              size="small"
              fullWidth
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder={t('stages.notePlaceholder')}
            />
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button variant="outlined" onClick={() => onClose()}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={updateSSFMutation.isPending}>
              {updateSSFMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </Box>

          {/* Error display */}
          {(updateSSFMutation.isError || createMemberMutation.isError || updateMemberMutation.isError || deleteMemberMutation.isError) && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t('common.error')}: {(updateSSFMutation.error as Error)?.message || (createMemberMutation.error as Error)?.message || (updateMemberMutation.error as Error)?.message || (deleteMemberMutation.error as Error)?.message}
            </Alert>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
