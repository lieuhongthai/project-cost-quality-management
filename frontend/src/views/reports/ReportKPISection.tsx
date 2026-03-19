import { useTranslation } from 'react-i18next'
import { Card, ProgressBar } from '@/components/common'
import { getSPIColor, getCPIColor, getDelayRateColor } from './reportUtils'
import { MetricInfoTooltip } from './MetricInfoTooltip'

interface ReportKPISectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metric: any
}

export function ReportKPISection({ metric }: ReportKPISectionProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Key Performance Indicators */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('metrics.kpi')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* SPI */}
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.schedulePerformance')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.spi.description')}
                  formula={t('metrics.tooltip.spi.formula')}
                  thresholds={t('metrics.tooltip.spi.thresholds')}
                />
              </p>
              <span className="text-2xl">📅</span>
            </div>
            <p className={`text-4xl font-bold ${getSPIColor(metric.schedulePerformanceIndex)}`}>
              {metric.schedulePerformanceIndex.toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {metric.schedulePerformanceIndex >= 1
                ? `✓ ${t('metrics.onSchedule')}`
                : `⚠ ${t('metrics.behindSchedule')}`}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t('metrics.target')}: 1.0+</span>
                <span>
                  {metric.schedulePerformanceIndex >= 0.95
                    ? t('metrics.good')
                    : metric.schedulePerformanceIndex >= 0.80
                      ? t('metrics.warning')
                      : t('metrics.atRisk')}
                </span>
              </div>
              <ProgressBar
                progress={Math.min(metric.schedulePerformanceIndex * 100, 100)}
                className={
                  metric.schedulePerformanceIndex >= 0.95
                    ? 'bg-green-500'
                    : metric.schedulePerformanceIndex >= 0.80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }
              />
            </div>
          </Card>

          {/* CPI */}
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.costPerformance')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.cpi.description')}
                  formula={t('metrics.tooltip.cpi.formula')}
                  thresholds={t('metrics.tooltip.cpi.thresholds')}
                />
              </p>
              <span className="text-2xl">💰</span>
            </div>
            <p className={`text-4xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
              {metric.costPerformanceIndex.toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {metric.costPerformanceIndex >= 1
                ? `✓ ${t('metrics.underBudget')}`
                : `⚠ ${t('metrics.overBudget')}`}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t('metrics.target')}: 1.0+</span>
                <span>
                  {metric.costPerformanceIndex >= 0.95
                    ? t('metrics.good')
                    : metric.costPerformanceIndex >= 0.80
                      ? t('metrics.warning')
                      : t('metrics.atRisk')}
                </span>
              </div>
              <ProgressBar
                progress={Math.min(metric.costPerformanceIndex * 100, 100)}
                className={
                  metric.costPerformanceIndex >= 0.95
                    ? 'bg-green-500'
                    : metric.costPerformanceIndex >= 0.80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }
              />
            </div>
          </Card>

          {/* Delay Rate */}
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 flex items-center">
                {t('metrics.delayRate')}
                <MetricInfoTooltip
                  description={t('metrics.tooltip.delayRate.description')}
                  formula={t('metrics.tooltip.delayRate.formula')}
                  thresholds={t('metrics.tooltip.delayRate.thresholds')}
                />
              </p>
              <span className="text-2xl">⏱️</span>
            </div>
            <p className={`text-4xl font-bold ${getDelayRateColor(metric.delayRate)}`}>
              {metric.delayRate.toFixed(1)}%
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {metric.delayRate <= 5
                ? `✓ ${t('metrics.minimalDelays')}`
                : metric.delayRate <= 20
                  ? `⚠ ${t('metrics.someDelays')}`
                  : `⚠ ${t('metrics.significantDelays')}`}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t('metrics.target')}: &lt;5%</span>
                <span>
                  {metric.delayRate <= 5
                    ? t('metrics.good')
                    : metric.delayRate <= 20
                      ? t('metrics.warning')
                      : t('metrics.atRisk')}
                </span>
              </div>
              <ProgressBar
                progress={Math.min(metric.delayRate, 100)}
                className={
                  metric.delayRate <= 5
                    ? 'bg-green-500'
                    : metric.delayRate <= 20
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }
              />
            </div>
          </Card>
        </div>
      </div>

      {/* EVM Core Values */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('metrics.evm')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('metrics.evmDescription')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-blue-50">
            <p className="text-xs font-medium text-blue-600 mb-1 flex items-center">
              {t('metrics.bac')}
              <MetricInfoTooltip
                description={t('metrics.tooltip.bac.description')}
                formula={t('metrics.tooltip.bac.formula')}
              />
            </p>
            <p className="text-2xl font-bold text-blue-900">
              {(metric.budgetAtCompletion || metric.plannedValue).toFixed(2)}
            </p>
            <p className="text-xs text-blue-600">{t('metrics.bacFull')}</p>
          </Card>
          <Card className="bg-slate-50">
            <p className="text-xs font-medium text-slate-600 mb-1 flex items-center">
              {t('metrics.pv')}
              <MetricInfoTooltip
                description={t('metrics.tooltip.pv.description')}
                formula={t('metrics.tooltip.pv.formula')}
              />
            </p>
            <p className="text-2xl font-bold text-slate-900">{metric.plannedValue.toFixed(2)}</p>
            <p className="text-xs text-slate-600">{t('metrics.pvFull')}</p>
          </Card>
          <Card className="bg-green-50">
            <p className="text-xs font-medium text-green-600 mb-1 flex items-center">
              {t('metrics.ev')}
              <MetricInfoTooltip
                description={t('metrics.tooltip.ev.description')}
                formula={t('metrics.tooltip.ev.formula')}
              />
            </p>
            <p className="text-2xl font-bold text-green-900">{metric.earnedValue.toFixed(2)}</p>
            <p className="text-xs text-green-600">{t('metrics.evFull')}</p>
          </Card>
          <Card className="bg-amber-50">
            <p className="text-xs font-medium text-amber-600 mb-1 flex items-center">
              {t('metrics.ac')}
              <MetricInfoTooltip
                description={t('metrics.tooltip.ac.description')}
                formula={t('metrics.tooltip.ac.formula')}
              />
            </p>
            <p className="text-2xl font-bold text-amber-900">{metric.actualCost.toFixed(2)}</p>
            <p className="text-xs text-amber-600">{t('metrics.acFull')}</p>
          </Card>
          <Card className="bg-purple-50">
            <p className="text-xs font-medium text-purple-600 mb-1 flex items-center">
              {t('metrics.spi')}
              <MetricInfoTooltip
                description={t('metrics.tooltip.spi.description')}
                formula={t('metrics.tooltip.spi.formula')}
                thresholds={t('metrics.tooltip.spi.thresholds')}
              />
            </p>
            <p className={`text-2xl font-bold ${getSPIColor(metric.schedulePerformanceIndex)}`}>
              {metric.schedulePerformanceIndex.toFixed(2)}
            </p>
            <p className="text-xs text-purple-600">{t('metrics.spiFull')}</p>
          </Card>
          <Card className="bg-indigo-50">
            <p className="text-xs font-medium text-indigo-600 mb-1 flex items-center">
              {t('metrics.cpi')}
              <MetricInfoTooltip
                description={t('metrics.tooltip.cpi.description')}
                formula={t('metrics.tooltip.cpi.formula')}
                thresholds={t('metrics.tooltip.cpi.thresholds')}
              />
            </p>
            <p className={`text-2xl font-bold ${getCPIColor(metric.costPerformanceIndex)}`}>
              {metric.costPerformanceIndex.toFixed(2)}
            </p>
            <p className="text-xs text-indigo-600">{t('metrics.cpiFull')}</p>
          </Card>
        </div>
      </div>
    </>
  )
}
