import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Commentary } from './commentary.model';
import { CreateCommentaryDto, UpdateCommentaryDto, GenerateCommentaryDto } from './commentary.dto';
import { ReportService } from '../report/report.service';
import OpenAI from 'openai';

@Injectable()
export class CommentaryService {
  private openai: OpenAI;

  constructor(
    @Inject('COMMENTARY_REPOSITORY')
    private commentaryRepository: typeof Commentary,
    private reportService: ReportService,
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
    const { reportId } = generateCommentaryDto;
    const report = await this.reportService.findOne(reportId);

    if (!report.metrics || report.metrics.length === 0) {
      throw new NotFoundException(`No metrics found for report ${reportId}`);
    }

    const metrics = report.metrics[0];

    // Build prompt for AI
    const prompt = this.buildPrompt(report, metrics);

    let aiContent: string;

    try {
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a project management analyst. Analyze the given metrics and provide insights, identify risks, and suggest improvements.',
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
      aiContent = this.generateTemplateCommentary(report, metrics);
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

  private buildPrompt(report: any, metrics: any): string {
    return `
Analyze this project report and provide insights:

Report Details:
- Scope: ${report.scope}
- Title: ${report.title}
- Date: ${report.reportDate}

Schedule & Cost Metrics:
- Schedule Performance Index (SPI): ${metrics.schedulePerformanceIndex.toFixed(2)}
- Cost Performance Index (CPI): ${metrics.costPerformanceIndex.toFixed(2)}
- Delay Rate: ${metrics.delayRate.toFixed(2)}%
- Delay in Man-Months: ${metrics.delayInManMonths.toFixed(2)}
- Estimated vs Actual Ratio: ${metrics.estimatedVsActual.toFixed(2)}

Testing & Quality Metrics:
- Pass Rate: ${metrics.passRate.toFixed(2)}%
- Defect Rate: ${metrics.defectRate.toFixed(3)}
- Time per Test Case: ${metrics.timePerTestCase.toFixed(2)} hours
- Test Cases per Hour: ${metrics.testCasesPerHour.toFixed(2)}

Please provide:
1. Overall project health assessment
2. Key risks and concerns
3. Specific improvement recommendations
4. Areas performing well

Keep the response concise and actionable.
    `.trim();
  }

  private generateTemplateCommentary(report: any, metrics: any): string {
    const sections = [];

    // Overall Assessment
    const spi = metrics.schedulePerformanceIndex;
    const cpi = metrics.costPerformanceIndex;
    const passRate = metrics.passRate;

    let overallStatus: string;
    if (spi >= 0.95 && cpi >= 0.95 && passRate >= 95) {
      overallStatus = 'The project is performing well across all metrics.';
    } else if (spi >= 0.85 && cpi >= 0.85 && passRate >= 80) {
      overallStatus = 'The project is performing acceptably with some areas requiring attention.';
    } else {
      overallStatus = 'The project is facing significant challenges that require immediate attention.';
    }

    sections.push(`**Overall Assessment:**\n${overallStatus}`);

    // Schedule Analysis
    if (spi < 0.95) {
      sections.push(`**Schedule Concern:**\nThe Schedule Performance Index (${spi.toFixed(2)}) indicates the project is behind schedule. Current delay is ${metrics.delayInManMonths.toFixed(2)} man-months.`);
    }

    // Cost Analysis
    if (cpi < 0.95) {
      sections.push(`**Cost Concern:**\nThe Cost Performance Index (${cpi.toFixed(2)}) shows the project is over budget. Actual effort is ${(metrics.estimatedVsActual * 100).toFixed(0)}% of estimated.`);
    }

    // Quality Analysis
    if (passRate < 95) {
      sections.push(`**Quality Concern:**\nThe test pass rate (${passRate.toFixed(1)}%) is below target. Defect rate is ${metrics.defectRate.toFixed(3)} per test case.`);
    }

    // Recommendations
    const recommendations = [];
    if (spi < 0.95) {
      recommendations.push('- Review and optimize project schedule');
      recommendations.push('- Consider adding resources to critical path activities');
    }
    if (cpi < 0.95) {
      recommendations.push('- Analyze cost overruns and identify root causes');
      recommendations.push('- Implement cost control measures');
    }
    if (passRate < 95) {
      recommendations.push('- Increase testing coverage and quality');
      recommendations.push('- Conduct root cause analysis for defects');
    }

    if (recommendations.length > 0) {
      sections.push(`**Recommendations:**\n${recommendations.join('\n')}`);
    }

    return sections.join('\n\n');
  }
}
