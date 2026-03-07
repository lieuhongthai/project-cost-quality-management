import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Card, Button, Modal } from '@/components/common'
import { CommentaryForm } from '@/components/forms'

interface ReportCommentarySectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commentaries: any[] | undefined
  reportId: number
  showAddCommentary: boolean
  setShowAddCommentary: (v: boolean) => void
}

export function ReportCommentarySection({
  commentaries,
  reportId,
  showAddCommentary,
  setShowAddCommentary,
}: ReportCommentarySectionProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('report.commentary')}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('report.detail.commentaryDescription')}
            </p>
          </div>
          <Button onClick={() => setShowAddCommentary(true)}>
            ✍️ {t('report.addCommentary')}
          </Button>
        </div>

        {commentaries && commentaries.length > 0 ? (
          <div className="space-y-4">
            {commentaries.map((commentary) => (
              <Card key={commentary.id} className="border-l-4 border-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          commentary.type === 'AI Generated'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {commentary.type === 'AI Generated'
                          ? `🤖 ${t('report.aiCommentary')}`
                          : `👤 ${t('report.manualCommentary')}`}
                      </span>
                      {commentary.author && (
                        <span className="text-sm font-medium text-gray-700">
                          {t('report.detail.commentaryBy', { author: commentary.author })}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        • {format(new Date(commentary.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        v{commentary.version}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {commentary.content}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">📝</span>
              <p className="text-gray-600 font-medium mb-2">{t('report.noCommentary')}</p>
              <p className="text-sm text-gray-500 mb-4">{t('report.addFirstCommentary')}</p>
              <Button onClick={() => setShowAddCommentary(true)} size="sm">
                {t('report.detail.addFirstCommentaryButton')}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={showAddCommentary}
        onClose={() => setShowAddCommentary(false)}
        title={t('report.addCommentary')}
      >
        <CommentaryForm
          reportId={reportId}
          onSuccess={() => setShowAddCommentary(false)}
          onCancel={() => setShowAddCommentary(false)}
        />
      </Modal>
    </>
  )
}
