import { useTranslation } from 'react-i18next'
import { useAppAbility } from '@/ability'
import type { Position, Role } from '@/types'
import { Shield, Users, Briefcase, CheckCircle2, Edit2, Trash2, X, Check } from 'lucide-react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import FormControlLabel from '@mui/material/FormControlLabel'
import MuiCheckbox from '@mui/material/Checkbox'
import MuiTextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { Card, Button, IconButton } from '@/components/common'

interface IamPositionsTabProps {
  positions: Position[]
  roles: Role[]
  editingPositionId: number | null
  editingPositionName: string
  setEditingPositionName: (name: string) => void
  editingPositionRoleIds: number[]
  isEditingPositionRoles: boolean
  onEditPosition: (position: Position) => void
  onSavePositionName: () => void
  onCancelEditPosition: () => void
  onDeletePosition: (positionId: number, positionName: string) => void
  onEditPositionRoles: (position: Position) => void
  onSavePositionRoles: () => void
  onCancelEditPositionRoles: () => void
  onTogglePositionRole: (roleId: number) => void
  updatePositionPending: boolean
  updatePositionRolesPending: boolean
}

export function IamPositionsTab({
  positions,
  roles,
  editingPositionId,
  editingPositionName,
  setEditingPositionName,
  editingPositionRoleIds,
  isEditingPositionRoles,
  onEditPosition,
  onSavePositionName,
  onCancelEditPosition,
  onDeletePosition,
  onEditPositionRoles,
  onSavePositionRoles,
  onCancelEditPositionRoles,
  onTogglePositionRole,
  updatePositionPending,
  updatePositionRolesPending,
}: IamPositionsTabProps) {
  const { t } = useTranslation()
  const ability = useAppAbility()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users size={20} color="gray" />
            <Typography variant="subtitle1">{t('iam.positionsTitle')}</Typography>
          </Box>
        }
      >
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
                      '&:hover': { borderColor: 'grey.400', boxShadow: 1 },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                      {isEditingName ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Briefcase size={20} color="gray" />
                          <MuiTextField
                            size="small"
                            value={editingPositionName}
                            onChange={(e) => setEditingPositionName(e.target.value)}
                            autoFocus
                            sx={{ flex: 1 }}
                          />
                          <IconButton
                            variant="success"
                            icon={<Check size={16} />}
                            onClick={onSavePositionName}
                            disabled={updatePositionPending}
                          />
                          <IconButton
                            icon={<X size={16} />}
                            onClick={onCancelEditPosition}
                          />
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
                                <IconButton
                                  variant="primary"
                                  icon={<Edit2 size={14} />}
                                  tooltip={t('iam.editPositionName')}
                                  onClick={() => onEditPosition(position)}
                                />
                                <IconButton
                                  variant="danger"
                                  icon={<Trash2 size={14} />}
                                  tooltip={t('iam.deletePosition')}
                                  onClick={() => onDeletePosition(position.id, position.name)}
                                />
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
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditPositionRoles(position)}
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
      </Card>

      {/* Edit Position Roles Card */}
      {isEditingPositionRoles && editingPositionId && (
        <Card
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield size={20} color="gray" />
              <Typography variant="subtitle1">
                {t('iam.editPositionRoles', {
                  name: positions?.find((p) => p.id === editingPositionId)?.name,
                })}
              </Typography>
            </Box>
          }
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="secondary" size="sm" onClick={onCancelEditPositionRoles}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onSavePositionRoles}
                disabled={editingPositionRoleIds.length === 0}
                loading={updatePositionRolesPending}
                startIcon={<CheckCircle2 size={16} />}
              >
                {t('iam.saveRoles')}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('iam.selectRolesToAssign')}
            </Typography>
            <Grid container spacing={1.5}>
              {roles.map((role) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`edit-position-role-${role.id}`}>
                  <Paper
                    variant="outlined"
                    onClick={() => onTogglePositionRole(role.id)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      borderColor: editingPositionRoleIds.includes(role.id) ? 'primary.main' : 'divider',
                      bgcolor: editingPositionRoleIds.includes(role.id) ? 'primary.50' : 'transparent',
                      '&:hover': { borderColor: 'grey.400' },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <MuiCheckbox
                          checked={editingPositionRoleIds.includes(role.id)}
                          size="small"
                          onChange={() => onTogglePositionRole(role.id)}
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
        </Card>
      )}
    </Box>
  )
}
