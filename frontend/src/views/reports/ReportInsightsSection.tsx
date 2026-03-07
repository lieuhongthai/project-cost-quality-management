import { useTranslation } from 'react-i18next'
import { Card } from '@/components/common'

interface ReportInsightsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metric: any
}

export function ReportInsightsSection({ metric }: ReportInsightsSectionProps) {
  const { t } = useTranslation()

  return (
    <Card className="mb-6 bg-linear-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
      <div className="flex items-start gap-3">
        <span className="text-3xl">💡</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('insights.title')}</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span
                className={`mt-0.5 ${metric.schedulePerformanceIndex >= 1 ? 'text-green-600' : 'text-yellow-600'}`}
              >
                •
              </span>
              <span>
                <strong>{t('insights.schedule')}:</strong>{' '}
                {t('insights.scheduleSummary', {
                  status:
                    metric.schedulePerformanceIndex >= 1
                      ? t('insights.aheadOfSchedule')
                      : t('insights.behindSchedule'),
                  value: Math.abs((1 - metric.schedulePerformanceIndex) * 100).toFixed(1),
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className={`mt-0.5 ${metric.costPerformanceIndex >= 1 ? 'text-green-600' : 'text-yellow-600'}`}
              >
                •
              </span>
              <span>
                <strong>{t('insights.budget')}:</strong>{' '}
                {t('insights.budgetSummary', {
                  status:
                    metric.costPerformanceIndex >= 1
                      ? t('insights.underBudget')
                      : t('insights.overBudget'),
                  value: Math.abs((1 - metric.costPerformanceIndex) * 100).toFixed(1),
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className={`mt-0.5 ${
                  metric.delayRate <= 5
                    ? 'text-green-600'
                    : metric.delayRate <= 20
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                •
              </span>
              <span>
                <strong>{t('insights.delays')}:</strong>{' '}
                {t('insights.delaysSummary', {
                  value: metric.delayRate.toFixed(1),
                  impact:
                    metric.delayRate <= 5
                      ? t('insights.minimalImpact')
                      : metric.delayRate <= 20
                        ? t('insights.moderateImpact')
                        : t('insights.significantImpact'),
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              {(() => {
                const eac = metric.estimateAtCompletion || metric.actualCost
                const bac = metric.budgetAtCompletion || metric.plannedValue
                const diff = eac - bac
                const isUnder = diff <= 0
                return (
                  <>
                    <span className={`mt-0.5 ${isUnder ? 'text-green-600' : 'text-red-600'}`}>•</span>
                    <span>
                      <strong>{t('insights.forecast')}:</strong>{' '}
                      {t('insights.forecastSummary', {
                        value: eac.toFixed(2),
                        unit: t('time.mm'),
                        status: isUnder
                          ? t('insights.savingsVsBudget', { value: Math.abs(diff).toFixed(2) })
                          : t('insights.overrunVsBudget', {
                              value: diff.toFixed(2),
                              percent: ((diff / bac) * 100).toFixed(1),
                            }),
                      })}
                    </span>
                  </>
                )
              })()}
            </li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
