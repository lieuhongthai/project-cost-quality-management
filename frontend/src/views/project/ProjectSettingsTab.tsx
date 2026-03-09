import { Card, Button, DateInput, HolidayImportDialog } from "@/components/common";
import {
  EffortUnitDropdown,
} from "@/components/common/EffortUnitSelector";
import {
  WorkflowConfigPanel,
  WorklogMappingRulePanel,
  MetricConfigPanel,
} from "@/components/task-workflow";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { EffortUnit } from "@/types";
import { DAYS_OF_WEEK } from "@/types";

interface ProjectSettingsTabProps {
  projectId: string;
  settingsForm: {
    workingHoursPerDay: number;
    workingDaysPerMonth: number;
    defaultEffortUnit: EffortUnit;
    nonWorkingDays: number[];
    holidays: string[];
  };
  setSettingsForm: (form: any) => void;
  newHoliday: string;
  setNewHoliday: (holiday: string) => void;
  showHolidayImport: boolean;
  setShowHolidayImport: (show: boolean) => void;
  updateSettingsMutation: { isPending: boolean; isSuccess: boolean };
  handleSaveSettings: () => void;
}

export function ProjectSettingsTab({
  projectId,
  settingsForm,
  setSettingsForm,
  newHoliday,
  setNewHoliday,
  showHolidayImport,
  setShowHolidayImport,
  updateSettingsMutation,
  handleSaveSettings,
}: ProjectSettingsTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <WorkflowConfigPanel projectId={parseInt(projectId)} />

      <WorklogMappingRulePanel projectId={parseInt(projectId)} />

      <MetricConfigPanel projectId={parseInt(projectId)} />

      <Card title={t("settings.workTimeConfig")}>
        <p className="text-sm text-gray-500 mb-6">
          {t("settings.workTimeConfigDesc")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("settings.workingHoursPerDay")}
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={settingsForm.workingHoursPerDay}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  workingHoursPerDay: parseInt(e.target.value) || 8,
                })
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("settings.standard")}: 8 {t("time.hours")}/{t("time.days")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("settings.workingDaysPerMonth")}
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={settingsForm.workingDaysPerMonth}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  workingDaysPerMonth: parseInt(e.target.value) || 20,
                })
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("settings.standard")}: 20-22 {t("time.days")}/{t("time.months")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("settings.defaultEffortUnit")}
            </label>
            <EffortUnitDropdown
              value={settingsForm.defaultEffortUnit}
              onChange={(unit) =>
                setSettingsForm({ ...settingsForm, defaultEffortUnit: unit })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Default display unit for efforts
            </p>
          </div>
        </div>

        {/* Conversion Preview */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t("settings.conversionPreview")}
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white rounded border">
              <p className="text-2xl font-bold text-primary">1</p>
              <p className="text-gray-500">Man-Month</p>
            </div>
            <div className="text-center p-3 bg-white rounded border">
              <p className="text-2xl font-bold text-primary">
                {settingsForm.workingDaysPerMonth}
              </p>
              <p className="text-gray-500">Man-Days</p>
            </div>
            <div className="text-center p-3 bg-white rounded border">
              <p className="text-2xl font-bold text-primary">
                {settingsForm.workingHoursPerDay * settingsForm.workingDaysPerMonth}
              </p>
              <p className="text-gray-500">Man-Hours</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            1 MM = {settingsForm.workingDaysPerMonth} MD ={" "}
            {settingsForm.workingHoursPerDay * settingsForm.workingDaysPerMonth} MH
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending
              ? t("common.loading")
              : t("settings.saveSettings")}
          </Button>
        </div>
        {updateSettingsMutation.isSuccess && (
          <p className="text-sm text-green-600 mt-2 text-right">
            {t("settings.settingsSaved")}
          </p>
        )}
      </Card>

      {/* Current Settings Summary */}
      <Card title={t("settings.currentConversionRates")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t("settings.fromManHours")}
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>1 MH = {(1 / settingsForm.workingHoursPerDay).toFixed(4)} MD</li>
              <li>
                1 MH ={" "}
                {(
                  1 /
                  (settingsForm.workingHoursPerDay * settingsForm.workingDaysPerMonth)
                ).toFixed(6)}{" "}
                MM
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t("settings.fromManDays")}
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>1 MD = {settingsForm.workingHoursPerDay} MH</li>
              <li>1 MD = {(1 / settingsForm.workingDaysPerMonth).toFixed(4)} MM</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Work Calendar Settings */}
      <Card title={t("settings.workCalendar")}>
        <p className="text-sm text-gray-500 mb-6">
          {t("settings.workCalendarDesc")}
        </p>

        {/* Non-Working Days */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t("settings.nonWorkingDaysOfWeek")}
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = settingsForm.nonWorkingDays.includes(day.value);
              const wouldBeAllNonWorking =
                !isSelected && settingsForm.nonWorkingDays.length >= 6;

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    if (wouldBeAllNonWorking) return;
                    setSettingsForm({
                      ...settingsForm,
                      nonWorkingDays: isSelected
                        ? settingsForm.nonWorkingDays.filter((d) => d !== day.value)
                        : [...settingsForm.nonWorkingDays, day.value].sort((a, b) => a - b),
                    });
                  }}
                  disabled={wouldBeAllNonWorking}
                  title={
                    wouldBeAllNonWorking ? t("settings.atLeastOneWorkingDay") : undefined
                  }
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-red-100 border-red-300 text-red-700"
                      : wouldBeAllNonWorking
                        ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">{t("settings.nonWorkingDaysHelp")}</p>
          {settingsForm.nonWorkingDays.length >= 6 && (
            <p className="text-xs text-orange-600 mt-1">
              {t("settings.atLeastOneWorkingDay")}
            </p>
          )}
        </div>

        {/* Holidays */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              {t("settings.holidays")}
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowHolidayImport(true)}
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {t("settings.importFromCalendar")}
              </span>
            </Button>
          </div>
          <div className="flex gap-2 mb-3">
            <DateInput
              name="newHoliday"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              fullWidth
              size="small"
            />
            <Button
              type="button"
              onClick={() => {
                if (newHoliday && !settingsForm.holidays.includes(newHoliday)) {
                  setSettingsForm({
                    ...settingsForm,
                    holidays: [...settingsForm.holidays, newHoliday].sort(),
                  });
                  setNewHoliday("");
                }
              }}
              disabled={!newHoliday}
            >
              {t("settings.addHoliday")}
            </Button>
          </div>

          {settingsForm.holidays.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {settingsForm.holidays.map((holiday) => (
                <span
                  key={holiday}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                >
                  {format(new Date(holiday), "MMM dd, yyyy")}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsForm({
                        ...settingsForm,
                        holidays: settingsForm.holidays.filter((h) => h !== holiday),
                      });
                    }}
                    className="ml-1 text-orange-500 hover:text-orange-700"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">{t("settings.noHolidaysAdded")}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">{t("settings.holidaysHelp")}</p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending
              ? t("common.loading")
              : t("settings.saveCalendarSettings")}
          </Button>
        </div>
      </Card>

      <HolidayImportDialog
        isOpen={showHolidayImport}
        onClose={() => setShowHolidayImport(false)}
        onImport={(dates) => {
          const newHolidays = [...settingsForm.holidays];
          dates.forEach((date) => {
            if (!newHolidays.includes(date)) {
              newHolidays.push(date);
            }
          });
          setSettingsForm({ ...settingsForm, holidays: newHolidays.sort() });
        }}
        existingHolidays={settingsForm.holidays}
      />
    </div>
  );
}
