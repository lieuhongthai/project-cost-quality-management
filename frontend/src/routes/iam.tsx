import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { iamApi } from '@/services/api'
import { useAppAbility } from '@/ability'
import type { Permission, Position, Role, User } from '@/types'
import { Shield, Users, Plus, Briefcase } from 'lucide-react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MuiCard from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import { IamRolesTab } from '@/views/iam/IamRolesTab'
import { IamPositionsTab } from '@/views/iam/IamPositionsTab'
import { IamUsersTab } from '@/views/iam/IamUsersTab'
import { IamCreateTab } from '@/views/iam/IamCreateTab'

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

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: async () => (await iamApi.listRoles()).data,
  })

  const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: async () => (await iamApi.listPermissions()).data,
  })

  const { data: positions, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['iam', 'positions'],
    queryFn: async () => (await iamApi.listPositions()).data,
  })

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: async () => (await iamApi.listUsers()).data,
  })

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'roles' | 'positions' | 'users' | 'create'>('roles')

  // ── Roles state ────────────────────────────────────────────────────────────
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [draftPermissionKeys, setDraftPermissionKeys] = useState<string[]>([])
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')

  // ── Positions state ────────────────────────────────────────────────────────
  const [editingPositionId, setEditingPositionId] = useState<number | null>(null)
  const [editingPositionName, setEditingPositionName] = useState('')
  const [editingPositionRoleIds, setEditingPositionRoleIds] = useState<number[]>([])
  const [isEditingPositionRoles, setIsEditingPositionRoles] = useState(false)

  // ── Users state ────────────────────────────────────────────────────────────
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editingUsername, setEditingUsername] = useState('')
  const [editingUserEmail, setEditingUserEmail] = useState('')
  const [editingUserPositionId, setEditingUserPositionId] = useState<number | null>(null)

  // ── Create state ───────────────────────────────────────────────────────────
  const [newRoleName, setNewRoleName] = useState('')
  const [newRolePermissionKeys, setNewRolePermissionKeys] = useState<string[]>([])
  const [newPositionName, setNewPositionName] = useState('')
  const [newPositionRoleIds, setNewPositionRoleIds] = useState<number[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPasswordMode, setNewUserPasswordMode] = useState<'default' | 'email'>('default')
  const [newUserPositionId, setNewUserPositionId] = useState<number | null>(null)

  // ── Effects ────────────────────────────────────────────────────────────────
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
      setDraftPermissionKeys(selectedRole.permissions.map((p) => p.key))
    }
  }, [selectedRole])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, permissionKeys }: { roleId: number; permissionKeys: string[] }) =>
      iamApi.updateRole(roleId, { permissionKeys }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] }),
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
      if (selectedRoleId === editingRoleId) setSelectedRoleId(null)
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iam', 'positions'] }),
  })

  const createUserMutation = useMutation({
    mutationFn: (payload: {
      username: string
      email?: string
      positionId: number
      passwordMode: 'default' | 'email'
      mustChangePassword?: boolean
    }) => iamApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'users'] })
      setNewUsername('')
      setNewUserEmail('')
      setNewUserPasswordMode('default')
      setNewUserPositionId(null)
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: number
      data: { username?: string; email?: string; positionId?: number; mustChangePassword?: boolean }
    }) => iamApi.updateUser(userId, data),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iam', 'users'] }),
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!selectedRole) return
    updateRoleMutation.mutate({ roleId: selectedRole.id, permissionKeys: draftPermissionKeys })
  }

  const handleEditRole = (role: Role) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
  }

  const handleSaveRoleName = () => {
    if (!editingRoleId || !editingRoleName.trim()) return
    updateRoleNameMutation.mutate({ roleId: editingRoleId, name: editingRoleName.trim() })
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
    updatePositionMutation.mutate({ positionId: editingPositionId, name: editingPositionName.trim() })
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
    setEditingPositionRoleIds(position.roles.map((r) => r.id))
    setIsEditingPositionRoles(true)
  }

  const handleSavePositionRoles = () => {
    if (!editingPositionId) return
    updatePositionRolesMutation.mutate({ positionId: editingPositionId, roleIds: editingPositionRoleIds })
  }

  const handleCancelEditPositionRoles = () => {
    setIsEditingPositionRoles(false)
    setEditingPositionId(null)
    setEditingPositionRoleIds([])
  }

  const togglePositionRole = (roleId: number) => {
    setEditingPositionRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId].sort((a, b) => a - b),
    )
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

  const handleResetPassword = (_userId: number, username: string) => {
    const newPassword = window.prompt(t('iam.resetPasswordPrompt', { name: username }))
    if (!newPassword || !newPassword.trim()) return
    alert(t('iam.resetPasswordNotImplemented'))
  }

  const handleCreateRole = () => {
    if (!newRoleName.trim() || newRolePermissionKeys.length === 0) return
    createRoleMutation.mutate({ name: newRoleName.trim(), permissionKeys: newRolePermissionKeys })
  }

  const handleCreatePosition = () => {
    if (!newPositionName.trim() || newPositionRoleIds.length === 0) return
    createPositionMutation.mutate({ name: newPositionName.trim(), roleIds: newPositionRoleIds })
  }

  const handleCreateUser = () => {
    if (!newUsername.trim() || !newUserPositionId) return
    if (newUserPasswordMode === 'email' && !newUserEmail.trim()) return
    createUserMutation.mutate({
      username: newUsername.trim(),
      email: newUserEmail.trim() || undefined,
      positionId: newUserPositionId,
      passwordMode: newUserPasswordMode,
      mustChangePassword: true,
    })
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
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId].sort((a, b) => a - b),
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const isLoading = isLoadingRoles || isLoadingPermissions || isLoadingPositions || isLoadingUsers

  if (isLoading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!roles || roles.length === 0) {
    return (
      <MuiCard>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">
            {t('iam.noRoles')}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            {t('iam.noRolesHint')}
          </Typography>
        </CardContent>
      </MuiCard>
    )
  }

  const tabs = [
    { id: 'roles' as const, label: t('iam.rolesTab'), icon: Shield },
    { id: 'positions' as const, label: t('iam.positionsTab'), icon: Briefcase },
    { id: 'users' as const, label: t('iam.usersTab'), icon: Users },
    { id: 'create' as const, label: t('iam.createTab'), icon: Plus },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          {t('iam.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('iam.subtitle')}
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <Tab
            key={id}
            value={id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon size={18} />
                <span>{label}</span>
              </Box>
            }
          />
        ))}
      </Tabs>

      <Box sx={{ minHeight: 500 }}>
        {activeTab === 'roles' && (
          <IamRolesTab
            roles={roles}
            permissions={permissions ?? []}
            selectedRoleId={selectedRoleId}
            setSelectedRoleId={setSelectedRoleId}
            editingRoleId={editingRoleId}
            editingRoleName={editingRoleName}
            setEditingRoleName={setEditingRoleName}
            draftPermissionKeys={draftPermissionKeys}
            setDraftPermissionKeys={setDraftPermissionKeys}
            onSave={handleSave}
            onEditRole={handleEditRole}
            onSaveRoleName={handleSaveRoleName}
            onCancelEditRole={handleCancelEditRole}
            onDeleteRole={handleDeleteRole}
            updateRolePending={updateRoleMutation.isPending}
            updateRoleNamePending={updateRoleNameMutation.isPending}
          />
        )}

        {activeTab === 'positions' && (
          <IamPositionsTab
            positions={positions ?? []}
            roles={roles}
            editingPositionId={editingPositionId}
            editingPositionName={editingPositionName}
            setEditingPositionName={setEditingPositionName}
            editingPositionRoleIds={editingPositionRoleIds}
            isEditingPositionRoles={isEditingPositionRoles}
            onEditPosition={handleEditPosition}
            onSavePositionName={handleSavePositionName}
            onCancelEditPosition={handleCancelEditPosition}
            onDeletePosition={handleDeletePosition}
            onEditPositionRoles={handleEditPositionRoles}
            onSavePositionRoles={handleSavePositionRoles}
            onCancelEditPositionRoles={handleCancelEditPositionRoles}
            onTogglePositionRole={togglePositionRole}
            updatePositionPending={updatePositionMutation.isPending}
            updatePositionRolesPending={updatePositionRolesMutation.isPending}
          />
        )}

        {activeTab === 'users' && (
          <IamUsersTab
            users={users ?? []}
            positions={positions ?? []}
            editingUserId={editingUserId}
            editingUsername={editingUsername}
            editingUserEmail={editingUserEmail}
            editingUserPositionId={editingUserPositionId}
            setEditingUsername={setEditingUsername}
            setEditingUserEmail={setEditingUserEmail}
            setEditingUserPositionId={setEditingUserPositionId}
            onEditUser={handleEditUser}
            onSaveUser={handleSaveUser}
            onCancelEditUser={handleCancelEditUser}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetPassword}
            updateUserPending={updateUserMutation.isPending}
          />
        )}

        {activeTab === 'create' && (
          <IamCreateTab
            roles={roles}
            positions={positions ?? []}
            permissions={permissions ?? []}
            newRoleName={newRoleName}
            setNewRoleName={setNewRoleName}
            newRolePermissionKeys={newRolePermissionKeys}
            onToggleNewRolePermission={toggleNewRolePermission}
            onCreateRole={handleCreateRole}
            createRolePending={createRoleMutation.isPending}
            newPositionName={newPositionName}
            setNewPositionName={setNewPositionName}
            newPositionRoleIds={newPositionRoleIds}
            onToggleNewPositionRole={toggleNewPositionRole}
            onCreatePosition={handleCreatePosition}
            createPositionPending={createPositionMutation.isPending}
            newUsername={newUsername}
            setNewUsername={setNewUsername}
            newUserEmail={newUserEmail}
            setNewUserEmail={setNewUserEmail}
            newUserPasswordMode={newUserPasswordMode}
            setNewUserPasswordMode={setNewUserPasswordMode}
            newUserPositionId={newUserPositionId}
            setNewUserPositionId={setNewUserPositionId}
            onCreateUser={handleCreateUser}
            createUserPending={createUserMutation.isPending}
          />
        )}
      </Box>
    </Box>
  )
}
