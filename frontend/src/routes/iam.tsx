import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { iamApi } from '@/services/api'
import { Button, Card, EmptyState, LoadingSpinner } from '@/components/common'
import { useAppAbility } from '@/ability'
import type { Permission, Position, Role } from '@/types'

export const Route = createFileRoute('/iam')({
  component: IamPage,
})

const groupPermissions = (permissions: Permission[]) => {
  const grouped = new Map<string, Permission[]>()
  permissions.forEach((permission) => {
    const [subject] = permission.key.split('.')
    const groupKey = subject || 'misc'
    const list = grouped.get(groupKey) ?? []
    list.push(permission)
    grouped.set(groupKey, list)
  })
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, items]) => ({
      subject,
      items: [...items].sort((first, second) => first.key.localeCompare(second.key)),
    }))
}

function IamPage() {
  const { t } = useTranslation()
  const ability = useAppAbility()
  const queryClient = useQueryClient()

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: async () => {
      const response = await iamApi.listRoles()
      return response.data
    },
  })

  const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: async () => {
      const response = await iamApi.listPermissions()
      return response.data
    },
  })

  const { data: positions, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['iam', 'positions'],
    queryFn: async () => {
      const response = await iamApi.listPositions()
      return response.data
    },
  })

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [draftPermissionKeys, setDraftPermissionKeys] = useState<string[]>([])
  const [newRoleName, setNewRoleName] = useState('')
  const [newRolePermissionKeys, setNewRolePermissionKeys] = useState<string[]>([])
  const [newPositionName, setNewPositionName] = useState('')
  const [newPositionRoleIds, setNewPositionRoleIds] = useState<number[]>([])

  useEffect(() => {
    if (!selectedRoleId && roles && roles.length > 0) {
      setSelectedRoleId(roles[0].id)
    }
  }, [roles, selectedRoleId])

  const selectedRole = useMemo(
    () => roles?.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  )

  useEffect(() => {
    if (selectedRole) {
      setDraftPermissionKeys(selectedRole.permissions.map((permission) => permission.key))
    }
  }, [selectedRole])

  const groupedPermissions = useMemo(
    () => groupPermissions(permissions ?? []),
    [permissions],
  )

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, permissionKeys }: { roleId: number; permissionKeys: string[] }) =>
      iamApi.updateRole(roleId, { permissionKeys }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] })
    },
  })

  const createRoleMutation = useMutation({
    mutationFn: (payload: { name: string; permissionKeys: string[] }) =>
      iamApi.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] })
      setNewRoleName('')
      setNewRolePermissionKeys([])
    },
  })

  const createPositionMutation = useMutation({
    mutationFn: (payload: { name: string; roleIds: number[] }) =>
      iamApi.createPosition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'positions'] })
      setNewPositionName('')
      setNewPositionRoleIds([])
    },
  })

  const isReadOnly = !ability.can('manage', 'role') || !!selectedRole?.isSystem
  const isLoading = isLoadingRoles || isLoadingPermissions || isLoadingPositions

  const togglePermission = (permissionKey: string) => {
    if (isReadOnly) return
    setDraftPermissionKeys((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((key) => key !== permissionKey)
        : [...prev, permissionKey].sort(),
    )
  }

  const handleSave = () => {
    if (!selectedRole) return
    updateRoleMutation.mutate({ roleId: selectedRole.id, permissionKeys: draftPermissionKeys })
  }

  const toggleNewRolePermission = (permissionKey: string) => {
    setNewRolePermissionKeys((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((key) => key !== permissionKey)
        : [...prev, permissionKey].sort(),
    )
  }

  const toggleNewPositionRole = (roleId: number) => {
    setNewPositionRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId].sort((a, b) => a - b),
    )
  }

  const handleCreateRole = () => {
    if (!newRoleName.trim() || newRolePermissionKeys.length === 0) return
    createRoleMutation.mutate({
      name: newRoleName.trim(),
      permissionKeys: newRolePermissionKeys,
    })
  }

  const handleCreatePosition = () => {
    if (!newPositionName.trim() || newPositionRoleIds.length === 0) return
    createPositionMutation.mutate({
      name: newPositionName.trim(),
      roleIds: newPositionRoleIds,
    })
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!roles || roles.length === 0) {
    return (
      <EmptyState
        title={t('iam.noRoles')}
        description={t('iam.noRolesHint')}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('iam.title')}</h1>
        <p className="text-gray-500">{t('iam.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card title={t('iam.rolesTitle')}>
          <div className="space-y-2">
            {roles.map((role: Role) => {
              const isSelected = role.id === selectedRoleId
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        {t('iam.systemRole')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('iam.permissionCount', { count: role.permissions.length })}
                  </p>
                </button>
              )
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card
            title={selectedRole ? t('iam.permissionsTitle', { role: selectedRole.name }) : t('iam.permissions')}
            actions={(
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!selectedRole || isReadOnly || updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? t('common.loading') : t('iam.save')}
              </Button>
            )}
          >
            {selectedRole ? (
              <div className="space-y-6">
                {selectedRole.isSystem && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    {t('iam.systemRoleHint')}
                  </div>
                )}
                {!ability.can('manage', 'role') && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    {t('iam.readOnlyHint')}
                  </div>
                )}
                {groupedPermissions.map(({ subject, items }) => (
                  <div key={subject}>
                    <h3 className="text-sm font-semibold uppercase text-gray-500">
                      {subject}
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {items.map((permission) => (
                        <label
                          key={permission.key}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            draftPermissionKeys.includes(permission.key)
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 text-gray-700'
                          } ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600"
                            checked={draftPermissionKeys.includes(permission.key)}
                            disabled={isReadOnly}
                            onChange={() => togglePermission(permission.key)}
                          />
                          <span>{permission.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t('iam.selectRole')} />
            )}
          </Card>

          <Card title={t('iam.createRoleTitle')}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('iam.roleName')}</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                  placeholder={t('iam.roleNamePlaceholder')}
                  disabled={!ability.can('manage', 'role')}
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">{t('iam.assignPermissions')}</p>
                {groupedPermissions.map(({ subject, items }) => (
                  <div key={subject}>
                    <p className="text-xs font-semibold uppercase text-gray-500">{subject}</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {items.map((permission) => (
                        <label
                          key={`new-${permission.key}`}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            newRolePermissionKeys.includes(permission.key)
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 text-gray-700'
                          } ${ability.can('manage', 'role') ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600"
                            checked={newRolePermissionKeys.includes(permission.key)}
                            disabled={!ability.can('manage', 'role')}
                            onChange={() => toggleNewRolePermission(permission.key)}
                          />
                          <span>{permission.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleCreateRole}
                  disabled={
                    !ability.can('manage', 'role')
                    || !newRoleName.trim()
                    || newRolePermissionKeys.length === 0
                    || createRoleMutation.isPending
                  }
                >
                  {createRoleMutation.isPending ? t('common.loading') : t('iam.createRole')}
                </Button>
              </div>
            </div>
          </Card>

          <Card title={t('iam.createPositionTitle')}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('iam.positionName')}</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  value={newPositionName}
                  onChange={(event) => setNewPositionName(event.target.value)}
                  placeholder={t('iam.positionNamePlaceholder')}
                  disabled={!ability.can('manage', 'position')}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{t('iam.assignRoles')}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {roles.map((role) => (
                    <label
                      key={`position-role-${role.id}`}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        newPositionRoleIds.includes(role.id)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-700'
                      } ${ability.can('manage', 'position') ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary-600"
                        checked={newPositionRoleIds.includes(role.id)}
                        disabled={!ability.can('manage', 'position')}
                        onChange={() => toggleNewPositionRole(role.id)}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleCreatePosition}
                  disabled={
                    !ability.can('manage', 'position')
                    || !newPositionName.trim()
                    || newPositionRoleIds.length === 0
                    || createPositionMutation.isPending
                  }
                >
                  {createPositionMutation.isPending ? t('common.loading') : t('iam.createPosition')}
                </Button>
              </div>
            </div>
          </Card>

          <Card title={t('iam.positionsTitle')}>
            {positions && positions.length > 0 ? (
              <div className="space-y-3">
                {positions.map((position: Position) => (
                  <div key={position.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{position.name}</p>
                      {position.isSystem && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                          {t('iam.systemRole')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('iam.positionRoleCount', { count: position.roles.length })}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {position.roles.map((role) => (
                        <span key={role.id} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t('iam.noPositions')} description={t('iam.noPositionsHint')} />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
