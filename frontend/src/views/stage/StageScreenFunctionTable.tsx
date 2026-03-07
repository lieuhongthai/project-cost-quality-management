import { Card, Button, EmptyState, Tooltip, Select, ProgressBar } from "@/components/common";
import { useTranslation } from "react-i18next";
import type { StepScreenFunctionStatus } from "@/types";

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const QuickEditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);

const UnlinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface QuickEditDraft {
  status: StepScreenFunctionStatus;
  progress: number;
  estimatedEffort: number;
  actualEffort: number;
}

interface StageScreenFunctionTableProps {
  activeStep: any;
  sortOrder: "asc" | "desc" | null;
  sortScreenFunctions: (items: any[]) => any[];
  toggleSort: () => void;
  quickEditId: number | null;
  quickEditDraft: QuickEditDraft | null;
  setQuickEditDraft: React.Dispatch<React.SetStateAction<QuickEditDraft | null>>;
  saveQuickEdit: (ssfId: number) => void;
  cancelQuickEdit: () => void;
  startQuickEdit: (ssf: any) => void;
  copyOutputText: (ssf: any, stepName: string) => Promise<void>;
  copiedId: number | null;
  unlinkMutation: { mutate: (id: number) => void; isPending: boolean };
  setEditingSSF: (ssf: any) => void;
  setShowLinkScreenFunction: (show: boolean) => void;
  updateMutation: { isPending: boolean };
}

export function StageScreenFunctionTable({
  activeStep,
  sortOrder,
  sortScreenFunctions,
  toggleSort,
  quickEditId,
  quickEditDraft,
  setQuickEditDraft,
  saveQuickEdit,
  cancelQuickEdit,
  startQuickEdit,
  copyOutputText,
  copiedId,
  unlinkMutation,
  setEditingSSF,
  setShowLinkScreenFunction,
  updateMutation,
}: StageScreenFunctionTableProps) {
  const { t } = useTranslation();

  return (
    <Card
      title={`${activeStep.name} - ${t('stages.linkedScreenFunctions')}`}
      actions={
        <Button size="sm" onClick={() => setShowLinkScreenFunction(true)}>
          {t('stages.linkScreenFunction')}
        </Button>
      }
    >
      {activeStep.screenFunctions && activeStep.screenFunctions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                  <button
                    type="button"
                    onClick={toggleSort}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    {t('screenFunction.name')}
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : '↕'}
                    </span>
                  </button>
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {t('stages.assignedMembers')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {t('screenFunction.status')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {t('screenFunction.progress')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {t('stages.estEffort')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {t('stages.actEffort')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {t('stages.estimatedSchedule')}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {t('stages.actualSchedule')}
                </th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 w-36">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortScreenFunctions(activeStep.screenFunctions).map((ssf: any) => {
                const isQuickEditing = quickEditId === ssf.id;
                const draft = isQuickEditing ? quickEditDraft : null;
                const statusValue = draft ? draft.status : (ssf.status || 'Not Started');
                const progressValue = draft ? draft.progress : (ssf.progress || 0);
                const estimatedValue = draft ? draft.estimatedEffort : (ssf.estimatedEffort || 0);
                const actualValue = draft ? draft.actualEffort : (ssf.actualEffort || 0);

                return (
                  <tr key={ssf.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                      <p className="font-medium text-gray-900">
                        {ssf.screenFunction?.name || t('common.unknown')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          ssf.screenFunction?.type === 'Screen'
                            ? 'bg-purple-100 text-purple-800'
                            : ssf.screenFunction?.type === 'Function'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {ssf.screenFunction?.type || '-'}
                        </span>
                        {ssf.note && (
                          <Tooltip content={ssf.note}>
                            <span className="text-xs text-gray-400 cursor-help">
                              (note)
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {ssf.members && ssf.members.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ssf.members.slice(0, 2).map((m: any) => (
                            <span key={m.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                              {m.member?.name || t('common.unknown')}
                            </span>
                          ))}
                          {ssf.members.length > 2 && (
                            <Tooltip content={ssf.members.slice(2).map((m: any) => m.member?.name).join(', ')}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 cursor-help">
                                +{ssf.members.length - 2}
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">{t('stages.noMembersAssigned')}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {isQuickEditing ? (
                        <Select
                          value={statusValue}
                          onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                            ...prev,
                            status: e.target.value as StepScreenFunctionStatus,
                          }) : prev)}
                          options={[
                            { value: 'Not Started', label: t('screenFunction.statusNotStarted') },
                            { value: 'In Progress', label: t('screenFunction.statusInProgress') },
                            { value: 'Completed', label: t('screenFunction.statusCompleted') },
                            { value: 'Skipped', label: t('screenFunction.statusSkipped') },
                          ]}
                          size="small"
                        />
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded ${
                          statusValue === 'Completed' ? 'bg-green-100 text-green-800' :
                          statusValue === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          statusValue === 'Skipped' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {statusValue}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {isQuickEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={progressValue}
                          onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                            ...prev,
                            progress: Number(e.target.value),
                          }) : prev)}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <div className="w-20">
                          <ProgressBar progress={progressValue} showLabel />
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {estimatedValue}h
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {actualValue}h
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {ssf.estimatedStartDate || ssf.estimatedEndDate ? (
                        <div className="space-y-0.5">
                          <div className="text-xs text-gray-500">
                            {ssf.estimatedStartDate ? new Date(ssf.estimatedStartDate).toLocaleDateString() : '—'}
                          </div>
                          <div className="text-xs text-gray-400">
                            → {ssf.estimatedEndDate ? new Date(ssf.estimatedEndDate).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {ssf.actualStartDate || ssf.actualEndDate ? (
                        <div className="space-y-0.5">
                          <div className="text-xs text-green-700">
                            {ssf.actualStartDate ? new Date(ssf.actualStartDate).toLocaleDateString() : '—'}
                          </div>
                          <div className="text-xs text-green-600">
                            → {ssf.actualEndDate ? new Date(ssf.actualEndDate).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="flex items-center justify-center gap-1">
                        {isQuickEditing ? (
                          <>
                            <Tooltip content={t('common.save')}>
                              <button
                                onClick={() => saveQuickEdit(ssf.id)}
                                disabled={updateMutation.isPending}
                                className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <CheckIcon />
                              </button>
                            </Tooltip>
                            <Tooltip content={t('common.cancel')}>
                              <button
                                onClick={cancelQuickEdit}
                                className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                <XIcon />
                              </button>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip content={t('stages.outputText')}>
                              <button
                                onClick={() => copyOutputText(ssf, activeStep.name)}
                                className={`p-1.5 rounded-md transition-colors ${
                                  copiedId === ssf.id
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <CopyIcon />
                              </button>
                            </Tooltip>
                            <Tooltip content={t('stages.quickEdit')}>
                              <button
                                onClick={() => startQuickEdit(ssf)}
                                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <QuickEditIcon />
                              </button>
                            </Tooltip>
                            <Tooltip content={t('common.edit')}>
                              <button
                                onClick={() => setEditingSSF(ssf)}
                                className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                <EditIcon />
                              </button>
                            </Tooltip>
                            <Tooltip content={t('stages.unlink')}>
                              <button
                                onClick={() => {
                                  if (confirm(t('stages.unlinkConfirm'))) {
                                    unlinkMutation.mutate(ssf.id);
                                  }
                                }}
                                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <UnlinkIcon />
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={t('stages.noLinkedScreenFunctions')}
          description={t('stages.linkScreenFunctionsDescription')}
          action={
            <Button onClick={() => setShowLinkScreenFunction(true)}>
              {t('stages.linkScreenFunction')}
            </Button>
          }
        />
      )}
    </Card>
  );
}
