import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { Commentary } from './commentary.model';
import { CreateCommentaryDto, UpdateCommentaryDto, GenerateCommentaryDto } from './commentary.dto';
import { ReportService } from '../report/report.service';
import { MetricsService } from '../metrics/metrics.service';
import { TaskWorkflowService } from '../task-workflow/task-workflow.service';
import OpenAI from 'openai';

@Injectable()
export class CommentaryService {
  private openai: OpenAI;

  constructor(
    @Inject('COMMENTARY_REPOSITORY')
    private commentaryRepository: typeof Commentary,
    private reportService: ReportService,
    @Inject(forwardRef(() => MetricsService))
    private metricsService: MetricsService,
    private taskWorkflowService: TaskWorkflowService,
  ) {
    // Initialize OpenAI client
    // Note: API key should be in environment variables
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async findAll(): Promise<Commentary[]> {
    return this.commentaryRepository.findAll();
  }

  async findByReport(reportId: number): Promise<Commentary[]> {
    return this.commentaryRepository.findAll({
      where: { reportId },
      order: [['version', 'DESC']],
    });
  }

  async findOne(id: number): Promise<Commentary> {
    const commentary = await this.commentaryRepository.findByPk(id);

    if (!commentary) {
      throw new NotFoundException(`Commentary with ID ${id} not found`);
    }

    return commentary;
  }

  async create(createCommentaryDto: CreateCommentaryDto): Promise<Commentary> {
    return this.commentaryRepository.create(createCommentaryDto as any);
  }

  async update(id: number, updateCommentaryDto: UpdateCommentaryDto): Promise<Commentary> {
    const commentary = await this.findOne(id);
    await commentary.update(updateCommentaryDto);
    return commentary;
  }

  async remove(id: number): Promise<void> {
    const commentary = await this.findOne(id);
    await commentary.destroy();
  }

  async generateAICommentary(generateCommentaryDto: GenerateCommentaryDto): Promise<Commentary> {
    const { reportId, language = 'English' } = generateCommentaryDto;
    const report = await this.reportService.findOne(reportId);

    let metrics = report.metrics && report.metrics.length > 0 ? report.metrics[0] : null;

    // If no metrics exist, automatically generate them based on report scope
    if (!metrics) {
      console.log(`No metrics found for report ${reportId}, generating automatically...`);

      if (report.scope === 'Project') {
        // For project-level reports, calculate project metrics
        metrics = await this.metricsService.calculateProjectMetrics(report.projectId, reportId);
      } else if (report.scope === 'Stage') {
        // For stage-level reports, calculate stage metrics
        if (!report.stageId) {
          // If stageId is not set, try to find stage by name
          if (report.stageName) {
            const stages = await this.taskWorkflowService.findAllStages(report.projectId);
            const stage = stages.find(s => s.name === report.stageName);
            if (!stage) {
              throw new BadRequestException(`Stage '${report.stageName}' not found for this project`);
            }
            metrics = await this.metricsService.calculateStageMetrics(stage.id, reportId);
          } else {
            throw new BadRequestException(`Report scope is 'Stage' but no stageId or stageName provided`);
          }
        } else {
          metrics = await this.metricsService.calculateStageMetrics(report.stageId, reportId);
        }
      } else if (report.scope === 'Weekly') {
        // For weekly reports, calculate stage metrics (same as Stage scope)
        if (!report.stageId) {
          if (report.stageName) {
            const stages = await this.taskWorkflowService.findAllStages(report.projectId);
            const stage = stages.find(s => s.name === report.stageName);
            if (!stage) {
              throw new BadRequestException(`Stage '${report.stageName}' not found for this project`);
            }
            metrics = await this.metricsService.calculateStageMetrics(stage.id, reportId);
          } else {
            throw new BadRequestException(`Report scope is 'Weekly' but no stageId or stageName provided`);
          }
        } else {
          metrics = await this.metricsService.calculateStageMetrics(report.stageId, reportId);
        }
      } else {
        throw new BadRequestException(`Cannot generate metrics for report scope '${report.scope}'. Only 'Project', 'Stage', and 'Weekly' scopes are supported.`);
      }
    }

    const prompt = this.buildPrompt(report, metrics);

    let aiContent: string;

    try {
      // Call OpenAI API
      const languageInstruction = this.getLanguageInstruction(language);
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a project management analyst. Analyze the given metrics and provide insights, identify risks, and suggest improvements. ${languageInstruction}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      aiContent = completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to template-based commentary
      aiContent = this.generateTemplateCommentary(report, metrics, language);
    }

    // Get the latest version number
    const existingCommentaries = await this.findByReport(reportId);
    const latestVersion = existingCommentaries.length > 0
      ? Math.max(...existingCommentaries.map(c => c.version))
      : 0;

    return this.create({
      reportId,
      type: 'AI Generated',
      content: aiContent,
      version: latestVersion + 1,
    });
  }

  private getLanguageInstruction(language: string): string {
    switch (language) {
      case 'Vietnamese':
        return 'Please respond in Vietnamese (Tiếng Việt).';
      case 'Japanese':
        return 'Please respond in Japanese (日本語).';
      case 'English':
      default:
        return 'Please respond in English.';
    }
  }

  private buildPrompt(report: any, metrics: any): string {
    const snapshot = report.snapshotData || {};
    const projectSnapshot = snapshot.project || {};
    const stageDetail = snapshot.stageDetail || {};
    const productivitySnapshot = snapshot.productivity || {};
    const memberCostSnapshot = snapshot.memberCost || {};

    const safeNumber = (value: number | null | undefined, fallback = 0) =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback;

    // For Stage/Weekly scoped reports, use stage-level metrics instead of project-level
    // This ensures the AI analyzes the same data that the user sees on the report detail page
    const isStageScope = report.scope === 'Stage' || report.scope === 'Weekly';

    let scheduleSource: any;
    let forecastingSource: any;

    if (isStageScope && stageDetail?.schedule) {
      // Use stage-specific schedule metrics from snapshot
      scheduleSource = stageDetail.schedule;
      forecastingSource = stageDetail.forecasting || {};
    } else {
      // Use project-level schedule metrics from snapshot
      scheduleSource = snapshot.schedule || {};
      forecastingSource = snapshot.forecasting || {};
    }

    const scheduleMetrics = {
      spi: safeNumber(scheduleSource.spi, metrics?.schedulePerformanceIndex),
      cpi: safeNumber(scheduleSource.cpi, metrics?.costPerformanceIndex),
      delayRate: safeNumber(scheduleSource.delayRate, metrics?.delayRate),
      delayInManMonths: safeNumber(scheduleSource.delayInManMonths, metrics?.delayInManMonths),
      estimatedVsActual: safeNumber(scheduleSource.estimatedVsActual, metrics?.estimatedVsActual),
      plannedValue: safeNumber(scheduleSource.plannedValue, metrics?.plannedValue),
      earnedValue: safeNumber(scheduleSource.earnedValue, metrics?.earnedValue),
      actualCost: safeNumber(scheduleSource.actualCost, metrics?.actualCost),
    };

    const forecastingMetrics = {
      bac: safeNumber(forecastingSource.bac, metrics?.budgetAtCompletion),
      eac: safeNumber(forecastingSource.eac, metrics?.estimateAtCompletion),
      vac: safeNumber(forecastingSource.vac, metrics?.varianceAtCompletion),
      tcpi: safeNumber(forecastingSource.tcpi, metrics?.toCompletePerformanceIndex),
    };

    const productivitySummary = productivitySnapshot?.summary || null;
    const topMembers = Array.isArray(productivitySnapshot?.byMember)
      ? productivitySnapshot.byMember.slice(0, 3)
      : [];
    const topRoles = Array.isArray(productivitySnapshot?.byRole)
      ? productivitySnapshot.byRole.slice(0, 3)
      : [];

    const memberCostSummary = Array.isArray(memberCostSnapshot?.members)
      ? memberCostSnapshot.members
      : Array.isArray(memberCostSnapshot?.byMember)
        ? memberCostSnapshot.byMember
        : [];
    const memberCostTotals = memberCostSnapshot?.summary || null;
    const topCostMembers = memberCostSummary
      .slice()
      .sort((a: any, b: any) => (b.totalActualCost || 0) - (a.totalActualCost || 0))
      .slice(0, 3);

    // Build stage context for Stage/Weekly reports
    let stageContext = '';
    if (isStageScope) {
      stageContext = `
Stage Context:
- Stage ID: ${report.stageId ?? stageDetail.id ?? 'N/A'}
- Stage Name: ${report.stageName ?? stageDetail.name ?? 'N/A'}
- Stage Progress: ${safeNumber(stageDetail.progress).toFixed(1)}%
- Stage Estimated Effort: ${safeNumber(stageDetail.estimatedEffort).toFixed(2)} man-months
- Stage Actual Effort: ${safeNumber(stageDetail.actualEffort).toFixed(2)} man-months
- Stage Status: ${stageDetail.status || 'N/A'}`;
    }

    // Build scope-aware analysis instruction
    const scopeInstruction = isStageScope
      ? `Note: This is a ${report.scope}-level report. The metrics below are for the stage "${report.stageName ?? stageDetail.name ?? 'N/A'}", not the entire project. Focus your analysis on stage-level performance.`
      : `Note: This is a Project-level report. The metrics below cover the entire project.`;

    return `
Analyze this project report and provide insights:

${scopeInstruction}

Report Details:
- Scope: ${report.scope}
- Title: ${report.title}
- Date: ${report.reportDate}
- Week: ${report.weekNumber ? `${report.weekNumber}/${report.year}` : 'N/A'}${stageContext}

Project Overview:
- Project Name: ${projectSnapshot.name || 'N/A'}
- Project Status: ${projectSnapshot.status || 'N/A'}
- Project Progress: ${safeNumber(projectSnapshot.progress).toFixed(1)}%
- Estimated Effort: ${safeNumber(projectSnapshot.estimatedEffort).toFixed(2)} man-months
- Actual Effort: ${safeNumber(projectSnapshot.actualEffort).toFixed(2)} man-months
- Start/End: ${projectSnapshot.startDate || 'N/A'} → ${projectSnapshot.endDate || 'N/A'}

Schedule & Cost Metrics${isStageScope ? ' (Stage-level)' : ''}:
- SPI (Schedule Performance Index): ${scheduleMetrics.spi.toFixed(2)}
- CPI (Cost Performance Index): ${scheduleMetrics.cpi.toFixed(2)}
- Delay Rate: ${scheduleMetrics.delayRate.toFixed(2)}%
- Delay in Man-Months: ${scheduleMetrics.delayInManMonths.toFixed(2)}
- Estimated vs Actual Ratio: ${scheduleMetrics.estimatedVsActual.toFixed(2)}
- Planned Value (PV): ${scheduleMetrics.plannedValue.toFixed(2)}
- Earned Value (EV): ${scheduleMetrics.earnedValue.toFixed(2)}
- Actual Cost (AC): ${scheduleMetrics.actualCost.toFixed(2)}

Forecasting Metrics${isStageScope ? ' (Stage-level)' : ''}:
- Budget at Completion (BAC): ${forecastingMetrics.bac.toFixed(2)}
- Estimate at Completion (EAC): ${forecastingMetrics.eac.toFixed(2)}
- Variance at Completion (VAC): ${forecastingMetrics.vac.toFixed(2)}
- To-Complete Performance Index (TCPI): ${forecastingMetrics.tcpi.toFixed(2)}

Productivity Snapshot:
- Summary: ${productivitySummary ? `Efficiency ${safeNumber(productivitySummary.efficiency).toFixed(2)}, Completion ${safeNumber(productivitySummary.completionRate).toFixed(0)}%, Variance ${safeNumber(productivitySummary.variance).toFixed(2)}` : 'N/A'}
- Top Members by Efficiency: ${topMembers.length > 0 ? topMembers.map((m: any) => `${m.name} (${safeNumber(m.efficiency).toFixed(2)})`).join(', ') : 'N/A'}
- Top Roles by Efficiency: ${topRoles.length > 0 ? topRoles.map((r: any) => `${r.role} (${safeNumber(r.efficiency).toFixed(2)})`).join(', ') : 'N/A'}

Member Cost Snapshot:
- Summary: ${memberCostTotals ? `Actual ${safeNumber(memberCostTotals.totalActualCost).toFixed(2)}, Estimated ${safeNumber(memberCostTotals.totalEstimatedCost).toFixed(2)}, Variance ${safeNumber(memberCostTotals.totalCostVariance).toFixed(2)}` : 'N/A'}
- Top Cost Drivers: ${topCostMembers.length > 0 ? topCostMembers.map((m: any) => `${m.name} (${safeNumber(m.totalActualCost).toFixed(2)})`).join(', ') : 'N/A'}

Please provide:
1. Overall ${isStageScope ? 'stage' : 'project'} health assessment
2. Key risks and concerns
3. Specific improvement recommendations
4. Areas performing well

Keep the response concise and actionable.
    `.trim();
  }

  private generateTemplateCommentary(report: any, metrics: any, language: string): string {
    const sections = [];

    // Safely read metrics values with fallback to 0
    const spi = typeof metrics?.schedulePerformanceIndex === 'number' && Number.isFinite(metrics.schedulePerformanceIndex)
      ? metrics.schedulePerformanceIndex : 0;
    const cpi = typeof metrics?.costPerformanceIndex === 'number' && Number.isFinite(metrics.costPerformanceIndex)
      ? metrics.costPerformanceIndex : 0;
    const delayInManMonths = typeof metrics?.delayInManMonths === 'number' && Number.isFinite(metrics.delayInManMonths)
      ? metrics.delayInManMonths : 0;
    const estimatedVsActual = typeof metrics?.estimatedVsActual === 'number' && Number.isFinite(metrics.estimatedVsActual)
      ? metrics.estimatedVsActual : 0;

    const translations = this.getTranslations(language);

    let overallStatus: string;
    if (spi >= 0.95 && cpi >= 0.95) {
      overallStatus = translations.overallGood;
    } else if (spi >= 0.85 && cpi >= 0.85) {
      overallStatus = translations.overallAcceptable;
    } else {
      overallStatus = translations.overallCritical;
    }

    sections.push(`**${translations.overallAssessment}**\n${overallStatus}`);

    // Schedule Analysis
    if (spi < 0.95) {
      sections.push(`**${translations.scheduleConcern}**\n${translations.scheduleText(spi.toFixed(2), delayInManMonths.toFixed(2))}`);
    }

    // Cost Analysis
    if (cpi < 0.95) {
      sections.push(`**${translations.costConcern}**\n${translations.costText(cpi.toFixed(2), (estimatedVsActual * 100).toFixed(0))}`);
    }

    // Recommendations
    const recommendations = [];
    if (spi < 0.95) {
      recommendations.push(translations.scheduleRec1);
      recommendations.push(translations.scheduleRec2);
    }
    if (cpi < 0.95) {
      recommendations.push(translations.costRec1);
      recommendations.push(translations.costRec2);
    }
    if (recommendations.length > 0) {
      sections.push(`**${translations.recommendations}**\n${recommendations.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  private getTranslations(language: string) {
    switch (language) {
      case 'Vietnamese':
        return {
          overallAssessment: 'Đánh giá tổng quan',
          overallGood: 'Dự án đang hoạt động tốt trên tất cả các chỉ số.',
          overallAcceptable: 'Dự án đang hoạt động ở mức chấp nhận được với một số lĩnh vực cần chú ý.',
          overallCritical: 'Dự án đang đối mặt với những thách thức đáng kể cần được xử lý ngay lập tức.',
          scheduleConcern: 'Vấn đề về tiến độ',
          scheduleText: (spi: string, delay: string) =>
            `Chỉ số hiệu suất tiến độ (${spi}) cho thấy dự án đang bị chậm tiến độ. Độ trễ hiện tại là ${delay} người-tháng.`,
          costConcern: 'Vấn đề về chi phí',
          costText: (cpi: string, percent: string) =>
            `Chỉ số hiệu suất chi phí (${cpi}) cho thấy dự án đang vượt ngân sách. Nỗ lực thực tế là ${percent}% so với dự kiến.`,
          recommendations: 'Khuyến nghị',
          scheduleRec1: '- Xem xét và tối ưu hóa lịch trình dự án',
          scheduleRec2: '- Xem xét việc bổ sung nguồn lực cho các hoạt động quan trọng',
          costRec1: '- Phân tích nguyên nhân vượt chi phí',
          costRec2: '- Triển khai các biện pháp kiểm soát chi phí',
        };
      case 'Japanese':
        return {
          overallAssessment: '総合評価',
          overallGood: 'プロジェクトは全ての指標で良好に進行しています。',
          overallAcceptable: 'プロジェクトは許容範囲内で進行していますが、いくつかの領域で注意が必要です。',
          overallCritical: 'プロジェクトは重大な課題に直面しており、早急な対応が必要です。',
          scheduleConcern: 'スケジュールに関する懸念',
          scheduleText: (spi: string, delay: string) =>
            `スケジュール効率指数（${spi}）は、プロジェクトが遅延していることを示しています。現在の遅延は${delay}人月です。`,
          costConcern: 'コストに関する懸念',
          costText: (cpi: string, percent: string) =>
            `コスト効率指数（${cpi}）は、プロジェクトが予算超過していることを示しています。実際の工数は見積もりの${percent}%です。`,
          recommendations: '推奨事項',
          scheduleRec1: '- プロジェクトスケジュールの見直しと最適化',
          scheduleRec2: '- クリティカルパスの活動にリソースの追加を検討',
          costRec1: '- コスト超過の根本原因を分析',
          costRec2: '- コスト管理措置の実施',
        };
      case 'English':
      default:
        return {
          overallAssessment: 'Overall Assessment',
          overallGood: 'The project is performing well across all metrics.',
          overallAcceptable: 'The project is performing acceptably with some areas requiring attention.',
          overallCritical: 'The project is facing significant challenges that require immediate attention.',
          scheduleConcern: 'Schedule Concern',
          scheduleText: (spi: string, delay: string) =>
            `The Schedule Performance Index (${spi}) indicates the project is behind schedule. Current delay is ${delay} man-months.`,
          costConcern: 'Cost Concern',
          costText: (cpi: string, percent: string) =>
            `The Cost Performance Index (${cpi}) shows the project is over budget. Actual effort is ${percent}% of estimated.`,
          recommendations: 'Recommendations',
          scheduleRec1: '- Review and optimize project schedule',
          scheduleRec2: '- Consider adding resources to critical path activities',
          costRec1: '- Analyze cost overruns and identify root causes',
          costRec2: '- Implement cost control measures',
        };
    }
  }
}
