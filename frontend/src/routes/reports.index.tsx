import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reportApi } from '../services/api'
import { format } from 'date-fns'
import { ReportForm } from '../components/forms'

// MUI imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'

export const Route = createFileRoute('/reports/')({
  component: ReportsList,
})

function ReportsList() {
  const { t } = useTranslation()
  const [showGenerateReport, setShowGenerateReport] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await reportApi.getAll()
      return response.data
    },
  })

  const getScopeTranslation = (scope: string) => {
    switch (scope) {
      case 'Stage': return t('report.scopeStage')
      case 'Project': return t('report.scopeProject')
      default: return scope
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {t('report.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('report.list')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowGenerateReport(true)}
        >
          {t('report.create')}
        </Button>
      </Box>

      {/* Reports List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {reports
          ?.slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((report) => (
          <Card key={report.id} sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {report.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {getScopeTranslation(report.scope)}
                    {report.stageName && ` - ${report.stageName}`}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    {t('report.reportDate')}: {format(new Date(report.reportDate), 'MMM dd, yyyy')}
                    {report.createdAt && (
                      <span> • {format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                    )}
                  </Typography>
                </Box>
                <Link
                  to="/reports/$reportId"
                  params={{ reportId: report.id.toString() }}
                  style={{ textDecoration: 'none' }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                  >
                    {t('common.details')}
                  </Button>
                </Link>
              </Box>

              {report.metrics && report.metrics.length > 0 && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid size={{ xs: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('metrics.spi')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {report.metrics[0].schedulePerformanceIndex.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('metrics.cpi')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {report.metrics[0].costPerformanceIndex.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('metrics.defectRate')}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {report.metrics[0].defectRate.toFixed(3)}
                    </Typography>
                  </Grid>
                </Grid>
              )}

              {report.commentaries && report.commentaries.length > 0 && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    {t('report.commentary')} ({report.commentaries[0].type === 'Manual' ? t('report.manualCommentary') : t('report.aiCommentary')})
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {report.commentaries[0].content}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {reports?.length === 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('report.noReports')}. {t('report.createFirst')}
          </Typography>
        </Box>
      )}

      {/* Generate Report Dialog */}
      <Dialog
        open={showGenerateReport}
        onClose={() => setShowGenerateReport(false)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('report.create')}
          <IconButton size="small" onClick={() => setShowGenerateReport(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <ReportForm
            onSuccess={() => setShowGenerateReport(false)}
            onCancel={() => setShowGenerateReport(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
