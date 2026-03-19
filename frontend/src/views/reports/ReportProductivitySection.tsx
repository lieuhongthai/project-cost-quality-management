import { useTranslation } from 'react-i18next'
import { Card } from '@/components/common'
import { MetricInfoTooltip } from './MetricInfoTooltip'

interface ReportProductivitySectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  productivity: any
}

export function ReportProductivitySection({ productivity }: ReportProductivitySectionProps) {
  const { t } = useTranslation()

  if (!productivity?.byMember?.length) return null

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('productivity.title')}</h2>
      <p className="text-sm text-gray-500 mb-4">{t('productivity.description')}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Card className="bg-linear-to-br from-indigo-50 to-white">
          <p className="text-sm font-medium text-indigo-600 flex items-center">
            {t('productivity.teamEfficiency')}
            <MetricInfoTooltip
              description={t('metrics.tooltip.teamEfficiency.description')}
              formula={t('metrics.tooltip.teamEfficiency.formula')}
              thresholds={t('metrics.tooltip.teamEfficiency.thresholds')}
            />
          </p>
          <p
            className={`text-3xl font-bold ${
              productivity.summary.efficiency >= 1
                ? 'text-green-600'
                : productivity.summary.efficiency >= 0.83
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {(productivity.summary.efficiency * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">{t('productivity.overallTeamEfficiency')}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600 flex items-center">
            {t('productivity.tasksCompleted')}
            <MetricInfoTooltip
              description={t('metrics.tooltip.completionRate.description')}
              formula={t('metrics.tooltip.completionRate.formula')}
            />
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {productivity.summary.tasksCompleted}/{productivity.summary.tasksTotal}
          </p>
          <p className="text-xs text-gray-500">
            {productivity.summary.completionRate}% {t('productivity.completionRate')}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600 flex items-center">
            {t('productivity.avgEffortPerTask')}
            <MetricInfoTooltip
              description={t('metrics.tooltip.avgEffortPerTask.description')}
              formula={t('metrics.tooltip.avgEffortPerTask.formula')}
            />
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {productivity.summary.avgEffortPerTask.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">{t('productivity.manHoursPerTask')}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">{t('productivity.variance')}</p>
          <p
            className={`text-3xl font-bold ${
              productivity.summary.variance <= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {productivity.summary.variance > 0 ? '+' : ''}
            {productivity.summary.variancePercent}%
          </p>
          <p className="text-xs text-gray-500">{t('productivity.actualVsEstimated')}</p>
        </Card>
      </div>

      {/* Member Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={t('productivity.byMember')}>
          <div className="overflow-x-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    {t('productivity.member')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    {t('productivity.role')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    {t('productivity.tasks')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    <span className="inline-flex items-center">
                      {t('metrics.efficiency')}
                      <MetricInfoTooltip
                        description={t('metrics.tooltip.memberEfficiency.description')}
                        formula={t('metrics.tooltip.memberEfficiency.formula')}
                        thresholds={t('metrics.tooltip.memberEfficiency.thresholds')}
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productivity.byMember.slice(0, 10).map((member: any) => (
                  <tr key={member.memberId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{member.name}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {member.tasksCompleted}/{member.tasksTotal}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-semibold ${
                          member.efficiency >= 1
                            ? 'text-green-600'
                            : member.efficiency >= 0.83
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {(member.efficiency * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t('productivity.byRole')}>
          <div className="overflow-x-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    {t('productivity.role')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    {t('productivity.members')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    {t('productivity.tasks')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    {t('productivity.avgPerTask')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    <span className="inline-flex items-center">
                      {t('metrics.efficiency')}
                      <MetricInfoTooltip
                        description={t('metrics.tooltip.memberEfficiency.description')}
                        formula={t('metrics.tooltip.memberEfficiency.formula')}
                        thresholds={t('metrics.tooltip.memberEfficiency.thresholds')}
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productivity.byRole.map((role: any) => (
                  <tr key={role.role} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{role.role}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{role.memberCount}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {role.tasksCompleted}/{role.tasksTotal}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {role.avgEffortPerTask.toFixed(1)}h
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-semibold ${
                          role.efficiency >= 1
                            ? 'text-green-600'
                            : role.efficiency >= 0.83
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {(role.efficiency * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
