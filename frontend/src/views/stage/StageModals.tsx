import { useEffect, useState } from "react";
import { Modal, Button, EmptyState } from "@/components/common";
import { StepScreenFunctionEditModal } from "@/components/task-workflow";
import { useTranslation } from "react-i18next";
import type { ScreenFunctionType } from "@/types";

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

  return (
    <>
      {/* Link Screen Function Modal */}
      <Modal
        isOpen={showLinkScreenFunction}
        onClose={() => {
          setShowLinkScreenFunction(false);
        }}
        title={t('stages.linkScreenFunctionModalTitle')}
        size="lg"
      >
        <div className="space-y-4">
          {availableScreenFunctions && availableScreenFunctions.length > 0 ? (
            <>
              <p className="text-sm text-gray-500">
                {t('stages.linkScreenFunctionModalDescription')}
              </p>
              <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
                {availableScreenFunctions.map((sf) => (
                  <label
                    key={sf.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSFIds.includes(sf.id)}
                      onChange={() => toggleSFSelection(sf.id)}
                      className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">{sf.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          sf.type === 'Screen' ? 'bg-purple-100 text-purple-800' :
                          sf.type === 'Function' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {sf.type}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          sf.priority === 'High' ? 'bg-red-100 text-red-800' :
                          sf.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sf.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {sf.complexity}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowLinkScreenFunction(false);
                  }}
                >
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
              </div>
            </>
          ) : (
            <EmptyState
              title={t('stages.noAvailableScreenFunctions')}
              description={t('stages.allScreenFunctionsLinked')}
            />
          )}
        </div>
      </Modal>

      {/* Edit Screen Function Modal */}
      {editingSSF && members && (
        <StepScreenFunctionEditModal
          data={editingSSF}
          members={members}
          projectId={parseInt(projectId)}
          onClose={(saved) => {
            setEditingSSF(null);
            if (saved) {
              invalidateStageQueries();
            }
          }}
        />
      )}

      {/* Update Actual Date Confirmation Modal */}
      <Modal
        isOpen={showUpdateActualDateConfirm}
        onClose={() => setShowUpdateActualDateConfirm(false)}
        title={t('stages.updateActualDateTitle')}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('stages.updateActualDateDescription')}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.currentActualStart')}:</span>
              <span className="font-medium">{formatDate(stage.actualStartDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.newActualStart')}:</span>
              <span className={`font-medium ${calculatedDates.start ? 'text-green-600' : 'text-gray-400'}`}>
                {formatDate(calculatedDates.start || undefined)}
              </span>
            </div>
            <div className="border-t my-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.currentActualEnd')}:</span>
              <span className="font-medium">{formatDate(stage.actualEndDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.newActualEnd')}:</span>
              <span className={`font-medium ${calculatedDates.end ? 'text-green-600' : 'text-gray-400'}`}>
                {formatDate(calculatedDates.end || undefined)}
              </span>
            </div>
          </div>

          {!calculatedDates.start && !calculatedDates.end && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              {t('stages.noActualDatesFound')}
            </p>
          )}

          {/* Optional est. date sync checkboxes */}
          <div className="space-y-1.5 pt-3 border-t">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncEstStep}
                onChange={(e) => setSyncEstStep(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <span className="text-sm text-gray-700">{t('stages.syncEstStep')}</span>
            </label>
            {syncEstStep && (
              <p className="text-xs text-blue-600 pl-6">{t('stages.syncEstStepDesc')}</p>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncEstStage}
                onChange={(e) => setSyncEstStage(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <span className="text-sm text-gray-700">{t('stages.syncEstStage')}</span>
            </label>
            {syncEstStage && (
              <p className="text-xs text-blue-600 pl-6">{t('stages.syncEstStageDesc')}</p>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncEstEffortStep}
                onChange={(e) => setSyncEstEffortStep(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <span className="text-sm text-gray-700">{t('stages.syncEstEffortStep')}</span>
            </label>
            {syncEstEffortStep && (
              <p className="text-xs text-blue-600 pl-6">{t('stages.syncEstEffortStepDesc')}</p>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncEstEffortStage}
                onChange={(e) => setSyncEstEffortStage(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <span className="text-sm text-gray-700">{t('stages.syncEstEffortStage')}</span>
            </label>
            {syncEstEffortStage && (
              <p className="text-xs text-blue-600 pl-6">{t('stages.syncEstEffortStageDesc')}</p>
            )}

            <label className={`flex items-center gap-2 select-none ${!syncEstStep && !syncEstStage && !syncEstEffortStep && !syncEstEffortStage ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={syncOverrideEst}
                disabled={!syncEstStep && !syncEstStage && !syncEstEffortStep && !syncEstEffortStage}
                onChange={(e) => setSyncOverrideEst(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-700">{t('stages.syncOverrideEst')}</span>
            </label>
            {syncOverrideEst && (
              <p className="text-xs text-amber-600 pl-6">{t('stages.syncOverrideEstDesc')}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowUpdateActualDateConfirm(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => confirmUpdateActualDate({ syncEstStep, syncEstStage, syncEstEffortStep, syncEstEffortStage, syncOverrideEst })}
              disabled={(!calculatedDates.start && !calculatedDates.end) || updateStageDatesMutation.isPending}
              loading={updateStageDatesMutation.isPending}
            >
              {t('stages.confirmUpdate')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Link Modal */}
      <Modal
        isOpen={showQuickLink}
        onClose={() => {
          setShowQuickLink(false);
          setQuickLinkResult(null);
        }}
        title={t('stages.quickLinkTitle', { defaultValue: 'Quick Link Screen/Functions' })}
        size="md"
      >
        <div className="space-y-4">
          {!quickLinkResult ? (
            <>
              <p className="text-sm text-gray-600">
                {t('stages.quickLinkDescription', {
                  defaultValue: 'Automatically link all Screen/Functions of a selected type to every step of this stage. Existing links will be skipped.',
                })}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('stages.quickLinkSelectType', { defaultValue: 'Select type to link' })}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Screen', 'Function', 'Other'] as ScreenFunctionType[]).map((type) => {
                    const count = sfSummary?.byType?.[type] ?? 0;
                    const isSelected = quickLinkType === type;
                    const colorMap: Record<string, string> = {
                      Screen: isSelected ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300',
                      Function: isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300',
                      Other: isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 hover:border-orange-300',
                    };
                    const badgeColor: Record<string, string> = {
                      Screen: 'bg-purple-100 text-purple-800',
                      Function: 'bg-blue-100 text-blue-800',
                      Other: 'bg-orange-100 text-orange-800',
                    };

                    return (
                      <button
                        key={type}
                        onClick={() => setQuickLinkType(type)}
                        className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${colorMap[type]}`}
                      >
                        <span className={`inline-block px-2 py-0.5 text-xs rounded mb-1 ${badgeColor[type]}`}>
                          {type}
                        </span>
                        <p className="text-lg font-semibold text-gray-900">{count}</p>
                        <p className="text-xs text-gray-500">{t('stages.items', { defaultValue: 'items' })}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {steps.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">
                    {t('stages.quickLinkPreview', { defaultValue: 'Preview' })}
                  </p>
                  <p className="text-sm text-gray-700">
                    {t('stages.quickLinkPreviewText', {
                      defaultValue: `${sfSummary?.byType?.[quickLinkType] ?? 0} ${quickLinkType}(s) × ${steps.length} step(s) = up to ${(sfSummary?.byType?.[quickLinkType] ?? 0) * steps.length} tasks`,
                      count: sfSummary?.byType?.[quickLinkType] ?? 0,
                      type: quickLinkType,
                      steps: steps.length,
                      total: (sfSummary?.byType?.[quickLinkType] ?? 0) * steps.length,
                    })}
                  </p>
                </div>
              )}

              {/* Assign Members Option */}
              {(() => {
                const sfIdsWithMembers = new Set(defaultMembers?.map(dm => dm.screenFunctionId) || []);
                const hasAnyDefaultMembers = sfIdsWithMembers.size > 0;

                return (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickLinkAssignMembers}
                        onChange={(e) => setQuickLinkAssignMembers(e.target.checked)}
                        className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t('stages.quickLinkAssignMembers', { defaultValue: 'Auto-assign default members' })}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {hasAnyDefaultMembers
                            ? t('stages.quickLinkAssignMembersDesc', {
                                defaultValue: 'Automatically assign default members configured in Screen/Functions tab to newly created tasks.',
                              })
                            : t('stages.quickLinkNoDefaultMembers', {
                                defaultValue: 'No default members configured. Go to Screen/Functions tab to assign default members first.',
                              })
                          }
                        </p>
                        {hasAnyDefaultMembers && (
                          <p className="text-xs text-indigo-600 mt-1">
                            {sfIdsWithMembers.size} {t('stages.sfWithAssignees', { defaultValue: 'Screen/Function(s) with default assignees' })}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowQuickLink(false);
                    setQuickLinkResult(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleQuickLink}
                  disabled={quickLinkMutation.isPending || (sfSummary?.byType?.[quickLinkType] ?? 0) === 0}
                  loading={quickLinkMutation.isPending}
                >
                  {t('stages.quickLinkAction', { defaultValue: `Link ${sfSummary?.byType?.[quickLinkType] ?? 0} ${quickLinkType}(s)` })}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {t('stages.quickLinkComplete', { defaultValue: 'Quick Link Complete' })}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('stages.quickLinkCreated', {
                    defaultValue: `Created ${quickLinkResult.created} new task(s), skipped ${quickLinkResult.skipped} existing`,
                    created: quickLinkResult.created,
                    skipped: quickLinkResult.skipped,
                  })}
                </p>
                {quickLinkResult.membersAssigned > 0 && (
                  <p className="text-sm text-indigo-600 mt-1">
                    {t('stages.quickLinkMembersAssigned', {
                      defaultValue: `${quickLinkResult.membersAssigned} member assignment(s) created`,
                      count: quickLinkResult.membersAssigned,
                    })}
                  </p>
                )}
              </div>

              {quickLinkResult.details.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    {t('stages.quickLinkDetails', { defaultValue: 'Details by step' })}
                  </p>
                  <div className="space-y-1">
                    {quickLinkResult.details.map((d) => (
                      <div key={d.stepId} className="flex justify-between text-sm">
                        <span className="text-gray-700">{d.stepName}</span>
                        <div className="flex gap-3">
                          <span className={d.linked > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            +{d.linked} {t('stages.tasks', { defaultValue: 'tasks' })}
                          </span>
                          {d.membersAssigned > 0 && (
                            <span className="text-indigo-600 font-medium">
                              +{d.membersAssigned} {t('stages.assignees', { defaultValue: 'assignees' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    setShowQuickLink(false);
                    setQuickLinkResult(null);
                  }}
                >
                  {t('common.close', { defaultValue: 'Close' })}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
