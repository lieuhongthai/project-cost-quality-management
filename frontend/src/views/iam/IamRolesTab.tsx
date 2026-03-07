import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAppAbility } from '@/ability'
import { iamApi } from '@/services/api'
import type { Permission, Role } from '@/types'
import { Shield, UserCog, CheckCircle2, AlertCircle, Edit2, Trash2, X, Check } from 'lucide-react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import FormControlLabel from '@mui/material/FormControlLabel'
import MuiCheckbox from '@mui/material/Checkbox'
import MuiTextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { Card, Button, IconButton } from '@/components/common'

const groupPermissions = (permissions: Permission[]) => {
  const grouped = new Map<string, Permission[]>()
  permissions.forEach((permission) => {
    const [subject] = permission.key.split('.')
    const groupKey = subject || 'misc'
    const list = grouped.get(groupKey) ?? []
    list.push(permission)
    grouped.set(groupKey, list)
  })
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, items]) => ({
      subject,
      items: [...items].sort((first, second) => first.key.localeCompare(second.key)),
    }))
}

interface IamRolesTabProps {
  roles: Role[]
  permissions: Permission[]
  selectedRoleId: number | null
  setSelectedRoleId: (id: number | null) => void
  editingRoleId: number | null
  editingRoleName: string
  setEditingRoleName: (name: string) => void
  draftPermissionKeys: string[]
  setDraftPermissionKeys: (keys: string[] | ((prev: string[]) => string[])) => void
  onSave: () => void
  onEditRole: (role: Role) => void
  onSaveRoleName: () => void
  onCancelEditRole: () => void
  onDeleteRole: (roleId: number, roleName: string) => void
  updateRolePending: boolean
  updateRoleNamePending: boolean
}

export function IamRolesTab({
  roles,
  permissions,
  selectedRoleId,
  setSelectedRoleId,
  editingRoleId,
  editingRoleName,
  setEditingRoleName,
  draftPermissionKeys,
  setDraftPermissionKeys,
  onSave,
  onEditRole,
  onSaveRoleName,
  onCancelEditRole,
  onDeleteRole,
  updateRolePending,
  updateRoleNamePending,
}: IamRolesTabProps) {
  const { t } = useTranslation()
  const ability = useAppAbility()

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  )

  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions])

  const isReadOnly = !ability.can('manage', 'role') || !!selectedRole?.isSystem

  const togglePermission = (permissionKey: string) => {
    if (isReadOnly) return
    setDraftPermissionKeys((prev: string[]) =>
      prev.includes(permissionKey)
        ? prev.filter((key) => key !== permissionKey)
        : [...prev, permissionKey].sort(),
    )
  }

  return (
    <Grid container spacing={3}>
      {/* Roles List */}
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UserCog size={20} color="gray" />
              <Typography variant="subtitle1">{t('iam.rolesTitle')}</Typography>
            </Box>
          }
        >
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
                          <MuiTextField
                            size="small"
                            value={editingRoleName}
                            onChange={(e) => setEditingRoleName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            sx={{ flex: 1 }}
                          />
                          <IconButton
                            variant="success"
                            icon={<Check size={16} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSaveRoleName()
                            }}
                            disabled={updateRoleNamePending}
                          />
                          <IconButton
                            icon={<X size={16} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              onCancelEditRole()
                            }}
                          />
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
                                  variant="primary"
                                  icon={<Edit2 size={14} />}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditRole(role)
                                  }}
                                />
                                <IconButton
                                  variant="danger"
                                  icon={<Trash2 size={14} />}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteRole(role.id, role.name)
                                  }}
                                />
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
        </Card>
      </Grid>

      {/* Permissions Editor */}
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card
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
          actions={
            selectedRole ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onSave}
                disabled={isReadOnly}
                loading={updateRolePending}
                startIcon={<CheckCircle2 size={16} />}
              >
                {t('iam.save')}
              </Button>
            ) : undefined
          }
        >
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
                        ({items.filter((p) => draftPermissionKeys.includes(p.key)).length}/{items.length})
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
                              '&:hover': { borderColor: isReadOnly ? 'divider' : 'grey.400' },
                            }}
                          >
                            <FormControlLabel
                              control={
                                <MuiCheckbox
                                  checked={draftPermissionKeys.includes(permission.key)}
                                  disabled={isReadOnly}
                                  size="small"
                                  onChange={() => togglePermission(permission.key)}
                                />
                              }
                              label={<Typography variant="body2">{permission.key}</Typography>}
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
        </Card>
      </Grid>
    </Grid>
  )
}
