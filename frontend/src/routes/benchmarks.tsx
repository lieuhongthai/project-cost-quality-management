import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { projectApi } from '@/services/api'
import type { Project } from '@/types'

// MUI imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

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

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'Good': return 'success'
    case 'Warning': return 'warning'
    case 'At Risk': return 'error'
    default: return 'default'
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

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'Good': return t('project.statusGood')
      case 'Warning': return t('project.statusWarning')
      case 'At Risk': return t('project.statusAtRisk')
      default: return status
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t('benchmark.noProjects')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('benchmark.noProjectsHint')}
        </Typography>
        <Button component={Link} to="/projects" variant="contained">
          {t('project.create')}
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {t('benchmark.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('benchmark.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setSelectedIds(projects.map((p) => p.id))}>
            {t('benchmark.selectAll')}
          </Button>
          <Button variant="outlined" size="small" onClick={() => setSelectedIds([])}>
            {t('benchmark.clearAll')}
          </Button>
        </Box>
      </Box>

      {/* Explanation Card */}
      <Card>
        <CardHeader title={t('benchmark.explanationTitle')} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {t('benchmark.explanationBody')}
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                  {t('benchmark.formulaLabel')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t('benchmark.formulaDetail')}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                  {t('benchmark.componentsLabel')}
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2, '& li': { typography: 'body2', mb: 0.5 } }}>
                  <li>{t('benchmark.componentsProgress')}</li>
                  <li>{t('benchmark.componentsEffort')}</li>
                  <li>{t('benchmark.componentsStatus')}</li>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Selection Card */}
      <Card>
        <CardHeader title={t('benchmark.selectTitle')} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('benchmark.selectHint')}
          </Typography>
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={project.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderColor: selectedIds.includes(project.id) ? 'primary.main' : 'divider',
                    bgcolor: selectedIds.includes(project.id) ? 'primary.50' : 'transparent',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                  onClick={() => toggleSelection(project.id)}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedIds.includes(project.id)}
                        onChange={() => toggleSelection(project.id)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {project.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {project.description || t('benchmark.noDescription')}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {selectedProjects.length < 2 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('benchmark.needMore')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('benchmark.needMoreHint')}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title={t('benchmark.topPerformer')} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
                <CardContent sx={{ pt: 0 }}>
                  {topPerformer ? (
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {topPerformer.project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t('benchmark.score')}
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="primary.main">
                        {topPerformer.benchmarkScore}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t('benchmark.noData')}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title={t('benchmark.highestRisk')} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
                <CardContent sx={{ pt: 0 }}>
                  {highestRisk ? (
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {highestRisk.project.name}
                      </Typography>
                      <Chip
                        label={getStatusTranslation(highestRisk.project.status)}
                        color={getStatusColor(highestRisk.project.status)}
                        size="small"
                        sx={{ my: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {t('benchmark.score')}
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="error.main">
                        {highestRisk.benchmarkScore}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t('benchmark.noData')}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title={t('benchmark.mostEfficient')} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
                <CardContent sx={{ pt: 0 }}>
                  {mostEfficient ? (
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {mostEfficient.project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t('benchmark.effortVariance')}
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {formatVariance(mostEfficient.effortVariance)}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">{t('benchmark.noData')}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Summary Table */}
          <Card>
            <CardHeader title={t('benchmark.summaryTitle')} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>{t('benchmark.rank')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('project.name')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('project.status')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('benchmark.progress')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('benchmark.effortVariance')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('benchmark.score')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rankedMetrics.map((metric, index) => (
                      <TableRow key={metric.project.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>#{index + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Link
                            to="/projects/$projectId"
                            params={{ projectId: metric.project.id.toString() }}
                            search={{ tab: 'overview' }}
                            style={{ textDecoration: 'none' }}
                          >
                            <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                              {metric.project.name}
                            </Typography>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusTranslation(metric.project.status)}
                            color={getStatusColor(metric.project.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={metric.project.progress}
                              sx={{ width: 60, height: 6, borderRadius: 1 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {metric.project.progress.toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ color: metric.effortVariance > 0 ? 'error.main' : 'success.main' }}
                          >
                            {formatVariance(metric.effortVariance)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {metric.benchmarkScore}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={metric.benchmarkScore}
                              color="success"
                              sx={{ width: 60, height: 6, borderRadius: 1 }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Insights Card */}
          <Card>
            <CardHeader title={t('benchmark.insightsTitle')} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">
                      {t('benchmark.insightLeadership')}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {topPerformer
                        ? t('benchmark.insightLeadershipDetail', {
                            project: topPerformer.project.name,
                            score: topPerformer.benchmarkScore,
                          })
                        : t('benchmark.noData')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">
                      {t('benchmark.insightRisk')}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {highestRisk
                        ? t('benchmark.insightRiskDetail', {
                            project: highestRisk.project.name,
                            status: t(`project.status${highestRisk.project.status.replace(' ', '')}`),
                          })
                        : t('benchmark.noData')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">
                      {t('benchmark.insightEfficiency')}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {mostEfficient
                        ? t('benchmark.insightEfficiencyDetail', {
                            project: mostEfficient.project.name,
                            variance: formatVariance(mostEfficient.effortVariance),
                          })
                        : t('benchmark.noData')}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}
