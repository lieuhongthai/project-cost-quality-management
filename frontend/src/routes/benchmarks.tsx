import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { projectApi } from '@/services/api'
import { Button, Card, EmptyState, LoadingSpinner, ProgressBar, StatusBadge } from '@/components/common'
import type { Project } from '@/types'

interface BenchmarkMetric {
  project: Project
  effortVariance: number
  effortScore: number
  statusScore: number
  benchmarkScore: number
}

const statusScoreMap: Record<Project['status'], number> = {
  Good: 100,
  Warning: 70,
  'At Risk': 40,
}

const formatVariance = (variance: number) => {
  if (Number.isNaN(variance)) return '0%'
  return `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`
}

const calculateBenchmark = (project: Project): BenchmarkMetric => {
  const effortVariance = project.estimatedEffort > 0
    ? ((project.actualEffort - project.estimatedEffort) / project.estimatedEffort) * 100
    : 0
  const effortScore = Math.max(0, 100 - Math.max(0, effortVariance))
  const statusScore = statusScoreMap[project.status]
  const benchmarkScore = Math.round(
    (project.progress * 0.5) + (effortScore * 0.3) + (statusScore * 0.2)
  )

  return {
    project,
    effortVariance,
    effortScore,
    statusScore,
    benchmarkScore,
  }
}

export const Route = createFileRoute('/benchmarks')({
  component: BenchmarksPage,
})

function BenchmarksPage() {
  const { t } = useTranslation()
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectApi.getAll()
      return response.data
    },
  })

  const [selectedIds, setSelectedIds] = useState<number[]>([])

  useEffect(() => {
    if (projects && projects.length > 0 && selectedIds.length === 0) {
      setSelectedIds(projects.slice(0, 3).map((project) => project.id))
    }
  }, [projects, selectedIds.length])

  const selectedProjects = useMemo(
    () => projects?.filter((project) => selectedIds.includes(project.id)) ?? [],
    [projects, selectedIds],
  )

  const benchmarkMetrics = useMemo(
    () => selectedProjects.map(calculateBenchmark),
    [selectedProjects],
  )

  const rankedMetrics = useMemo(
    () => [...benchmarkMetrics].sort((a, b) => b.benchmarkScore - a.benchmarkScore),
    [benchmarkMetrics],
  )

  const topPerformer = rankedMetrics[0]
  const highestRisk = rankedMetrics[rankedMetrics.length - 1]
  const mostEfficient = rankedMetrics.reduce<BenchmarkMetric | undefined>((best, metric) => {
    if (!best) return metric
    return metric.effortVariance < best.effortVariance ? metric : best
  }, undefined)

  const toggleSelection = (projectId: number) => {
    setSelectedIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    )
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        title={t('benchmark.noProjects')}
        description={t('benchmark.noProjectsHint')}
        action={(
          <Link to="/projects" className="btn btn-primary">
            {t('project.create')}
          </Link>
        )}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('benchmark.title')}</h1>
          <p className="text-gray-500">{t('benchmark.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSelectedIds(projects.map((p) => p.id))}>
            {t('benchmark.selectAll')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])}>
            {t('benchmark.clearAll')}
          </Button>
        </div>
      </div>

      <Card title={t('benchmark.explanationTitle')}>
        <p className="text-sm text-gray-600">{t('benchmark.explanationBody')}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">{t('benchmark.formulaLabel')}</p>
            <p className="mt-2 text-sm text-gray-700">{t('benchmark.formulaDetail')}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">{t('benchmark.componentsLabel')}</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li>• {t('benchmark.componentsProgress')}</li>
              <li>• {t('benchmark.componentsEffort')}</li>
              <li>• {t('benchmark.componentsStatus')}</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title={t('benchmark.selectTitle')}>
        <p className="text-sm text-gray-500 mb-4">{t('benchmark.selectHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <label
              key={project.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                selectedIds.includes(project.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(project.id)}
                onChange={() => toggleSelection(project.id)}
                className="mt-1 h-4 w-4 text-primary-600"
              />
              <div>
                <p className="font-medium text-gray-900">{project.name}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{project.description || t('benchmark.noDescription')}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {selectedProjects.length < 2 ? (
        <EmptyState
          title={t('benchmark.needMore')}
          description={t('benchmark.needMoreHint')}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title={t('benchmark.topPerformer')}>
              {topPerformer ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900">{topPerformer.project.name}</p>
                  <p className="text-sm text-gray-500">{t('benchmark.score')}</p>
                  <p className="text-3xl font-bold text-primary-600">{topPerformer.benchmarkScore}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('benchmark.noData')}</p>
              )}
            </Card>
            <Card title={t('benchmark.highestRisk')}>
              {highestRisk ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900">{highestRisk.project.name}</p>
                  <StatusBadge status={highestRisk.project.status} />
                  <p className="text-sm text-gray-500">{t('benchmark.score')}</p>
                  <p className="text-3xl font-bold text-red-600">{highestRisk.benchmarkScore}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('benchmark.noData')}</p>
              )}
            </Card>
            <Card title={t('benchmark.mostEfficient')}>
              {mostEfficient ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900">{mostEfficient.project.name}</p>
                  <p className="text-sm text-gray-500">{t('benchmark.effortVariance')}</p>
                  <p className="text-3xl font-bold text-green-600">{formatVariance(mostEfficient.effortVariance)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('benchmark.noData')}</p>
              )}
            </Card>
          </div>

          <Card title={t('benchmark.summaryTitle')}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('benchmark.rank')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('project.name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('project.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('benchmark.progress')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('benchmark.effortVariance')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('benchmark.score')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rankedMetrics.map((metric, index) => (
                    <tr key={metric.project.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">#{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <Link
                          to="/projects/$projectId"
                          params={{ projectId: metric.project.id.toString() }}
                          search={{ tab: 'overview' }}
                          className="font-semibold text-primary-600 hover:text-primary-700"
                        >
                          {metric.project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={metric.project.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="space-y-1">
                          <ProgressBar progress={metric.project.progress} size="sm" />
                          <span className="text-xs text-gray-500">{metric.project.progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className={metric.effortVariance > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatVariance(metric.effortVariance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">{metric.benchmarkScore}</span>
                          <ProgressBar progress={metric.benchmarkScore} size="sm" color="success" className="w-20" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={t('benchmark.insightsTitle')}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-500">{t('benchmark.insightLeadership')}</p>
                <p className="mt-2 text-sm text-gray-700">
                  {topPerformer
                    ? t('benchmark.insightLeadershipDetail', {
                        project: topPerformer.project.name,
                        score: topPerformer.benchmarkScore,
                      })
                    : t('benchmark.noData')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-500">{t('benchmark.insightRisk')}</p>
                <p className="mt-2 text-sm text-gray-700">
                  {highestRisk
                    ? t('benchmark.insightRiskDetail', {
                        project: highestRisk.project.name,
                        status: t(`project.status${highestRisk.project.status.replace(' ', '')}`),
                      })
                    : t('benchmark.noData')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-500">{t('benchmark.insightEfficiency')}</p>
                <p className="mt-2 text-sm text-gray-700">
                  {mostEfficient
                    ? t('benchmark.insightEfficiencyDetail', {
                        project: mostEfficient.project.name,
                        variance: formatVariance(mostEfficient.effortVariance),
                      })
                    : t('benchmark.noData')}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
