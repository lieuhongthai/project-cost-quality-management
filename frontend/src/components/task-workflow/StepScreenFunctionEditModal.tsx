import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Modal, Button, Input, DateInput } from '@/components/common';
import { Select, TextArea } from '@/components/common/FormFields';
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

  // State for tracking which members have metrics enabled (show metrics tab)
  const [memberMetricsEnabled, setMemberMetricsEnabled] = useState<Record<number, boolean>>({});

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
      // Auto-enable metrics tab if there are existing metrics with non-zero values
      const hasMetrics = Object.values(metricsMap).some((v) => v > 0);
      if (hasMetrics) {
        setMemberMetricsEnabled((prev) => ({ ...prev, [memberId]: true }));
      }
    } catch {
      // Error handled silently
    }
  };

  // Enable metrics for a member
  const enableMemberMetrics = (memberId: number) => {
    setMemberMetricsEnabled((prev) => ({ ...prev, [memberId]: true }));
    setMemberActiveTab((prev) => ({ ...prev, [memberId]: 'metrics' }));
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
    <Modal
      isOpen
      onClose={() => onClose()}
      title={t('stages.editScreenFunction')}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Screen/Function Info (readonly) */}
        <div className="bg-gray-50 -mx-6 -mt-2 px-6 py-4 border-b">
          <h4 className="text-sm font-medium text-gray-500">{t('screenFunction.name')}</h4>
          <p className="mt-1 text-lg font-medium text-gray-900">
            {data.screenFunction?.name || t('common.unknown')}
          </p>
          <span className={`inline-flex mt-2 px-2 py-0.5 text-xs rounded ${
            data.screenFunction?.type === 'Screen'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {data.screenFunction?.type || '-'}
          </span>
        </div>

        {/* Status */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('screenFunction.status')}
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={statusOptions}
          />
          <div>
            {/* Summary info */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('stages.summary')}
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2">
              <div>{t('screenFunction.estimatedEffort')}: <span className="font-medium">{totalEstimatedEffort}h</span></div>
              <div>{t('screenFunction.actualEffort')}: <span className="font-medium">{totalActualEffort}h</span></div>
              <div>{t('screenFunction.progress')}: <span className="font-medium">{avgProgress}%</span></div>
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-900">{t('stages.assignedMembers')}</h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowAddMember(true)}
              disabled={getAvailableMembers().length === 0}
            >
              + {t('stages.addMember')}
            </Button>
          </div>

          {/* Members Table */}
          {membersList.length > 0 ? (
            <div className="space-y-2">
              {membersList.map((member) => (
                <div key={member.id} className={`border rounded-lg ${member.isEditing ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  {/* Member Header Row */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{getMemberName(member.memberId)}</span>
                      <div className="text-xs text-gray-500 mt-1 flex gap-4">
                        <span>{t('screenFunction.estimatedEffort')}: {member.estimatedEffort}h</span>
                        <span>{t('screenFunction.actualEffort')}: {member.actualEffort}h</span>
                        <span>{t('screenFunction.progress')}: {member.progress}%</span>
                        {member.estimatedStartDate && (
                          <span>{t('stages.dates')}: {member.estimatedStartDate} → {member.estimatedEndDate || '?'}</span>
                        )}
                        {member.note && (
                          <span className="truncate max-w-[150px]" title={member.note}>📝 {member.note}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!member.isEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleEditMember(member.id!)}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteMember(member.id!)}
                            disabled={deleteMemberMutation.isPending}
                          >
                            {t('common.delete')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateMember(member)}
                            disabled={updateMemberMutation.isPending}
                          >
                            {t('common.save')}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleEditMember(member.id!)}
                          >
                            {t('common.cancel')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  {member.isEditing && (
                    <div className="border-t border-blue-200">
                      {/* Tabs */}
                      <div className="flex border-b border-blue-200 bg-blue-50/50">
                        <button
                          type="button"
                          onClick={() => setMemberActiveTab((prev) => ({ ...prev, [member.id!]: 'details' }))}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            getMemberTab(member.id!) === 'details'
                              ? 'text-blue-700 border-b-2 border-blue-500 bg-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {t('metrics.detailsTab')}
                        </button>
                        {memberMetricsEnabled[member.id!] && metricTypes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMemberActiveTab((prev) => ({ ...prev, [member.id!]: 'metrics' }))}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              getMemberTab(member.id!) === 'metrics'
                                ? 'text-blue-700 border-b-2 border-blue-500 bg-white'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {t('metrics.metricsTab')}
                          </button>
                        )}
                        {!memberMetricsEnabled[member.id!] && metricTypes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => enableMemberMetrics(member.id!)}
                            className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors flex items-center gap-1"
                          >
                            <span>+</span> {t('metrics.addMetrics')}
                          </button>
                        )}
                      </div>

                      {/* Tab Content */}
                      <div className="px-4 pb-4 pt-3">
                        {/* Details Tab */}
                        {getMemberTab(member.id!) === 'details' && (
                          <div className="space-y-3">
                            {/* Effort and Progress Row */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('screenFunction.estimatedEffort')} (h)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={member.estimatedEffort}
                                  onChange={(e) => updateMemberField(member.id!, 'estimatedEffort', Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('screenFunction.actualEffort')} (h)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={member.actualEffort}
                                  onChange={(e) => updateMemberField(member.id!, 'actualEffort', Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('screenFunction.progress')} (%)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={member.progress}
                                  onChange={(e) => updateMemberField(member.id!, 'progress', Number(e.target.value))}
                                />
                              </div>
                            </div>

                            {/* Estimated Dates Row */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">{t('stages.estimatedSchedule')}</label>
                              <div className="grid grid-cols-2 gap-4">
                                <DateInput
                                  label={t('stages.startDate')}
                                  name={`estimatedStartDate-${member.id}`}
                                  value={member.estimatedStartDate}
                                  onChange={(e) => updateMemberField(member.id!, 'estimatedStartDate', e.target.value)}
                                />
                                <DateInput
                                  label={t('stages.endDate')}
                                  name={`estimatedEndDate-${member.id}`}
                                  value={member.estimatedEndDate}
                                  onChange={(e) => updateMemberField(member.id!, 'estimatedEndDate', e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Actual Dates Row */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">{t('stages.actualSchedule')}</label>
                              <div className="grid grid-cols-2 gap-4">
                                <DateInput
                                  label={t('stages.startDate')}
                                  name={`actualStartDate-${member.id}`}
                                  value={member.actualStartDate}
                                  onChange={(e) => updateMemberField(member.id!, 'actualStartDate', e.target.value)}
                                />
                                <DateInput
                                  label={t('stages.endDate')}
                                  name={`actualEndDate-${member.id}`}
                                  value={member.actualEndDate}
                                  onChange={(e) => updateMemberField(member.id!, 'actualEndDate', e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Note Row */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">{t('common.note')}</label>
                              <TextArea
                                value={member.note}
                                onChange={(e) => updateMemberField(member.id!, 'note', e.target.value)}
                                rows={2}
                                placeholder={t('stages.memberNotePlaceholder')}
                              />
                            </div>
                          </div>
                        )}

                        {/* Metrics Tab */}
                        {getMemberTab(member.id!) === 'metrics' && memberMetricsEnabled[member.id!] && metricTypes.length > 0 && (
                          <div className="space-y-3">
                            {metricTypes.map((metricType) => (
                              <div key={metricType.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-700 mb-3">{metricType.name}</div>
                                <div className="grid grid-cols-3 gap-3">
                                  {metricType.categories?.map((category) => (
                                    <div key={category.id}>
                                      <label className="block text-xs text-gray-500 mb-1">{category.name}</label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={memberMetrics[member.id!]?.[category.id] || 0}
                                        onChange={(e) => updateMetricValue(member.id!, category.id, Number(e.target.value))}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
              {t('stages.noMembersAssigned')}
            </div>
          )}

          {/* Add Member Form */}
          {showAddMember && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
              <h5 className="text-sm font-medium text-blue-800 mb-3">{t('stages.addNewMember')}</h5>

              {/* Member Selection */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('member.name')}</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={newMember.memberId}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, memberId: Number(e.target.value) }))}
                >
                  <option value={0}>{t('stages.selectMember')}</option>
                  {getAvailableMembers().map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Effort and Progress */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('screenFunction.estimatedEffort')} (h)</label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={newMember.estimatedEffort}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, estimatedEffort: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('screenFunction.actualEffort')} (h)</label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={newMember.actualEffort}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, actualEffort: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('screenFunction.progress')} (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={newMember.progress}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, progress: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Estimated Dates */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('stages.estimatedSchedule')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <DateInput
                    label={t('stages.startDate')}
                    name="newMemberEstimatedStartDate"
                    value={newMember.estimatedStartDate}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, estimatedStartDate: e.target.value }))}
                  />
                  <DateInput
                    label={t('stages.endDate')}
                    name="newMemberEstimatedEndDate"
                    value={newMember.estimatedEndDate}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, estimatedEndDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Actual Dates */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('stages.actualSchedule')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <DateInput
                    label={t('stages.startDate')}
                    name="newMemberActualStartDate"
                    value={newMember.actualStartDate}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, actualStartDate: e.target.value }))}
                  />
                  <DateInput
                    label={t('stages.endDate')}
                    name="newMemberActualEndDate"
                    value={newMember.actualEndDate}
                    onChange={(e) => setNewMember((prev) => ({ ...prev, actualEndDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Note */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('common.note')}</label>
                <TextArea
                  value={newMember.note}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, note: e.target.value }))}
                  rows={2}
                  placeholder={t('stages.memberNotePlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddMember(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddMember}
                  disabled={newMember.memberId === 0 || createMemberMutation.isPending}
                >
                  {createMemberMutation.isPending ? t('common.saving') : t('common.add')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* SSF-level Dates */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('stages.estimatedSchedule')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label={t('stages.estimatedStartDate')}
              name="estimatedStartDate"
              value={formData.estimatedStartDate}
              onChange={handleDateChange('estimatedStartDate')}
            />
            <DateInput
              label={t('stages.estimatedEndDate')}
              name="estimatedEndDate"
              value={formData.estimatedEndDate}
              onChange={handleDateChange('estimatedEndDate')}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('stages.actualSchedule')}</h4>
          {membersList.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-2">{t('stages.actualDatesAutoCalculated')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stages.actualStartDate')}</label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
                    {calculatedActualStartDate || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stages.actualEndDate')}</label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
                    {calculatedActualEndDate || '-'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2">{t('stages.actualDatesNoMembers')}</p>
          )}
        </div>

        {/* Note */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.note')}
          </label>
          <TextArea
            value={formData.note}
            onChange={(e) => handleChange('note', e.target.value)}
            rows={3}
            placeholder={t('stages.notePlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onClose()}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={updateSSFMutation.isPending}
          >
            {updateSSFMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>

        {/* Error display */}
        {(updateSSFMutation.isError || createMemberMutation.isError || updateMemberMutation.isError || deleteMemberMutation.isError) && (
          <div className="text-red-600 text-sm mt-2">
            {t('common.error')}: {(updateSSFMutation.error as Error)?.message || (createMemberMutation.error as Error)?.message || (updateMemberMutation.error as Error)?.message || (deleteMemberMutation.error as Error)?.message}
          </div>
        )}
      </form>
    </Modal>
  );
}
