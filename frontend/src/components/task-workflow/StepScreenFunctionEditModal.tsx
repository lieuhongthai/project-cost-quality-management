import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Modal, Button, Input, DateInput } from '@/components/common';
import { Select, TextArea } from '@/components/common/FormFields';
import type { StepScreenFunctionStatus, Member, ScreenFunction, StepScreenFunctionMember } from '@/types';

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
  onClose: (saved?: boolean) => void;
}

export function StepScreenFunctionEditModal({
  data,
  members,
  onClose,
}: StepScreenFunctionEditModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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

  // Update SSF mutation
  const updateSSFMutation = useMutation({
    mutationFn: () =>
      taskWorkflowApi.updateStepScreenFunction(data.id, {
        status: formData.status as StepScreenFunctionStatus,
        note: formData.note || undefined,
        estimatedStartDate: formData.estimatedStartDate || undefined,
        estimatedEndDate: formData.estimatedEndDate || undefined,
        actualStartDate: formData.actualStartDate || undefined,
        actualEndDate: formData.actualEndDate || undefined,
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
      await createMemberMutation.mutateAsync(newMember);
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
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['stageDetail'] });
      onClose(true);
    } catch {
      // Error handled by mutation
    }
  };

  // Update existing member
  const handleUpdateMember = async (memberData: MemberFormData) => {
    if (!memberData.id) return;

    try {
      await updateMemberMutation.mutateAsync({ id: memberData.id, ...memberData });
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('member.name')}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t('screenFunction.estimatedEffort')} (h)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t('screenFunction.actualEffort')} (h)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t('screenFunction.progress')} (%)</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {membersList.map((member) => (
                    <tr key={member.id} className={member.isEditing ? 'bg-blue-50' : ''}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {getMemberName(member.memberId)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {member.isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={member.estimatedEffort}
                            onChange={(e) => updateMemberField(member.id!, 'estimatedEffort', Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        ) : (
                          member.estimatedEffort
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {member.isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={member.actualEffort}
                            onChange={(e) => updateMemberField(member.id!, 'actualEffort', Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        ) : (
                          member.actualEffort
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {member.isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={member.progress}
                            onChange={(e) => updateMemberField(member.id!, 'progress', Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        ) : (
                          member.progress
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {member.isEditing ? (
                          <div className="flex justify-center gap-1">
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
                          </div>
                        ) : (
                          <div className="flex justify-center gap-1">
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
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <div className="grid grid-cols-4 gap-3">
                <div>
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
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label={t('stages.actualStartDate')}
              name="actualStartDate"
              value={formData.actualStartDate}
              onChange={handleDateChange('actualStartDate')}
            />
            <DateInput
              label={t('stages.actualEndDate')}
              name="actualEndDate"
              value={formData.actualEndDate}
              onChange={handleDateChange('actualEndDate')}
            />
          </div>
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
