import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { memberApi, taskWorkflowApi } from '@/services/api'
import { Button, Card, LoadingSpinner, Modal, Input } from '@/components/common'
import type { TodoItem } from '@/types'

export const Route = createFileRoute('/my-tasks')({
  component: MyTasksPage,
})

function MyTasksPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState({
    project: '',
    status: '',
    stage: '',
    search: '',
  })
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null)
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

  // Get unique values for filters
  const projects = [...new Set(todoItems?.map((item) => item.projectName) || [])]
  const stages = [...new Set(todoItems?.map((item) => item.stageName) || [])]

  // Filter items
  const filteredItems = todoItems?.filter((item) => {
    if (filter.project && item.projectName !== filter.project) return false
    if (filter.status && item.taskStatus !== filter.status) return false
    if (filter.stage && item.stageName !== filter.stage) return false
    if (filter.search && !item.screenFunctionName.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  }) || []

  // Summary stats
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Skipped': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t('todo.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('todo.subtitle')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-gray-500">{t('todo.totalTasks')}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('todo.completed')}</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{summary.completed}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('todo.inProgress')}</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{summary.inProgress}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('todo.pending')}</p>
          <p className="mt-1 text-2xl font-semibold text-yellow-600">{summary.pending}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('todo.searchPlaceholder')}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={filter.project}
          onChange={(e) => setFilter({ ...filter, project: e.target.value })}
        >
          <option value="">{t('todo.filterByProject')}</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={filter.stage}
          onChange={(e) => setFilter({ ...filter, stage: e.target.value })}
        >
          <option value="">{t('todo.filterByStage')}</option>
          {stages.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">{t('todo.filterByStatus')}</option>
          <option value="Not Started">{t('todo.statusNotStarted')}</option>
          <option value="In Progress">{t('todo.statusInProgress')}</option>
          <option value="Completed">{t('todo.statusCompleted')}</option>
          <option value="Skipped">{t('todo.statusSkipped')}</option>
        </select>
      </div>

      {/* Task Table */}
      <div className="mt-6">
        <Card>
          {filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">{t('todo.project')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('todo.stage')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('todo.step')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('todo.screen')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('todo.status')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('todo.effort')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('todo.progress')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('todo.dates')}</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.assignmentId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <span className="font-medium text-gray-900">{item.projectName}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className="px-2 py-1 text-xs rounded"
                          style={{
                            backgroundColor: item.stageColor ? `${item.stageColor}20` : '#f3f4f6',
                            color: item.stageColor || '#374151',
                          }}
                        >
                          {item.stageName}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.stepName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{item.screenFunctionName}</p>
                          <p className="text-xs text-gray-400">{item.screenFunctionType}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.taskStatus)}`}>
                          {item.taskStatus}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className="text-gray-400">{item.estimatedEffort || 0}h</span>
                        {' / '}
                        <span className="font-medium">{item.actualEffort || 0}h</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="flex items-center">
                          <div className="mr-2 w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${item.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs">{(item.progress || 0).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="text-xs">
                          {item.actualStartDate && (
                            <p>{item.actualStartDate} - {item.actualEndDate || '...'}</p>
                          )}
                          {!item.actualStartDate && item.estimatedStartDate && (
                            <p className="text-gray-400">
                              {item.estimatedStartDate} - {item.estimatedEndDate || '...'}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditModal(item)}
                        >
                          {t('common.edit')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">{t('todo.noTasks')}</p>
              <p className="text-gray-400 text-sm mt-2">{t('todo.noTasksDesc')}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Task Modal */}
      <Modal
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        title={t('todo.editTask')}
      >
        {editingTask && (
          <div className="space-y-4">
            {/* Context Info */}
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p><strong>{t('todo.project')}:</strong> {editingTask.projectName}</p>
              <p><strong>{t('todo.stage')}:</strong> {editingTask.stageName} &gt; {editingTask.stepName}</p>
              <p><strong>{t('todo.screen')}:</strong> {editingTask.screenFunctionName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('todo.actualEffort')} ({t('common.hours')})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editForm.actualEffort}
                  onChange={(e) => setEditForm({ ...editForm, actualEffort: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('todo.progress')} (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editForm.progress}
                  onChange={(e) => setEditForm({ ...editForm, progress: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('todo.actualStartDate')}
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editForm.actualStartDate}
                  onChange={(e) => setEditForm({ ...editForm, actualStartDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('todo.actualEndDate')}
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editForm.actualEndDate}
                  onChange={(e) => setEditForm({ ...editForm, actualEndDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('todo.note')}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                placeholder={t('todo.notePlaceholder')}
                value={editForm.note}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setEditingTask(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSaveEdit}
                loading={updateTaskMutation.isPending}
              >
                {t('todo.saveChanges')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
