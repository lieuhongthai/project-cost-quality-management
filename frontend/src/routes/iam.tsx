import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { iamApi } from '@/services/api'
import { Button, Card, EmptyState, LoadingSpinner } from '@/components/common'
import { useAppAbility } from '@/ability'
import type { Permission, Role } from '@/types'

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

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [draftPermissionKeys, setDraftPermissionKeys] = useState<string[]>([])

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

  const isReadOnly = !ability.can('manage', 'role') || !!selectedRole?.isSystem
  const isLoading = isLoadingRoles || isLoadingPermissions

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
      </div>
    </div>
  )
}
