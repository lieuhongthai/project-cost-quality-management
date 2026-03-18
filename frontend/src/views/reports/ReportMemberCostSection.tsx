import { useTranslation } from 'react-i18next'
import { Card } from '@/components/common'
import { MetricInfoTooltip } from './MetricInfoTooltip'

interface ReportMemberCostSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memberCost: any
}

export function ReportMemberCostSection({ memberCost }: ReportMemberCostSectionProps) {
  const { t } = useTranslation()

  if (!memberCost?.byMember?.length) return null

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">💵 {t('memberCost.title')}</h2>
      <p className="text-sm text-gray-500 mb-4">{t('memberCost.description')}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card
          className={`border-2 ${
            memberCost.insights.costStatus === 'under_budget'
              ? 'border-green-200 bg-green-50'
              : memberCost.insights.costStatus === 'slight_over'
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-red-200 bg-red-50'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">{t('memberCost.totalActualCost')}</p>
          <p
            className={`text-3xl font-bold ${
              memberCost.insights.costStatus === 'under_budget'
                ? 'text-green-600'
                : memberCost.insights.costStatus === 'slight_over'
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            ${memberCost.summary.totalActualCost.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('memberCost.estimated')}: ${memberCost.summary.totalEstimatedCost.toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600 flex items-center">
            {t('memberCost.costVariance')}
            <MetricInfoTooltip
              description={t('metrics.tooltip.memberCostVariance.description')}
              formula={t('metrics.tooltip.memberCostVariance.formula')}
              thresholds={t('metrics.tooltip.memberCostVariance.thresholds')}
            />
          </p>
          <p
            className={`text-3xl font-bold ${
              memberCost.summary.totalCostVariance <= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {memberCost.summary.totalCostVariance <= 0 ? '-' : '+'}$
            {Math.abs(memberCost.summary.totalCostVariance).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {memberCost.summary.totalCostVariance <= 0
              ? t('memberCost.savings')
              : t('memberCost.exceeded')}{' '}
            {Math.abs(memberCost.summary.totalCostVariancePercent)}%{' '}
            {t('memberCost.comparedToEstimate')}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">{t('memberCost.totalHoursWorked')}</p>
          <p className="text-3xl font-bold text-gray-900">
            {memberCost.summary.totalActualHours.toLocaleString()}h
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('memberCost.estimated')}: {memberCost.summary.totalEstimatedHours.toLocaleString()}h
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600 flex items-center">
            {t('memberCost.overallEfficiency')}
            <MetricInfoTooltip
              description={t('metrics.tooltip.overallEfficiency.description')}
              formula={t('metrics.tooltip.overallEfficiency.formula')}
              thresholds={t('metrics.tooltip.overallEfficiency.thresholds')}
            />
          </p>
          <p
            className={`text-3xl font-bold ${
              memberCost.summary.overallEfficiency >= 1
                ? 'text-green-600'
                : memberCost.summary.overallEfficiency >= 0.8
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {(memberCost.summary.overallEfficiency * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('memberCost.membersParticipated', { count: memberCost.summary.totalMembers })}
          </p>
        </Card>
      </div>

      {/* Insights */}
      {(memberCost.insights.topPerformers.length > 0 ||
        memberCost.insights.needSupport.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {memberCost.insights.topPerformers.length > 0 && (
            <Card className="bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⭐</span>
                <h4 className="font-semibold text-green-800">{t('memberCost.topPerformers')}</h4>
              </div>
              <div className="space-y-2">
                {memberCost.insights.topPerformers.map((member: any, idx: number) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {(member.efficiency * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">{member.efficiencyRating}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {memberCost.insights.needSupport.length > 0 && (
            <Card className="bg-orange-50 border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤝</span>
                <h4 className="font-semibold text-orange-800">{t('memberCost.needSupport')}</h4>
              </div>
              <div className="space-y-2">
                {memberCost.insights.needSupport.map((member: any) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">
                        {(member.efficiency * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">{member.efficiencyRating}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-orange-700 mt-3">💡 {t('memberCost.needSupportTip')}</p>
            </Card>
          )}
        </div>
      )}

      {/* Member Cost Table */}
      <Card title={t('memberCost.detailByMember')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  {t('memberCost.member')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  {t('memberCost.role')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  {t('memberCost.hourlyRate')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  {t('memberCost.hoursEstAct')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  {t('memberCost.estimatedCost')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  {t('memberCost.actualCost')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  {t('memberCost.costVariance')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  <span className="inline-flex items-center">
                    {t('memberCost.efficiencyRating')}
                    <MetricInfoTooltip
                      description={t('metrics.tooltip.overallEfficiency.description')}
                      formula={t('metrics.tooltip.overallEfficiency.formula')}
                      thresholds={t('metrics.tooltip.overallEfficiency.thresholds')}
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memberCost.byMember.map((member: any) => (
                <tr key={member.memberId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">
                      {member.tasks.length} {t('productivity.tasks')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">${member.hourlyRate}/h</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {member.totalEstimatedHours.toFixed(1)}h / {member.totalActualHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    ${member.totalEstimatedCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ${member.totalActualCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-medium ${
                        member.costVariance <= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {member.costVariance <= 0 ? '-' : '+'}$
                      {Math.abs(member.costVariance).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      ({member.costVariancePercent > 0 ? '+' : ''}
                      {member.costVariancePercent}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        member.efficiencyColor === 'green'
                          ? 'bg-green-100 text-green-800'
                          : member.efficiencyColor === 'blue'
                            ? 'bg-blue-100 text-blue-800'
                            : member.efficiencyColor === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {(member.efficiency * 100).toFixed(0)}% - {member.efficiencyRating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-gray-700">
                  {t('common.total')}:
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ${memberCost.summary.totalEstimatedCost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">
                  ${memberCost.summary.totalActualCost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      memberCost.summary.totalCostVariance <= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {memberCost.summary.totalCostVariance <= 0 ? '-' : '+'}$
                    {Math.abs(memberCost.summary.totalCostVariance).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      memberCost.summary.overallEfficiency >= 1
                        ? 'bg-green-100 text-green-800'
                        : memberCost.summary.overallEfficiency >= 0.8
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {(memberCost.summary.overallEfficiency * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Stage Cost Breakdown */}
      {memberCost.byStage?.length > 0 && (
        <Card title={t('memberCost.costByStage')} className="mt-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    {t('memberCost.stage')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    {t('memberCost.memberCount')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    {t('memberCost.estimatedCost')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    {t('memberCost.actualCost')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    <span className="inline-flex items-center justify-end">
                      {t('memberCost.costVariance')}
                      <MetricInfoTooltip
                        description={t('metrics.tooltip.memberCostVariance.description')}
                        formula={t('metrics.tooltip.memberCostVariance.formula')}
                        thresholds={t('metrics.tooltip.memberCostVariance.thresholds')}
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {memberCost.byStage.map((stage: any) => (
                  <tr key={stage.stageName} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{stage.stageName}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{stage.memberCount}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${stage.estimatedCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${stage.actualCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          stage.costVariance <= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stage.costVariance <= 0 ? '-' : '+'}$
                        {Math.abs(stage.costVariance).toLocaleString()}
                        <span className="text-xs text-gray-500 ml-1">
                          ({stage.costVariancePercent > 0 ? '+' : ''}
                          {stage.costVariancePercent}%)
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Efficiency Legend */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">
          📊 {t('memberCost.efficiencyLegend')}:
        </h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">
              ≥120%
            </span>
            <span className="text-gray-600">{t('memberCost.efficiencyExcellent')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">
              100-119%
            </span>
            <span className="text-gray-600">{t('memberCost.efficiencyGood')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">
              80-99%
            </span>
            <span className="text-gray-600">{t('memberCost.efficiencyAcceptable')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">&lt;80%</span>
            <span className="text-gray-600">{t('memberCost.efficiencyNeedsImprovement')}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{t('memberCost.efficiencyFormula')}</p>
      </div>
    </div>
  )
}
