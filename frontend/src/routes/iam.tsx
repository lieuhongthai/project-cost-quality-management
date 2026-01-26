import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { iamApi } from '@/services/api'
import { Button, Card, EmptyState, LoadingSpinner, Checkbox, Radio, IconButton } from '@/components/common'
import { useAppAbility } from '@/ability'
import type { Permission, Position, Role, User } from '@/types'
import {
  Shield,
  Users,
  Plus,
  UserCog,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Check,
  UserPlus,
  Key,
} from 'lucide-react'

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

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: async () => {
      const response = await iamApi.listUsers()
      return response.data
    },
  })

  const [activeTab, setActiveTab] = useState<'roles' | 'positions' | 'users' | 'create'>('roles')
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [draftPermissionKeys, setDraftPermissionKeys] = useState<string[]>([])
  const [newRoleName, setNewRoleName] = useState('')
  const [newRolePermissionKeys, setNewRolePermissionKeys] = useState<string[]>([])
  const [newPositionName, setNewPositionName] = useState('')
  const [newPositionRoleIds, setNewPositionRoleIds] = useState<number[]>([])
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingPositionId, setEditingPositionId] = useState<number | null>(null)
  const [editingPositionName, setEditingPositionName] = useState('')
  const [editingPositionRoleIds, setEditingPositionRoleIds] = useState<number[]>([])
  const [isEditingPositionRoles, setIsEditingPositionRoles] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPasswordMode, setNewUserPasswordMode] = useState<'default' | 'email'>('default')
  const [newUserPositionId, setNewUserPositionId] = useState<number | null>(null)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editingUsername, setEditingUsername] = useState('')
  const [editingUserEmail, setEditingUserEmail] = useState('')
  const [editingUserPositionId, setEditingUserPositionId] = useState<number | null>(null)

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

  const updateRoleNameMutation = useMutation({
    mutationFn: ({ roleId, name }: { roleId: number; name: string }) =>
      iamApi.updateRole(roleId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] })
      setEditingRoleId(null)
      setEditingRoleName('')
    },
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: number) => iamApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] })
      if (selectedRoleId === editingRoleId) {
        setSelectedRoleId(null)
      }
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

  const updatePositionMutation = useMutation({
    mutationFn: ({ positionId, name }: { positionId: number; name: string }) =>
      iamApi.updatePosition(positionId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'positions'] })
      setEditingPositionId(null)
      setEditingPositionName('')
    },
  })

  const updatePositionRolesMutation = useMutation({
    mutationFn: ({ positionId, roleIds }: { positionId: number; roleIds: number[] }) =>
      iamApi.updatePosition(positionId, { roleIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'positions'] })
      setIsEditingPositionRoles(false)
      setEditingPositionId(null)
      setEditingPositionRoleIds([])
    },
  })

  const deletePositionMutation = useMutation({
    mutationFn: (positionId: number) => iamApi.deletePosition(positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'positions'] })
    },
  })

  const createUserMutation = useMutation({
    mutationFn: (payload: {
      username: string;
      email?: string;
      positionId: number;
      passwordMode: 'default' | 'email';
      mustChangePassword?: boolean;
    }) =>
      iamApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'users'] })
      setNewUsername('')
      setNewUserEmail('')
      setNewUserPasswordMode('default')
      setNewUserPositionId(null)
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { username?: string; email?: string; positionId?: number; mustChangePassword?: boolean } }) =>
      iamApi.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'users'] })
      setEditingUserId(null)
      setEditingUsername('')
      setEditingUserEmail('')
      setEditingUserPositionId(null)
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => iamApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'users'] })
    },
  })

  const isReadOnly = !ability.can('manage', 'role') || !!selectedRole?.isSystem
  const isLoading = isLoadingRoles || isLoadingPermissions || isLoadingPositions || isLoadingUsers

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

  const handleEditRole = (role: Role) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
  }

  const handleSaveRoleName = () => {
    if (!editingRoleId || !editingRoleName.trim()) return
    updateRoleNameMutation.mutate({
      roleId: editingRoleId,
      name: editingRoleName.trim(),
    })
  }

  const handleCancelEditRole = () => {
    setEditingRoleId(null)
    setEditingRoleName('')
  }

  const handleDeleteRole = (roleId: number, roleName: string) => {
    if (!window.confirm(t('iam.deleteRoleConfirm', { name: roleName }))) return
    deleteRoleMutation.mutate(roleId)
  }

  const handleEditPosition = (position: Position) => {
    setEditingPositionId(position.id)
    setEditingPositionName(position.name)
  }

  const handleSavePositionName = () => {
    if (!editingPositionId || !editingPositionName.trim()) return
    updatePositionMutation.mutate({
      positionId: editingPositionId,
      name: editingPositionName.trim(),
    })
  }

  const handleCancelEditPosition = () => {
    setEditingPositionId(null)
    setEditingPositionName('')
  }

  const handleDeletePosition = (positionId: number, positionName: string) => {
    if (!window.confirm(t('iam.deletePositionConfirm', { name: positionName }))) return
    deletePositionMutation.mutate(positionId)
  }

  const handleEditPositionRoles = (position: Position) => {
    setEditingPositionId(position.id)
    setEditingPositionRoleIds(position.roles.map(r => r.id))
    setIsEditingPositionRoles(true)
  }

  const handleSavePositionRoles = () => {
    if (!editingPositionId) return
    updatePositionRolesMutation.mutate({
      positionId: editingPositionId,
      roleIds: editingPositionRoleIds,
    })
  }

  const handleCancelEditPositionRoles = () => {
    setIsEditingPositionRoles(false)
    setEditingPositionId(null)
    setEditingPositionRoleIds([])
  }

  const togglePositionRole = (roleId: number) => {
    setEditingPositionRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId].sort((a, b) => a - b),
    )
  }

  const handleCreateUser = () => {
    if (!newUsername.trim() || !newUserPositionId) return
    // If passwordMode is 'email', email is required
    if (newUserPasswordMode === 'email' && !newUserEmail.trim()) return

    createUserMutation.mutate({
      username: newUsername.trim(),
      email: newUserEmail.trim() || undefined,
      positionId: newUserPositionId,
      passwordMode: newUserPasswordMode,
      mustChangePassword: true,
    })
  }

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id)
    setEditingUsername(user.username)
    setEditingUserEmail(user.email || '')
    setEditingUserPositionId(user.positionId)
  }

  const handleSaveUser = () => {
    if (!editingUserId || !editingUsername.trim() || !editingUserPositionId) return
    updateUserMutation.mutate({
      userId: editingUserId,
      data: {
        username: editingUsername.trim(),
        email: editingUserEmail.trim() || undefined,
        positionId: editingUserPositionId,
      },
    })
  }

  const handleCancelEditUser = () => {
    setEditingUserId(null)
    setEditingUsername('')
    setEditingUserEmail('')
    setEditingUserPositionId(null)
  }

  const handleDeleteUser = (userId: number, username: string) => {
    if (!window.confirm(t('iam.deleteUserConfirm', { name: username }))) return
    deleteUserMutation.mutate(userId)
  }

  const handleResetPassword = (userId: number, username: string) => {
    const newPassword = window.prompt(t('iam.resetPasswordPrompt', { name: username }))
    if (!newPassword || !newPassword.trim()) return
    // Backend doesn't have reset password endpoint in current implementation
    // We can add it later if needed
    alert(t('iam.resetPasswordNotImplemented'))
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

  const tabs = [
    { id: 'roles' as const, label: t('iam.rolesTab'), icon: Shield },
    { id: 'positions' as const, label: t('iam.positionsTab'), icon: Briefcase },
    { id: 'users' as const, label: t('iam.usersTab'), icon: Users },
    { id: 'create' as const, label: t('iam.createTab'), icon: Plus },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('iam.title')}</h1>
        <p className="text-gray-500">{t('iam.subtitle')}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition focus:outline-none focus:ring-0 ${
                activeTab === id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'roles' && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Roles List */}
            <Card
              title={(
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-gray-500" />
                  <span>{t('iam.rolesTitle')}</span>
                </div>
              )}
            >
              <div className="space-y-2">
                {roles.map((role: Role) => {
                  const isSelected = role.id === selectedRoleId
                  const isEditing = editingRoleId === role.id
                  const canManage = ability.can('manage', 'role') && !role.isSystem

                  return (
                    <div
                      key={role.id}
                      className={`rounded-lg border transition ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRoleId(role.id)}
                        className="w-full px-3 py-2.5 text-left focus:outline-none focus:ring-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          {isEditing ? (
                            <div className="flex flex-1 items-center gap-2">
                              <input
                                type="text"
                                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                                value={editingRoleName}
                                onChange={(e) => setEditingRoleName(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                              <IconButton
                                variant="success"
                                icon={<Check className="h-4 w-4" />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSaveRoleName()
                                }}
                                disabled={updateRoleNameMutation.isPending}
                              />
                              <IconButton
                                variant="default"
                                icon={<X className="h-4 w-4" />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelEditRole()
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                                {role.name}
                              </span>
                              <div className="flex items-center gap-2">
                                {role.isSystem && (
                                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                                    System
                                  </span>
                                )}
                                {canManage && (
                                  <div className="flex items-center gap-1">
                                    <IconButton
                                      variant="primary"
                                      icon={<Edit2 className="h-3.5 w-3.5" />}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditRole(role)
                                      }}
                                      className="hover:bg-white"
                                    />
                                    <IconButton
                                      variant="danger"
                                      icon={<Trash2 className="h-3.5 w-3.5" />}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteRole(role.id, role.name)
                                      }}
                                      className="hover:bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {!isEditing && (
                          <p className={`mt-1 text-xs ${isSelected ? 'text-primary-600' : 'text-gray-500'}`}>
                            {t('iam.permissionCount', { count: role.permissions.length })}
                          </p>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Permissions Editor */}
            <Card
              title={
                selectedRole ? (
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-500" />
                    <span>{t('iam.permissionsTitle', { role: selectedRole.name })}</span>
                  </div>
                ) : (
                  t('iam.permissions')
                )
              }
              actions={
                selectedRole && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isReadOnly || updateRoleMutation.isPending}
                  >
                    {updateRoleMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {t('common.loading')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('iam.save')}
                      </div>
                    )}
                  </Button>
                )
              }
            >
              {selectedRole ? (
                <div className="space-y-6">
                  {selectedRole.isSystem && (
                    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                      <p className="text-sm text-amber-700">{t('iam.systemRoleHint')}</p>
                    </div>
                  )}
                  {!ability.can('manage', 'role') && (
                    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                      <p className="text-sm text-blue-700">{t('iam.readOnlyHint')}</p>
                    </div>
                  )}
                  <div className="space-y-6">
                    {groupedPermissions.map(({ subject, items }) => (
                      <div key={subject}>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
                          {subject}
                          <span className="text-xs font-normal text-gray-400">
                            ({items.filter(p => draftPermissionKeys.includes(p.key)).length}/{items.length})
                          </span>
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {items.map((permission) => (
                            <label
                              key={permission.key}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                                draftPermissionKeys.includes(permission.key)
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
                              } ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded text-primary-600 focus:ring-0 focus:outline-none"
                                checked={draftPermissionKeys.includes(permission.key)}
                                disabled={isReadOnly}
                                onChange={() => togglePermission(permission.key)}
                              />
                              <span className="flex-1">{permission.key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState title={t('iam.selectRole')} />
              )}
            </Card>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="space-y-6">
            <Card
              title={(
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span>{t('iam.positionsTitle')}</span>
                </div>
              )}
            >
              {positions && positions.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {positions.map((position: Position) => {
                    const isEditingName = editingPositionId === position.id && !isEditingPositionRoles
                    const canManage = ability.can('manage', 'position') && !position.isSystem

                    return (
                      <div
                        key={position.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          {isEditingName ? (
                            <div className="flex flex-1 items-center gap-2">
                              <Briefcase className="h-5 w-5 text-gray-400" />
                              <input
                                type="text"
                                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                                value={editingPositionName}
                                onChange={(e) => setEditingPositionName(e.target.value)}
                                autoFocus
                              />
                              <IconButton
                                variant="success"
                                icon={<Check className="h-4 w-4" />}
                                onClick={handleSavePositionName}
                                disabled={updatePositionMutation.isPending}
                              />
                              <IconButton
                                variant="default"
                                icon={<X className="h-4 w-4" />}
                                onClick={handleCancelEditPosition}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-gray-400" />
                                <h3 className="font-semibold text-gray-900">{position.name}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                {position.isSystem && (
                                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                                    System
                                  </span>
                                )}
                                {canManage && (
                                  <div className="flex items-center gap-1">
                                    <IconButton
                                      variant="primary"
                                      icon={<Edit2 className="h-3.5 w-3.5" />}
                                      onClick={() => handleEditPosition(position)}
                                      tooltip={t('iam.editPositionName')}
                                    />
                                    <IconButton
                                      variant="danger"
                                      icon={<Trash2 className="h-3.5 w-3.5" />}
                                      onClick={() => handleDeletePosition(position.id, position.name)}
                                      tooltip={t('iam.deletePosition')}
                                    />
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {!isEditingName && (
                          <>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {t('iam.positionRoleCount', { count: position.roles.length })}
                              </p>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleEditPositionRoles(position)}
                                  className="text-primary-600 hover:text-primary-700 hover:underline hover:bg-transparent"
                                >
                                  {t('iam.editRoles')}
                                </Button>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {position.roles.length > 0 ? (
                                position.roles.map((role) => (
                                  <span
                                    key={role.id}
                                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                                  >
                                    <Shield className="h-3 w-3" />
                                    {role.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">{t('iam.noRolesAssigned')}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  title={t('iam.noPositions')}
                  description={t('iam.noPositionsHint')}
                />
              )}
            </Card>

            {/* Edit Position Roles Modal */}
            {isEditingPositionRoles && editingPositionId && (
              <Card
                title={(
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-500" />
                    <span>
                      {t('iam.editPositionRoles', {
                        name: positions?.find(p => p.id === editingPositionId)?.name,
                      })}
                    </span>
                  </div>
                )}
                actions={(
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditPositionRoles}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePositionRoles}
                      disabled={updatePositionRolesMutation.isPending || editingPositionRoleIds.length === 0}
                    >
                      {updatePositionRolesMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          {t('common.loading')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {t('iam.saveRoles')}
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              >
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">{t('iam.selectRolesToAssign')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roles.map((role) => (
                      <label
                        key={`edit-position-role-${role.id}`}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition cursor-pointer ${
                          editingPositionRoleIds.includes(role.id)
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded text-primary-600 focus:ring-0 focus:outline-none"
                          checked={editingPositionRoleIds.includes(role.id)}
                          onChange={() => togglePositionRole(role.id)}
                        />
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span className="flex-1">{role.name}</span>
                        {role.isSystem && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            System
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                  {editingPositionRoleIds.length === 0 && (
                    <p className="text-sm text-amber-600">{t('iam.atLeastOneRole')}</p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <Card
            title={(
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-gray-500" />
                <span>{t('iam.usersTitle')}</span>
              </div>
            )}
          >
            {users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {t('iam.username')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {t('iam.email')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {t('iam.position')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {t('iam.mustChangePassword')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {t('common.created')}
                      </th>
                      {ability.can('manage', 'user') && (
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          {t('common.actions')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => {
                      const isEditing = editingUserId === user.id
                      const isSuperAdmin = user.username === 'super-admin'
                      const canManage = ability.can('manage', 'user') && !isSuperAdmin

                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                                value={editingUsername}
                                onChange={(e) => setEditingUsername(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{user.username}</span>
                                {isSuperAdmin && (
                                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                                    Super Admin
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="email"
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                                value={editingUserEmail}
                                onChange={(e) => setEditingUserEmail(e.target.value)}
                                placeholder={t('iam.emailPlaceholder')}
                              />
                            ) : (
                              <span className="text-sm text-gray-600">
                                {user.email || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                                value={editingUserPositionId || ''}
                                onChange={(e) => setEditingUserPositionId(Number(e.target.value))}
                              >
                                <option value="">{t('iam.selectPosition')}</option>
                                {positions?.map((position) => (
                                  <option key={position.id} value={position.id}>
                                    {position.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-sm text-gray-600">
                                {user.position?.name || t('common.unknown')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              user.mustChangePassword
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {user.mustChangePassword ? t('common.yes') : t('common.no')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          {ability.can('manage', 'user') && (
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-2">
                                  <IconButton
                                    variant="success"
                                    icon={<Check className="h-4 w-4" />}
                                    onClick={handleSaveUser}
                                    disabled={updateUserMutation.isPending}
                                  />
                                  <IconButton
                                    variant="default"
                                    icon={<X className="h-4 w-4" />}
                                    onClick={handleCancelEditUser}
                                  />
                                </div>
                              ) : canManage ? (
                                <div className="flex items-center justify-end gap-1">
                                  <IconButton
                                    variant="primary"
                                    icon={<Edit2 className="h-4 w-4" />}
                                    onClick={() => handleEditUser(user)}
                                    tooltip={t('iam.editUser')}
                                  />
                                  <IconButton
                                    variant="info"
                                    icon={<Key className="h-4 w-4" />}
                                    onClick={() => handleResetPassword(user.id, user.username)}
                                    tooltip={t('iam.resetPassword')}
                                  />
                                  <IconButton
                                    variant="danger"
                                    icon={<Trash2 className="h-4 w-4" />}
                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                    tooltip={t('iam.deleteUser')}
                                  />
                                </div>
                              ) : null}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('iam.noUsers')}
                description={t('iam.noUsersHint')}
              />
            )}
          </Card>
        )}

        {activeTab === 'create' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Create Role */}
            <Card
              title={(
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-gray-500" />
                  <span>{t('iam.createRoleTitle')}</span>
                </div>
              )}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('iam.roleName')}
                  </label>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                    placeholder={t('iam.roleNamePlaceholder')}
                    disabled={!ability.can('manage', 'role')}
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    {t('iam.assignPermissions')}
                  </p>
                  <div className="max-h-[500px] space-y-4 overflow-y-auto rounded-lg border border-gray-200 p-4">
                    {groupedPermissions.map(({ subject, items }) => (
                      <div key={subject}>
                        <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                          {subject}
                        </h4>
                        <div className="space-y-2">
                          {items.map((permission) => (
                            <label
                              key={`new-${permission.key}`}
                              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                                newRolePermissionKeys.includes(permission.key)
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
                              } ${ability.can('manage', 'role') ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded text-primary-600 focus:ring-0 focus:outline-none"
                                checked={newRolePermissionKeys.includes(permission.key)}
                                disabled={!ability.can('manage', 'role')}
                                onChange={() => toggleNewRolePermission(permission.key)}
                              />
                              <span className="flex-1">{permission.key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleCreateRole}
                    disabled={
                      !ability.can('manage', 'role')
                      || !newRoleName.trim()
                      || newRolePermissionKeys.length === 0
                      || createRoleMutation.isPending
                    }
                  >
                    {createRoleMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {t('common.loading')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t('iam.createRole')}
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Create Position */}
            <Card
              title={(
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-500" />
                  <span>{t('iam.createPositionTitle')}</span>
                </div>
              )}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('iam.positionName')}
                  </label>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newPositionName}
                    onChange={(event) => setNewPositionName(event.target.value)}
                    placeholder={t('iam.positionNamePlaceholder')}
                    disabled={!ability.can('manage', 'position')}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {t('iam.assignRoles')}
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-1">
                    {roles.map((role) => (
                      <label
                        key={`position-role-${role.id}`}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                          newPositionRoleIds.includes(role.id)
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        } ${ability.can('manage', 'position') ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded text-primary-600 focus:ring-0 focus:outline-none"
                          checked={newPositionRoleIds.includes(role.id)}
                          disabled={!ability.can('manage', 'position')}
                          onChange={() => toggleNewPositionRole(role.id)}
                        />
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span className="flex-1">{role.name}</span>
                        {role.isSystem && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            System
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleCreatePosition}
                    disabled={
                      !ability.can('manage', 'position')
                      || !newPositionName.trim()
                      || newPositionRoleIds.length === 0
                      || createPositionMutation.isPending
                    }
                  >
                    {createPositionMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {t('common.loading')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t('iam.createPosition')}
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Create User */}
            <Card
              title={(
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-gray-500" />
                  <span>{t('iam.createUserTitle')}</span>
                </div>
              )}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('iam.username')}
                  </label>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newUsername}
                    onChange={(event) => setNewUsername(event.target.value)}
                    placeholder={t('iam.usernamePlaceholder')}
                    disabled={!ability.can('manage', 'user')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('iam.email')}
                  </label>
                  <input
                    type="email"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newUserEmail}
                    onChange={(event) => setNewUserEmail(event.target.value)}
                    placeholder={t('iam.emailPlaceholder')}
                    disabled={!ability.can('manage', 'user')}
                  />
                  {newUserPasswordMode === 'email' && !newUserEmail.trim() && (
                    <p className="mt-1 text-xs text-amber-600">{t('iam.emailRequiredForEmailMode')}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('iam.passwordMode')}
                  </label>
                  <div className="mt-2 space-y-2">
                    <Radio
                      name="passwordMode"
                      checked={newUserPasswordMode === 'default'}
                      onChange={() => setNewUserPasswordMode('default')}
                      label={t('iam.passwordModeDefault')}
                      disabled={!ability.can('manage', 'user')}
                    />
                    <Radio
                      name="passwordMode"
                      checked={newUserPasswordMode === 'email'}
                      onChange={() => setNewUserPasswordMode('email')}
                      label={t('iam.passwordModeEmail')}
                      disabled={!ability.can('manage', 'user')}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('iam.position')}
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={newUserPositionId || ''}
                    onChange={(event) => setNewUserPositionId(Number(event.target.value))}
                    disabled={!ability.can('manage', 'user')}
                  >
                    <option value="">{t('iam.selectPosition')}</option>
                    {positions?.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">{t('iam.userMustChangePasswordHint')}</p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleCreateUser}
                    disabled={
                      !ability.can('manage', 'user')
                      || !newUsername.trim()
                      || !newUserPositionId
                      || (newUserPasswordMode === 'email' && !newUserEmail.trim())
                      || createUserMutation.isPending
                    }
                  >
                    {createUserMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {t('common.loading')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        {t('iam.createUser')}
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
