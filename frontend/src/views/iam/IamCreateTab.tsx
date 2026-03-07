import { useTranslation } from 'react-i18next'
import { useAppAbility } from '@/ability'
import type { Permission, Position, Role } from '@/types'
import { Shield, UserCog, Briefcase, CheckCircle2, Plus, UserPlus, AlertCircle } from 'lucide-react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import FormControlLabel from '@mui/material/FormControlLabel'
import MuiCheckbox from '@mui/material/Checkbox'
import MuiRadio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MuiSelect from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { Card, Input, Button } from '@/components/common'

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

interface IamCreateTabProps {
  roles: Role[]
  positions: Position[]
  permissions: Permission[]
  // Role creation
  newRoleName: string
  setNewRoleName: (v: string) => void
  newRolePermissionKeys: string[]
  onToggleNewRolePermission: (key: string) => void
  onCreateRole: () => void
  createRolePending: boolean
  // Position creation
  newPositionName: string
  setNewPositionName: (v: string) => void
  newPositionRoleIds: number[]
  onToggleNewPositionRole: (roleId: number) => void
  onCreatePosition: () => void
  createPositionPending: boolean
  // User creation
  newUsername: string
  setNewUsername: (v: string) => void
  newUserEmail: string
  setNewUserEmail: (v: string) => void
  newUserPasswordMode: 'default' | 'email'
  setNewUserPasswordMode: (v: 'default' | 'email') => void
  newUserPositionId: number | null
  setNewUserPositionId: (v: number | null) => void
  onCreateUser: () => void
  createUserPending: boolean
}

export function IamCreateTab({
  roles,
  positions,
  permissions,
  newRoleName,
  setNewRoleName,
  newRolePermissionKeys,
  onToggleNewRolePermission,
  onCreateRole,
  createRolePending,
  newPositionName,
  setNewPositionName,
  newPositionRoleIds,
  onToggleNewPositionRole,
  onCreatePosition,
  createPositionPending,
  newUsername,
  setNewUsername,
  newUserEmail,
  setNewUserEmail,
  newUserPasswordMode,
  setNewUserPasswordMode,
  newUserPositionId,
  setNewUserPositionId,
  onCreateUser,
  createUserPending,
}: IamCreateTabProps) {
  const { t } = useTranslation()
  const ability = useAppAbility()
  const groupedPermissions = groupPermissions(permissions)

  return (
    <Grid container spacing={3}>
      {/* Create Role */}
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UserCog size={20} color="gray" />
              <Typography variant="subtitle1">{t('iam.createRoleTitle')}</Typography>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Input
              label={t('iam.roleName')}
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder={t('iam.roleNamePlaceholder')}
              disabled={!ability.can('manage', 'role')}
            />
            <Box>
              <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                {t('iam.assignPermissions')}
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto', p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {groupedPermissions.map(({ subject, items }) => (
                    <Box key={subject}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase', fontWeight: 600 }}
                      >
                        {subject}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                        {items.map((permission) => (
                          <Paper
                            key={`new-${permission.key}`}
                            variant="outlined"
                            onClick={() => ability.can('manage', 'role') && onToggleNewRolePermission(permission.key)}
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
                                <MuiCheckbox
                                  checked={newRolePermissionKeys.includes(permission.key)}
                                  disabled={!ability.can('manage', 'role')}
                                  size="small"
                                  onChange={() => onToggleNewRolePermission(permission.key)}
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
                variant="primary"
                onClick={onCreateRole}
                disabled={
                  !ability.can('manage', 'role') ||
                  !newRoleName.trim() ||
                  newRolePermissionKeys.length === 0
                }
                loading={createRolePending}
                startIcon={<Plus size={16} />}
              >
                {t('iam.createRole')}
              </Button>
            </Box>
          </Box>
        </Card>
      </Grid>

      {/* Create Position */}
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Briefcase size={20} color="gray" />
              <Typography variant="subtitle1">{t('iam.createPositionTitle')}</Typography>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Input
              label={t('iam.positionName')}
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
              placeholder={t('iam.positionNamePlaceholder')}
              disabled={!ability.can('manage', 'position')}
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
                    onClick={() => ability.can('manage', 'position') && onToggleNewPositionRole(role.id)}
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
                        <MuiCheckbox
                          checked={newPositionRoleIds.includes(role.id)}
                          disabled={!ability.can('manage', 'position')}
                          size="small"
                          onChange={() => onToggleNewPositionRole(role.id)}
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
                variant="primary"
                onClick={onCreatePosition}
                disabled={
                  !ability.can('manage', 'position') ||
                  !newPositionName.trim() ||
                  newPositionRoleIds.length === 0
                }
                loading={createPositionPending}
                startIcon={<Plus size={16} />}
              >
                {t('iam.createPosition')}
              </Button>
            </Box>
          </Box>
        </Card>
      </Grid>

      {/* Create User */}
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UserPlus size={20} color="gray" />
              <Typography variant="subtitle1">{t('iam.createUserTitle')}</Typography>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Input
              label={t('iam.username')}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder={t('iam.usernamePlaceholder')}
              disabled={!ability.can('manage', 'user')}
            />
            <Box>
              <Input
                label={t('iam.email')}
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder={t('iam.emailPlaceholder')}
                disabled={!ability.can('manage', 'user')}
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
                  control={<MuiRadio size="small" />}
                  label={t('iam.passwordModeDefault')}
                  disabled={!ability.can('manage', 'user')}
                />
                <FormControlLabel
                  value="email"
                  control={<MuiRadio size="small" />}
                  label={t('iam.passwordModeEmail')}
                  disabled={!ability.can('manage', 'user')}
                />
              </RadioGroup>
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('iam.position')}</InputLabel>
              <MuiSelect
                value={newUserPositionId || ''}
                onChange={(e) => setNewUserPositionId(Number(e.target.value))}
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
              </MuiSelect>
            </FormControl>
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption">{t('iam.userMustChangePasswordHint')}</Typography>
            </Alert>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                variant="primary"
                onClick={onCreateUser}
                disabled={
                  !ability.can('manage', 'user') ||
                  !newUsername.trim() ||
                  !newUserPositionId ||
                  (newUserPasswordMode === 'email' && !newUserEmail.trim())
                }
                loading={createUserPending}
                startIcon={<UserPlus size={16} />}
              >
                {t('iam.createUser')}
              </Button>
            </Box>
          </Box>
        </Card>
      </Grid>
    </Grid>
  )
}
