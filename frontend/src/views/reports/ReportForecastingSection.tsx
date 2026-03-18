import { useTranslation } from 'react-i18next'
import { Card, ProgressBar } from '@/components/common'
import { getCPIColor, getDelayRateColor } from './reportUtils'
import { MetricInfoTooltip } from './MetricInfoTooltip'

interface ReportForecastingSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metric: any
}

export function ReportForecastingSection({ metric }: ReportForecastingSectionProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Forecasting Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('metrics.forecasting')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('metrics.forecastingDescription')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* EAC Card */}
          <Card className="border-2 border-blue-200 bg-linear-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-700 flex items-center">
                {t('metrics.eacFull')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.eac.description')}
                  formula={t('metrics.tooltip.eac.formula')}
                  thresholds={t('metrics.tooltip.eac.thresholds')}
                />
              </p>
              <span className="text-xl">🎯</span>
            </div>
            <p className="text-3xl font-bold text-blue-900">
              {(
                metric.estimateAtCompletion ||
                metric.actualCost +
                  (metric.plannedValue - metric.earnedValue) / (metric.costPerformanceIndex || 1)
              ).toFixed(2)}{' '}
              {t('time.mm')}
            </p>
            <p className="text-xs text-blue-600 mt-1">{t('metrics.eacFormula')}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>
                  {t('metrics.bac')}: {(metric.budgetAtCompletion || metric.plannedValue).toFixed(2)}
                </span>
                {(() => {
                  const eac =
                    metric.estimateAtCompletion ||
                    metric.actualCost +
                      (metric.plannedValue - metric.earnedValue) / (metric.costPerformanceIndex || 1)
                  const bac = metric.budgetAtCompletion || metric.plannedValue
                  const diff = ((eac - bac) / bac) * 100
                  return (
                    <span
                      className={
                        diff > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'
                      }
                    >
                      {diff > 0 ? '+' : ''}
                      {diff.toFixed(1)}%
                    </span>
                  )
                })()}
              </div>
              <ProgressBar
                progress={Math.min(
                  100,
                  ((metric.estimateAtCompletion || metric.actualCost) /
                    (metric.budgetAtCompletion || metric.plannedValue || 1)) *
                    100,
                )}
                className={
                  (metric.estimateAtCompletion || metric.actualCost) <=
                  (metric.budgetAtCompletion || metric.plannedValue)
                    ? 'bg-green-500'
                    : (metric.estimateAtCompletion || metric.actualCost) <=
                        (metric.budgetAtCompletion || metric.plannedValue) * 1.1
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }
              />
            </div>
          </Card>

          {/* VAC Card */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.vacFull')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.vac.description')}
                  formula={t('metrics.tooltip.vac.formula')}
                  thresholds={t('metrics.tooltip.vac.thresholds')}
                />
              </p>
              <span className="text-xl">📉</span>
            </div>
            {(() => {
              const vac =
                metric.varianceAtCompletion ||
                (metric.budgetAtCompletion || metric.plannedValue) -
                  (metric.estimateAtCompletion || metric.actualCost)
              const isPositive = vac >= 0
              return (
                <>
                  <p
                    className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isPositive ? '+' : ''}
                    {vac.toFixed(2)} {t('time.mm')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{t('metrics.vacFormula')}</p>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isPositive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isPositive
                        ? `✓ ${t('metrics.underBudget')}`
                        : `⚠ ${t('metrics.overBudget')}`}
                    </span>
                  </div>
                </>
              )
            })()}
          </Card>

          {/* TCPI Card */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.tcpiFull')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.tcpi.description')}
                  formula={t('metrics.tooltip.tcpi.formula')}
                  thresholds={t('metrics.tooltip.tcpi.thresholds')}
                />
              </p>
              <span className="text-xl">📈</span>
            </div>
            {(() => {
              const tcpi =
                metric.toCompletePerformanceIndex ||
                (metric.plannedValue - metric.earnedValue) /
                  ((metric.budgetAtCompletion || metric.plannedValue) - metric.actualCost)
              const isAchievable = tcpi <= 1.1
              const isHard = tcpi > 1.1 && tcpi <= 1.3
              return (
                <>
                  <p
                    className={`text-3xl font-bold ${
                      isAchievable ? 'text-green-600' : isHard ? 'text-yellow-600' : 'text-red-600'
                    }`}
                  >
                    {tcpi > 10 ? '>10' : tcpi.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{t('metrics.tcpiFormula')}</p>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isAchievable
                          ? 'bg-green-100 text-green-800'
                          : isHard
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isAchievable
                        ? `✓ ${t('metrics.achievable')}`
                        : isHard
                          ? `⚠ ${t('metrics.challenging')}`
                          : `✗ ${t('metrics.veryDifficult')}`}
                    </span>
                  </div>
                </>
              )
            })()}
          </Card>

          {/* Budget Status Card */}
          <Card
            className={`border-2 ${(() => {
              const eac = metric.estimateAtCompletion || metric.actualCost
              const bac = metric.budgetAtCompletion || metric.plannedValue
              if (eac <= bac) return 'border-green-200 bg-green-50'
              if (eac <= bac * 1.1) return 'border-yellow-200 bg-yellow-50'
              return 'border-red-200 bg-red-50'
            })()}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{t('metrics.budgetStatus')}</p>
              <span className="text-xl">💰</span>
            </div>
            {(() => {
              const eac = metric.estimateAtCompletion || metric.actualCost
              const bac = metric.budgetAtCompletion || metric.plannedValue
              const diff = eac - bac
              const diffPercent = bac > 0 ? (diff / bac) * 100 : 0
              let status, color, icon
              if (diff <= 0) {
                status = t('metrics.underControl')
                color = 'text-green-700'
                icon = '✓'
              } else if (diffPercent <= 10) {
                status = t('metrics.slightOverrun')
                color = 'text-yellow-700'
                icon = '⚠'
              } else {
                status = t('metrics.overBudget')
                color = 'text-red-700'
                icon = '✗'
              }
              return (
                <>
                  <p className={`text-2xl font-bold ${color}`}>
                    {icon} {status}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {diff <= 0
                      ? t('metrics.savingsMessage', { value: Math.abs(diff).toFixed(2) })
                      : t('metrics.overrunMessage', {
                          value: diff.toFixed(2),
                          percent: diffPercent.toFixed(1),
                        })}
                  </p>
                </>
              )
            })()}
          </Card>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('metrics.qualityMetrics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🐛</span>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.defectRate')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.defectRate.description')}
                  formula={t('metrics.tooltip.defectRate.formula')}
                />
              </p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{metric.defectRate.toFixed(3)}</p>
            <p className="mt-1 text-xs text-gray-500">{t('metrics.defectsPerTestCase')}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⏱️</span>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.delayRate')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.delayRate.description')}
                  formula={t('metrics.tooltip.delayRate.formula')}
                  thresholds={t('metrics.tooltip.delayRate.thresholds')}
                />
              </p>
            </div>
            <p className={`text-3xl font-bold ${getDelayRateColor(metric.delayRate)}`}>
              {metric.delayRate.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-gray-500">{t('metrics.tasksDelayed')}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.efficiency')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.efficiency.description')}
                  formula={t('metrics.tooltip.efficiency.formula')}
                  thresholds={t('metrics.tooltip.efficiency.thresholds')}
                />
              </p>
            </div>
            <p className={`text-3xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
              {(metric.costPerformanceIndex * 100).toFixed(0)}%
            </p>
            <p className="mt-1 text-xs text-gray-500">{t('metrics.cpiAsPercentage')}</p>
          </Card>
        </div>
      </div>
    </>
  )
}
