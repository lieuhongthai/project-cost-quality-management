import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { iamApi } from '@/services/api'
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
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Tooltip from '@mui/material/Tooltip'

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

  const handleResetPassword = (_userId: number, username: string) => {
    const newPassword = window.prompt(t('iam.resetPasswordPrompt', { name: username }))
    if (!newPassword || !newPassword.trim()) return
    // Backend doesn't have reset password endpoint in current implementation
    // We can add it later if needed
    alert(t('iam.resetPasswordNotImplemented'))
  }

  if (isLoading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!roles || roles.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">
            {t('iam.noRoles')}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            {t('iam.noRolesHint')}
          </Typography>
        </CardContent>
      </Card>
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

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <Box sx={{ minHeight: 500 }}>
        {activeTab === 'roles' && (
          <Grid container spacing={3}>
            {/* Roles List */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UserCog size={20} color="gray" />
                      <Typography variant="subtitle1">{t('iam.rolesTitle')}</Typography>
                    </Box>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {roles.map((role: Role) => {
                      const isSelected = role.id === selectedRoleId
                      const isEditing = editingRoleId === role.id
                      const canManage = ability.can('manage', 'role') && !role.isSystem

                      return (
                        <Paper
                          key={role.id}
                          variant="outlined"
                          sx={{
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            bgcolor: isSelected ? 'primary.50' : 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: isSelected ? 'primary.main' : 'grey.400',
                              bgcolor: isSelected ? 'primary.50' : 'grey.50',
                            },
                          }}
                        >
                          <Box
                            onClick={() => setSelectedRoleId(role.id)}
                            sx={{ px: 2, py: 1.5, cursor: 'pointer' }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                              {isEditing ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                  <TextField
                                    size="small"
                                    value={editingRoleName}
                                    onChange={(e) => setEditingRoleName(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    sx={{ flex: 1 }}
                                  />
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSaveRoleName()
                                    }}
                                    disabled={updateRoleNameMutation.isPending}
                                  >
                                    <Check size={16} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCancelEditRole()
                                    }}
                                  >
                                    <X size={16} />
                                  </IconButton>
                                </Box>
                              ) : (
                                <>
                                  <Typography
                                    fontWeight={500}
                                    color={isSelected ? 'primary.main' : 'text.primary'}
                                  >
                                    {role.name}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {role.isSystem && (
                                      <Chip label="System" size="small" variant="outlined" />
                                    )}
                                    {canManage && (
                                      <>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleEditRole(role)
                                          }}
                                        >
                                          <Edit2 size={14} />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteRole(role.id, role.name)
                                          }}
                                        >
                                          <Trash2 size={14} />
                                        </IconButton>
                                      </>
                                    )}
                                  </Box>
                                </>
                              )}
                            </Box>
                            {!isEditing && (
                              <Typography
                                variant="caption"
                                color={isSelected ? 'primary.main' : 'text.secondary'}
                              >
                                {t('iam.permissionCount', { count: role.permissions.length })}
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      )
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Permissions Editor */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card>
                <CardHeader
                  title={
                    selectedRole ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Shield size={20} color="gray" />
                        <Typography variant="subtitle1">
                          {t('iam.permissionsTitle', { role: selectedRole.name })}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="subtitle1">{t('iam.permissions')}</Typography>
                    )
                  }
                  action={
                    selectedRole && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSave}
                        disabled={isReadOnly || updateRoleMutation.isPending}
                        startIcon={updateRoleMutation.isPending ? <CircularProgress size={16} /> : <CheckCircle2 size={16} />}
                      >
                        {updateRoleMutation.isPending ? t('common.loading') : t('iam.save')}
                      </Button>
                    )
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  {selectedRole ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {selectedRole.isSystem && (
                        <Alert severity="warning" icon={<AlertCircle size={20} />}>
                          {t('iam.systemRoleHint')}
                        </Alert>
                      )}
                      {!ability.can('manage', 'role') && (
                        <Alert severity="info" icon={<AlertCircle size={20} />}>
                          {t('iam.readOnlyHint')}
                        </Alert>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {groupedPermissions.map(({ subject, items }) => (
                          <Box key={subject}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <Typography variant="overline" color="text.secondary">
                                {subject}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                ({items.filter(p => draftPermissionKeys.includes(p.key)).length}/{items.length})
                              </Typography>
                            </Box>
                            <Grid container spacing={1.5}>
                              {items.map((permission) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={permission.key}>
                                  <Paper
                                    variant="outlined"
                                    onClick={() => !isReadOnly && togglePermission(permission.key)}
                                    sx={{
                                      px: 2,
                                      py: 1.5,
                                      cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                      opacity: isReadOnly ? 0.7 : 1,
                                      borderColor: draftPermissionKeys.includes(permission.key) ? 'primary.main' : 'divider',
                                      bgcolor: draftPermissionKeys.includes(permission.key) ? 'primary.50' : 'transparent',
                                      '&:hover': {
                                        borderColor: isReadOnly ? 'divider' : 'grey.400',
                                      },
                                    }}
                                  >
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={draftPermissionKeys.includes(permission.key)}
                                          disabled={isReadOnly}
                                          size="small"
                                          onChange={() => togglePermission(permission.key)}
                                        />
                                      }
                                      label={
                                        <Typography variant="body2">
                                          {permission.key}
                                        </Typography>
                                      }
                                      sx={{ m: 0, width: '100%' }}
                                    />
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography color="text.secondary">{t('iam.selectRole')}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === 'positions' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Users size={20} color="gray" />
                    <Typography variant="subtitle1">{t('iam.positionsTitle')}</Typography>
                  </Box>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                {positions && positions.length > 0 ? (
                  <Grid container spacing={2}>
                    {positions.map((position: Position) => {
                      const isEditingName = editingPositionId === position.id && !isEditingPositionRoles
                      const canManage = ability.can('manage', 'position') && !position.isSystem

                      return (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={position.id}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: 'grey.400',
                                boxShadow: 1,
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                              {isEditingName ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                  <Briefcase size={20} color="gray" />
                                  <TextField
                                    size="small"
                                    value={editingPositionName}
                                    onChange={(e) => setEditingPositionName(e.target.value)}
                                    autoFocus
                                    sx={{ flex: 1 }}
                                  />
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={handleSavePositionName}
                                    disabled={updatePositionMutation.isPending}
                                  >
                                    <Check size={16} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={handleCancelEditPosition}
                                  >
                                    <X size={16} />
                                  </IconButton>
                                </Box>
                              ) : (
                                <>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Briefcase size={20} color="gray" />
                                    <Typography fontWeight={600}>{position.name}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {position.isSystem && (
                                      <Chip label="System" size="small" variant="outlined" />
                                    )}
                                    {canManage && (
                                      <>
                                        <Tooltip title={t('iam.editPositionName')}>
                                          <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleEditPosition(position)}
                                          >
                                            <Edit2 size={14} />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('iam.deletePosition')}>
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeletePosition(position.id, position.name)}
                                          >
                                            <Trash2 size={14} />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    )}
                                  </Box>
                                </>
                              )}
                            </Box>
                            {!isEditingName && (
                              <>
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {t('iam.positionRoleCount', { count: position.roles.length })}
                                  </Typography>
                                  {canManage && (
                                    <Button
                                      variant="text"
                                      size="small"
                                      onClick={() => handleEditPositionRoles(position)}
                                    >
                                      {t('iam.editRoles')}
                                    </Button>
                                  )}
                                </Box>
                                <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {position.roles.length > 0 ? (
                                    position.roles.map((role) => (
                                      <Chip
                                        key={role.id}
                                        icon={<Shield size={12} />}
                                        label={role.name}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                      />
                                    ))
                                  ) : (
                                    <Typography variant="caption" color="text.disabled">
                                      {t('iam.noRolesAssigned')}
                                    </Typography>
                                  )}
                                </Box>
                              </>
                            )}
                          </Paper>
                        </Grid>
                      )
                    })}
                  </Grid>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="h6" color="text.secondary">
                      {t('iam.noPositions')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                      {t('iam.noPositionsHint')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Edit Position Roles Card */}
            {isEditingPositionRoles && editingPositionId && (
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Shield size={20} color="gray" />
                      <Typography variant="subtitle1">
                        {t('iam.editPositionRoles', {
                          name: positions?.find(p => p.id === editingPositionId)?.name,
                        })}
                      </Typography>
                    </Box>
                  }
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleCancelEditPositionRoles}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSavePositionRoles}
                        disabled={updatePositionRolesMutation.isPending || editingPositionRoleIds.length === 0}
                        startIcon={updatePositionRolesMutation.isPending ? <CircularProgress size={16} /> : <CheckCircle2 size={16} />}
                      >
                        {updatePositionRolesMutation.isPending ? t('common.loading') : t('iam.saveRoles')}
                      </Button>
                    </Box>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('iam.selectRolesToAssign')}
                    </Typography>
                    <Grid container spacing={1.5}>
                      {roles.map((role) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={`edit-position-role-${role.id}`}>
                          <Paper
                            variant="outlined"
                            onClick={() => togglePositionRole(role.id)}
                            sx={{
                              px: 2,
                              py: 1.5,
                              cursor: 'pointer',
                              borderColor: editingPositionRoleIds.includes(role.id) ? 'primary.main' : 'divider',
                              bgcolor: editingPositionRoleIds.includes(role.id) ? 'primary.50' : 'transparent',
                              '&:hover': {
                                borderColor: 'grey.400',
                              },
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={editingPositionRoleIds.includes(role.id)}
                                  size="small"
                                  onChange={() => togglePositionRole(role.id)}
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Shield size={16} color="gray" />
                                  <Typography variant="body2">{role.name}</Typography>
                                  {role.isSystem && (
                                    <Chip label="System" size="small" variant="outlined" />
                                  )}
                                </Box>
                              }
                              sx={{ m: 0, width: '100%' }}
                            />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    {editingPositionRoleIds.length === 0 && (
                      <Typography variant="body2" color="warning.main">
                        {t('iam.atLeastOneRole')}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {activeTab === 'users' && (
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UserCog size={20} color="gray" />
                  <Typography variant="subtitle1">{t('iam.usersTitle')}</Typography>
                </Box>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {users && users.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('iam.username')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('iam.email')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('iam.position')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('iam.mustChangePassword')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('common.created')}</TableCell>
                        {ability.can('manage', 'user') && (
                          <TableCell sx={{ fontWeight: 600 }} align="right">{t('common.actions')}</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => {
                        const isEditing = editingUserId === user.id
                        const isSuperAdmin = user.username === 'super-admin'
                        const canManage = ability.can('manage', 'user') && !isSuperAdmin

                        return (
                          <TableRow key={user.id} hover>
                            <TableCell>
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  fullWidth
                                  value={editingUsername}
                                  onChange={(e) => setEditingUsername(e.target.value)}
                                  autoFocus
                                />
                              ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography fontWeight={500}>{user.username}</Typography>
                                  {isSuperAdmin && (
                                    <Chip
                                      label="Super Admin"
                                      size="small"
                                      color="secondary"
                                    />
                                  )}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  type="email"
                                  fullWidth
                                  value={editingUserEmail}
                                  onChange={(e) => setEditingUserEmail(e.target.value)}
                                  placeholder={t('iam.emailPlaceholder')}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {user.email || '-'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                  <Select
                                    value={editingUserPositionId || ''}
                                    onChange={(e) => setEditingUserPositionId(Number(e.target.value))}
                                    MenuProps={{ disableScrollLock: true }}
                                  >
                                    <MenuItem value="">{t('iam.selectPosition')}</MenuItem>
                                    {positions?.map((position) => (
                                      <MenuItem key={position.id} value={position.id}>
                                        {position.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {user.position?.name || t('common.unknown')}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={user.mustChangePassword ? t('common.yes') : t('common.no')}
                                size="small"
                                color={user.mustChangePassword ? 'warning' : 'success'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            {ability.can('manage', 'user') && (
                              <TableCell align="right">
                                {isEditing ? (
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={handleSaveUser}
                                      disabled={updateUserMutation.isPending}
                                    >
                                      <Check size={16} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={handleCancelEditUser}
                                    >
                                      <X size={16} />
                                    </IconButton>
                                  </Box>
                                ) : canManage ? (
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                    <Tooltip title={t('iam.editUser')}>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleEditUser(user)}
                                      >
                                        <Edit2 size={16} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('iam.resetPassword')}>
                                      <IconButton
                                        size="small"
                                        color="info"
                                        onClick={() => handleResetPassword(user.id, user.username)}
                                      >
                                        <Key size={16} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('iam.deleteUser')}>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                      >
                                        <Trash2 size={16} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                ) : null}
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary">
                    {t('iam.noUsers')}
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                    {t('iam.noUsersHint')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'create' && (
          <Grid container spacing={3}>
            {/* Create Role */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UserCog size={20} color="gray" />
                      <Typography variant="subtitle1">{t('iam.createRoleTitle')}</Typography>
                    </Box>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label={t('iam.roleName')}
                      value={newRoleName}
                      onChange={(event) => setNewRoleName(event.target.value)}
                      placeholder={t('iam.roleNamePlaceholder')}
                      disabled={!ability.can('manage', 'role')}
                      size="small"
                      fullWidth
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                        {t('iam.assignPermissions')}
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{ maxHeight: 400, overflow: 'auto', p: 2 }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {groupedPermissions.map(({ subject, items }) => (
                            <Box key={subject}>
                              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                                {subject}
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                                {items.map((permission) => (
                                  <Paper
                                    key={`new-${permission.key}`}
                                    variant="outlined"
                                    onClick={() => ability.can('manage', 'role') && toggleNewRolePermission(permission.key)}
                                    sx={{
                                      px: 1.5,
                                      py: 1,
                                      cursor: ability.can('manage', 'role') ? 'pointer' : 'not-allowed',
                                      opacity: ability.can('manage', 'role') ? 1 : 0.7,
                                      borderColor: newRolePermissionKeys.includes(permission.key) ? 'primary.main' : 'divider',
                                      bgcolor: newRolePermissionKeys.includes(permission.key) ? 'primary.50' : 'transparent',
                                    }}
                                  >
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={newRolePermissionKeys.includes(permission.key)}
                                          disabled={!ability.can('manage', 'role')}
                                          size="small"
                                          onChange={() => toggleNewRolePermission(permission.key)}
                                        />
                                      }
                                      label={<Typography variant="body2">{permission.key}</Typography>}
                                      sx={{ m: 0 }}
                                    />
                                  </Paper>
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleCreateRole}
                        disabled={
                          !ability.can('manage', 'role')
                          || !newRoleName.trim()
                          || newRolePermissionKeys.length === 0
                          || createRoleMutation.isPending
                        }
                        startIcon={createRoleMutation.isPending ? <CircularProgress size={16} /> : <Plus size={16} />}
                      >
                        {createRoleMutation.isPending ? t('common.loading') : t('iam.createRole')}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Create Position */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Briefcase size={20} color="gray" />
                      <Typography variant="subtitle1">{t('iam.createPositionTitle')}</Typography>
                    </Box>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label={t('iam.positionName')}
                      value={newPositionName}
                      onChange={(event) => setNewPositionName(event.target.value)}
                      placeholder={t('iam.positionNamePlaceholder')}
                      disabled={!ability.can('manage', 'position')}
                      size="small"
                      fullWidth
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                        {t('iam.assignRoles')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {roles.map((role) => (
                          <Paper
                            key={`position-role-${role.id}`}
                            variant="outlined"
                            onClick={() => ability.can('manage', 'position') && toggleNewPositionRole(role.id)}
                            sx={{
                              px: 2,
                              py: 1.5,
                              cursor: ability.can('manage', 'position') ? 'pointer' : 'not-allowed',
                              opacity: ability.can('manage', 'position') ? 1 : 0.7,
                              borderColor: newPositionRoleIds.includes(role.id) ? 'primary.main' : 'divider',
                              bgcolor: newPositionRoleIds.includes(role.id) ? 'primary.50' : 'transparent',
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={newPositionRoleIds.includes(role.id)}
                                  disabled={!ability.can('manage', 'position')}
                                  size="small"
                                  onChange={() => toggleNewPositionRole(role.id)}
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Shield size={16} color="gray" />
                                  <Typography variant="body2">{role.name}</Typography>
                                  {role.isSystem && (
                                    <Chip label="System" size="small" variant="outlined" />
                                  )}
                                </Box>
                              }
                              sx={{ m: 0 }}
                            />
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleCreatePosition}
                        disabled={
                          !ability.can('manage', 'position')
                          || !newPositionName.trim()
                          || newPositionRoleIds.length === 0
                          || createPositionMutation.isPending
                        }
                        startIcon={createPositionMutation.isPending ? <CircularProgress size={16} /> : <Plus size={16} />}
                      >
                        {createPositionMutation.isPending ? t('common.loading') : t('iam.createPosition')}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Create User */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UserPlus size={20} color="gray" />
                      <Typography variant="subtitle1">{t('iam.createUserTitle')}</Typography>
                    </Box>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label={t('iam.username')}
                      value={newUsername}
                      onChange={(event) => setNewUsername(event.target.value)}
                      placeholder={t('iam.usernamePlaceholder')}
                      disabled={!ability.can('manage', 'user')}
                      size="small"
                      fullWidth
                    />
                    <Box>
                      <TextField
                        label={t('iam.email')}
                        type="email"
                        value={newUserEmail}
                        onChange={(event) => setNewUserEmail(event.target.value)}
                        placeholder={t('iam.emailPlaceholder')}
                        disabled={!ability.can('manage', 'user')}
                        size="small"
                        fullWidth
                      />
                      {newUserPasswordMode === 'email' && !newUserEmail.trim() && (
                        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                          {t('iam.emailRequiredForEmailMode')}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                        {t('iam.passwordMode')}
                      </Typography>
                      <RadioGroup
                        value={newUserPasswordMode}
                        onChange={(e) => setNewUserPasswordMode(e.target.value as 'default' | 'email')}
                      >
                        <FormControlLabel
                          value="default"
                          control={<Radio size="small" />}
                          label={t('iam.passwordModeDefault')}
                          disabled={!ability.can('manage', 'user')}
                        />
                        <FormControlLabel
                          value="email"
                          control={<Radio size="small" />}
                          label={t('iam.passwordModeEmail')}
                          disabled={!ability.can('manage', 'user')}
                        />
                      </RadioGroup>
                    </Box>
                    <FormControl size="small" fullWidth>
                      <InputLabel>{t('iam.position')}</InputLabel>
                      <Select
                        value={newUserPositionId || ''}
                        onChange={(event) => setNewUserPositionId(Number(event.target.value))}
                        label={t('iam.position')}
                        disabled={!ability.can('manage', 'user')}
                        MenuProps={{ disableScrollLock: true }}
                      >
                        <MenuItem value="">{t('iam.selectPosition')}</MenuItem>
                        {positions?.map((position) => (
                          <MenuItem key={position.id} value={position.id}>
                            {position.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      <Typography variant="caption">{t('iam.userMustChangePasswordHint')}</Typography>
                    </Alert>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleCreateUser}
                        disabled={
                          !ability.can('manage', 'user')
                          || !newUsername.trim()
                          || !newUserPositionId
                          || (newUserPasswordMode === 'email' && !newUserEmail.trim())
                          || createUserMutation.isPending
                        }
                        startIcon={createUserMutation.isPending ? <CircularProgress size={16} /> : <UserPlus size={16} />}
                      >
                        {createUserMutation.isPending ? t('common.loading') : t('iam.createUser')}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  )
}
