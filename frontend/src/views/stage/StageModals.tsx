import { useEffect, useState } from "react";
import { Modal, Button, EmptyState, Checkbox } from "@/components/common";
import { StepScreenFunctionEditModal } from "@/components/task-workflow";
import { useTranslation } from "react-i18next";
import type { ScreenFunctionType } from "@/types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import MuiCheckbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";

interface StageModalsProps {
  // Link Screen Function Modal
  showLinkScreenFunction: boolean;
  setShowLinkScreenFunction: (show: boolean) => void;
  availableScreenFunctions: any[] | undefined;
  selectedSFIds: number[];
  toggleSFSelection: (sfId: number) => void;
  handleLinkScreenFunctions: () => void;
  linkMutation: { isPending: boolean };

  // Edit Screen Function Modal
  editingSSF: any | null;
  setEditingSSF: (ssf: any | null) => void;
  members: any[] | undefined;
  projectId: string;
  invalidateStageQueries: () => void;

  // Update Actual Date Modal
  showUpdateActualDateConfirm: boolean;
  setShowUpdateActualDateConfirm: (show: boolean) => void;
  stage: any;
  calculatedDates: { start: string | null; end: string | null };
  updateStageDatesMutation: { isPending: boolean };
  confirmUpdateActualDate: (opts: { syncEstStep: boolean; syncEstStage: boolean; syncEstEffortStep: boolean; syncEstEffortStage: boolean; syncOverrideEst: boolean }) => void;

  // Quick Link Modal
  showQuickLink: boolean;
  setShowQuickLink: (show: boolean) => void;
  quickLinkType: ScreenFunctionType;
  setQuickLinkType: (type: ScreenFunctionType) => void;
  quickLinkResult: {
    created: number;
    skipped: number;
    membersAssigned: number;
    details: Array<{ stepId: number; stepName: string; linked: number; membersAssigned: number }>;
  } | null;
  setQuickLinkResult: (result: any | null) => void;
  sfSummary: any | undefined;
  defaultMembers: any[] | undefined;
  quickLinkAssignMembers: boolean;
  setQuickLinkAssignMembers: (v: boolean) => void;
  handleQuickLink: () => void;
  quickLinkMutation: { isPending: boolean };
  steps: any[];
}

const sfTypeColor: Record<string, 'secondary' | 'primary' | 'warning'> = {
  Screen: 'secondary',
  Function: 'primary',
  Other: 'warning',
};

const priorityColor: Record<string, 'error' | 'warning' | 'default'> = {
  High: 'error',
  Medium: 'warning',
  Low: 'default',
};

export function StageModals({
  showLinkScreenFunction,
  setShowLinkScreenFunction,
  availableScreenFunctions,
  selectedSFIds,
  toggleSFSelection,
  handleLinkScreenFunctions,
  linkMutation,
  editingSSF,
  setEditingSSF,
  members,
  projectId,
  invalidateStageQueries,
  showUpdateActualDateConfirm,
  setShowUpdateActualDateConfirm,
  stage,
  calculatedDates,
  updateStageDatesMutation,
  confirmUpdateActualDate,
  showQuickLink,
  setShowQuickLink,
  quickLinkType,
  setQuickLinkType,
  quickLinkResult,
  setQuickLinkResult,
  sfSummary,
  defaultMembers,
  quickLinkAssignMembers,
  setQuickLinkAssignMembers,
  handleQuickLink,
  quickLinkMutation,
  steps,
}: StageModalsProps) {
  const { t } = useTranslation();

  const [syncEstStep, setSyncEstStep] = useState(false);
  const [syncEstStage, setSyncEstStage] = useState(false);
  const [syncEstEffortStep, setSyncEstEffortStep] = useState(false);
  const [syncEstEffortStage, setSyncEstEffortStage] = useState(false);
  const [syncOverrideEst, setSyncOverrideEst] = useState(false);

  useEffect(() => {
    if (!showUpdateActualDateConfirm) {
      setSyncEstStep(false);
      setSyncEstStage(false);
      setSyncEstEffortStep(false);
      setSyncEstEffortStage(false);
      setSyncOverrideEst(false);
    }
  }, [showUpdateActualDateConfirm]);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const noSyncSelected = !syncEstStep && !syncEstStage && !syncEstEffortStep && !syncEstEffortStage;

  return (
    <>
      {/* ── Link Screen Function Modal ── */}
      <Modal
        isOpen={showLinkScreenFunction}
        onClose={() => setShowLinkScreenFunction(false)}
        title={t('stages.linkScreenFunctionModalTitle')}
        size="lg"
        footer={
          availableScreenFunctions && availableScreenFunctions.length > 0 ? (
            <>
              <Button variant="secondary" onClick={() => setShowLinkScreenFunction(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleLinkScreenFunctions}
                disabled={selectedSFIds.length === 0 || linkMutation.isPending}
                loading={linkMutation.isPending}
              >
                {selectedSFIds.length > 0
                  ? t('stages.linkWithCount', { count: selectedSFIds.length })
                  : t('stages.link')}
              </Button>
            </>
          ) : undefined
        }
      >
        {availableScreenFunctions && availableScreenFunctions.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('stages.linkScreenFunctionModalDescription')}
            </Typography>
            <List dense disablePadding sx={{ maxHeight: 380, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {availableScreenFunctions.map((sf, idx) => (
                <Box key={sf.id}>
                  <ListItemButton onClick={() => toggleSFSelection(sf.id)} selected={selectedSFIds.includes(sf.id)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <MuiCheckbox
                        edge="start"
                        checked={selectedSFIds.includes(sf.id)}
                        tabIndex={-1}
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>{sf.name}</Typography>}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          <Chip label={sf.type} color={sfTypeColor[sf.type] ?? 'default'} size="small" />
                          <Chip label={sf.priority} color={priorityColor[sf.priority] ?? 'default'} size="small" variant="outlined" />
                          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                            {sf.complexity}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                  {idx < availableScreenFunctions.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Box>
        ) : (
          <EmptyState
            title={t('stages.noAvailableScreenFunctions')}
            description={t('stages.allScreenFunctionsLinked')}
          />
        )}
      </Modal>

      {/* ── Edit Screen Function Modal ── */}
      {editingSSF && members && (
        <StepScreenFunctionEditModal
          data={editingSSF}
          members={members}
          projectId={parseInt(projectId)}
          onClose={(saved) => {
            setEditingSSF(null);
            if (saved) invalidateStageQueries();
          }}
        />
      )}

      {/* ── Update Actual Date Confirmation Modal ── */}
      <Modal
        isOpen={showUpdateActualDateConfirm}
        onClose={() => setShowUpdateActualDateConfirm(false)}
        title={t('stages.updateActualDateTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowUpdateActualDateConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => confirmUpdateActualDate({ syncEstStep, syncEstStage, syncEstEffortStep, syncEstEffortStage, syncOverrideEst })}
              disabled={(!calculatedDates.start && !calculatedDates.end) || updateStageDatesMutation.isPending}
              loading={updateStageDatesMutation.isPending}
            >
              {t('stages.confirmUpdate')}
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('stages.updateActualDateDescription')}
          </Typography>

          {/* Date comparison */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">{t('stages.currentActualStart')}:</Typography>
              <Typography variant="body2" fontWeight={500}>{formatDate(stage.actualStartDate)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">{t('stages.newActualStart')}:</Typography>
              <Typography variant="body2" fontWeight={500} color={calculatedDates.start ? 'success.main' : 'text.disabled'}>
                {formatDate(calculatedDates.start || undefined)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">{t('stages.currentActualEnd')}:</Typography>
              <Typography variant="body2" fontWeight={500}>{formatDate(stage.actualEndDate)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{t('stages.newActualEnd')}:</Typography>
              <Typography variant="body2" fontWeight={500} color={calculatedDates.end ? 'success.main' : 'text.disabled'}>
                {formatDate(calculatedDates.end || undefined)}
              </Typography>
            </Box>
          </Paper>

          {!calculatedDates.start && !calculatedDates.end && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              {t('stages.noActualDatesFound')}
            </Alert>
          )}

          {/* Sync est. values — 2×2 grid */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
              {t('stages.syncEstTitle', 'Update estimated values')}
            </Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 1 }} />
                <Box sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">Steps / SSF</Typography>
                </Box>
                <Box sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">Stage</Typography>
                </Box>
              </Box>
              {/* Dates row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>📅</span>
                  <Typography variant="body2">Dates</Typography>
                </Box>
                <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Checkbox checked={syncEstStep} onChange={(v) => setSyncEstStep(v)} />
                </Box>
                <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Checkbox checked={syncEstStage} onChange={(v) => setSyncEstStage(v)} />
                </Box>
              </Box>
              {/* Effort row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr' }}>
                <Box sx={{ px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>⏱</span>
                  <Typography variant="body2">Effort</Typography>
                </Box>
                <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Checkbox checked={syncEstEffortStep} onChange={(v) => setSyncEstEffortStep(v)} />
                </Box>
                <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Checkbox checked={syncEstEffortStage} onChange={(v) => setSyncEstEffortStage(v)} />
                </Box>
              </Box>
            </Box>
            {/* Override option */}
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <MuiCheckbox
                    checked={syncOverrideEst}
                    disabled={noSyncSelected}
                    onChange={(e) => setSyncOverrideEst(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color={noSyncSelected ? 'text.disabled' : 'text.primary'}>
                    {t('stages.syncOverrideEst')}
                  </Typography>
                }
              />
              {syncOverrideEst && !noSyncSelected && (
                <Typography variant="caption" color="warning.main" sx={{ pl: 4, display: 'block' }}>
                  {t('stages.syncOverrideEstDesc')}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* ── Quick Link Modal ── */}
      <Modal
        isOpen={showQuickLink}
        onClose={() => { setShowQuickLink(false); setQuickLinkResult(null); }}
        title={t('stages.quickLinkTitle', { defaultValue: 'Quick Link Screen/Functions' })}
        size="md"
        footer={
          !quickLinkResult ? (
            <>
              <Button variant="secondary" onClick={() => { setShowQuickLink(false); setQuickLinkResult(null); }}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleQuickLink}
                disabled={quickLinkMutation.isPending || (sfSummary?.byType?.[quickLinkType] ?? 0) === 0}
                loading={quickLinkMutation.isPending}
              >
                {t('stages.quickLinkAction', { defaultValue: `Link ${sfSummary?.byType?.[quickLinkType] ?? 0} ${quickLinkType}(s)` })}
              </Button>
            </>
          ) : (
            <Button onClick={() => { setShowQuickLink(false); setQuickLinkResult(null); }}>
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
          )
        }
      >
        {!quickLinkResult ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('stages.quickLinkDescription', {
                defaultValue: 'Automatically link all Screen/Functions of a selected type to every step of this stage. Existing links will be skipped.',
              })}
            </Typography>

            {/* Type selector */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                {t('stages.quickLinkSelectType', { defaultValue: 'Select type to link' })}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                {(['Screen', 'Function', 'Other'] as ScreenFunctionType[]).map((type) => {
                  const count = sfSummary?.byType?.[type] ?? 0;
                  const isSelected = quickLinkType === type;
                  return (
                    <Box
                      key={type}
                      onClick={() => setQuickLinkType(type)}
                      sx={{
                        p: 1.5,
                        border: 2,
                        borderColor: isSelected ? `${sfTypeColor[type]}.main` : 'divider',
                        borderRadius: 1,
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'action.selected' : 'background.paper',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: `${sfTypeColor[type]}.main` },
                      }}
                    >
                      <Chip label={type} color={sfTypeColor[type]} size="small" sx={{ mb: 0.5 }} />
                      <Typography variant="h6" fontWeight={600}>{count}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('stages.items', { defaultValue: 'items' })}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Preview */}
            {steps.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  {t('stages.quickLinkPreview', { defaultValue: 'Preview' })}
                </Typography>
                <Typography variant="body2">
                  {t('stages.quickLinkPreviewText', {
                    defaultValue: `${sfSummary?.byType?.[quickLinkType] ?? 0} ${quickLinkType}(s) × ${steps.length} step(s) = up to ${(sfSummary?.byType?.[quickLinkType] ?? 0) * steps.length} tasks`,
                    count: sfSummary?.byType?.[quickLinkType] ?? 0,
                    type: quickLinkType,
                    steps: steps.length,
                    total: (sfSummary?.byType?.[quickLinkType] ?? 0) * steps.length,
                  })}
                </Typography>
              </Paper>
            )}

            {/* Assign Members option */}
            {(() => {
              const sfIdsWithMembers = new Set(defaultMembers?.map(dm => dm.screenFunctionId) || []);
              const hasAnyDefaultMembers = sfIdsWithMembers.size > 0;
              return (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Checkbox
                    checked={quickLinkAssignMembers}
                    onChange={(v) => setQuickLinkAssignMembers(v)}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {t('stages.quickLinkAssignMembers', { defaultValue: 'Auto-assign default members' })}
                        </Typography>
                        <Typography variant="caption" color={hasAnyDefaultMembers ? 'text.secondary' : 'text.disabled'}>
                          {hasAnyDefaultMembers
                            ? t('stages.quickLinkAssignMembersDesc', { defaultValue: 'Automatically assign default members configured in Screen/Functions tab to newly created tasks.' })
                            : t('stages.quickLinkNoDefaultMembers', { defaultValue: 'No default members configured. Go to Screen/Functions tab to assign default members first.' })
                          }
                        </Typography>
                        {hasAnyDefaultMembers && (
                          <Typography variant="caption" color="primary" display="block">
                            {sfIdsWithMembers.size} {t('stages.sfWithAssignees', { defaultValue: 'Screen/Function(s) with default assignees' })}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </Paper>
              );
            })()}
          </Box>
        ) : (
          /* Quick Link result */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="success">
              <Typography variant="body2" fontWeight={500} gutterBottom>
                {t('stages.quickLinkComplete', { defaultValue: 'Quick Link Complete' })}
              </Typography>
              <Typography variant="body2">
                {t('stages.quickLinkCreated', {
                  defaultValue: `Created ${quickLinkResult.created} new task(s), skipped ${quickLinkResult.skipped} existing`,
                  created: quickLinkResult.created,
                  skipped: quickLinkResult.skipped,
                })}
              </Typography>
              {quickLinkResult.membersAssigned > 0 && (
                <Typography variant="body2">
                  {t('stages.quickLinkMembersAssigned', {
                    defaultValue: `${quickLinkResult.membersAssigned} member assignment(s) created`,
                    count: quickLinkResult.membersAssigned,
                  })}
                </Typography>
              )}
            </Alert>

            {quickLinkResult.details.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                  {t('stages.quickLinkDetails', { defaultValue: 'Details by step' })}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {quickLinkResult.details.map((d) => (
                    <Box key={d.stepId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">{d.stepName}</Typography>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Typography variant="body2" color={d.linked > 0 ? 'success.main' : 'text.disabled'} fontWeight={d.linked > 0 ? 500 : 400}>
                          +{d.linked} {t('stages.tasks', { defaultValue: 'tasks' })}
                        </Typography>
                        {d.membersAssigned > 0 && (
                          <Typography variant="body2" color="primary" fontWeight={500}>
                            +{d.membersAssigned} {t('stages.assignees', { defaultValue: 'assignees' })}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}
          </Box>
        )}
      </Modal>
    </>
  );
}
