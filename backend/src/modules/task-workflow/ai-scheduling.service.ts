import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { StepScreenFunction } from './step-screen-function.model';
import { StepScreenFunctionMember } from './step-screen-function-member.model';
import { WorkflowStage } from './workflow-stage.model';
import { WorkflowStep } from './workflow-step.model';
import { Member } from '../member/member.model';
import { MemberService } from '../member/member.service';
import { ProjectService } from '../project/project.service';
import { TaskWorkflowService } from './task-workflow.service';
import OpenAI from 'openai';
import {
  AIEstimateEffortDto,
  AIGenerateScheduleDto,
  ApplyAIEstimationDto,
  ApplyAIScheduleDto,
} from './ai-scheduling.dto';

@Injectable()
export class AISchedulingService {
  private openai: OpenAI;

  constructor(
    @Inject('SCREEN_FUNCTION_REPOSITORY')
    private screenFunctionRepository: typeof ScreenFunction,
    @Inject('STEP_SCREEN_FUNCTION_REPOSITORY')
    private stepScreenFunctionRepository: typeof StepScreenFunction,
    @Inject('STEP_SCREEN_FUNCTION_MEMBER_REPOSITORY')
    private stepScreenFunctionMemberRepository: typeof StepScreenFunctionMember,
    @Inject(forwardRef(() => MemberService))
    private memberService: MemberService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
    @Inject(forwardRef(() => TaskWorkflowService))
    private taskWorkflowService: TaskWorkflowService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  // ===== Effort Estimation =====

  async estimateEffort(dto: AIEstimateEffortDto) {
    const { projectId, screenFunctionIds, stageId, language = 'English' } = dto;

    // Fetch screen functions
    const where: any = { projectId };
    if (screenFunctionIds && screenFunctionIds.length > 0) {
      where.id = screenFunctionIds;
    }
    const screenFunctions = await this.screenFunctionRepository.findAll({ where });

    if (screenFunctions.length === 0) {
      throw new BadRequestException('No screen functions found for this project');
    }

    // Fetch team members
    const members = await this.memberService.findActiveByProject(projectId);

    // Fetch project settings
    const project = await this.projectService.findOne(projectId);
    const settings = await this.projectService.getSettings(projectId);

    // Fetch historical data from completed tasks
    const historicalData = await this.getHistoricalData(projectId);

    // Build prompt
    const prompt = this.buildEffortPrompt(screenFunctions, members, historicalData, settings, project);

    try {
      const languageInstruction = this.getLanguageInstruction(language);
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a software project estimation expert. Analyze the given screen functions, team composition, and historical data to provide accurate effort estimates. ${languageInstruction} You MUST respond with a valid JSON object.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        success: true,
        source: 'AI',
        data: result,
      };
    } catch (error) {
      console.error('AI effort estimation error:', error);
      // Fallback: use simple rule-based estimation
      return {
        success: true,
        source: 'Template',
        data: this.generateTemplateEstimation(screenFunctions, settings),
      };
    }
  }

  // ===== Schedule Generation =====

  async generateSchedule(dto: AIGenerateScheduleDto) {
    const { projectId, stageId, language = 'English' } = dto;

    // Fetch stage data
    const stage = await this.taskWorkflowService.findStageById(stageId);
    if (!stage || stage.projectId !== projectId) {
      throw new BadRequestException('Stage not found or does not belong to this project');
    }

    // Fetch steps for this stage
    const steps = await this.taskWorkflowService.findAllSteps(stageId);

    // Fetch all StepScreenFunctions for this stage
    const stepIds = steps.map(s => s.id);
    const tasks = await this.stepScreenFunctionRepository.findAll({
      where: { stepId: stepIds },
      include: [
        { model: ScreenFunction, as: 'screenFunction' },
        { model: WorkflowStep, as: 'step' },
      ],
    });

    if (tasks.length === 0) {
      throw new BadRequestException('No tasks found for this stage. Please create step-screen function links first.');
    }

    // Fetch available members
    const members = await this.memberService.findActiveByProject(projectId);

    // Fetch workload for each member
    const workloads = await this.memberService.getProjectWorkload(projectId);

    // Fetch project settings
    const project = await this.projectService.findOne(projectId);
    const settings = await this.projectService.getSettings(projectId);

    // Build prompt
    const prompt = this.buildSchedulePrompt(stage, steps, tasks, members, workloads, settings, project);

    try {
      const languageInstruction = this.getLanguageInstruction(language);
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a project scheduling expert. Create an optimal schedule by assigning team members to tasks based on their skills, availability, and current workload. ${languageInstruction} You MUST respond with a valid JSON object.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        success: true,
        source: 'AI',
        data: result,
      };
    } catch (error) {
      console.error('AI schedule generation error:', error);
      // Fallback: simple round-robin assignment
      return {
        success: true,
        source: 'Template',
        data: this.generateTemplateSchedule(tasks, members, stage, settings),
      };
    }
  }

  // ===== Apply Results =====

  async applyEstimation(dto: ApplyAIEstimationDto) {
    const { projectId, estimates } = dto;

    const results: Array<{ screenFunctionId: number; updated: boolean }> = [];

    for (const estimate of estimates) {
      try {
        const sf = await this.screenFunctionRepository.findByPk(estimate.screenFunctionId);
        if (sf && sf.projectId === projectId) {
          await sf.update({ estimatedEffort: estimate.estimatedEffortHours });
          results.push({ screenFunctionId: estimate.screenFunctionId, updated: true });
        } else {
          results.push({ screenFunctionId: estimate.screenFunctionId, updated: false });
        }
      } catch (error) {
        results.push({ screenFunctionId: estimate.screenFunctionId, updated: false });
      }
    }

    return { success: true, results };
  }

  async applySchedule(dto: ApplyAIScheduleDto) {
    const { assignments } = dto;

    const results: Array<{ stepScreenFunctionId: number; memberId: number; updated: boolean }> = [];

    for (const assignment of assignments) {
      try {
        // Check if assignment already exists
        const existing = await this.stepScreenFunctionMemberRepository.findOne({
          where: {
            stepScreenFunctionId: assignment.stepScreenFunctionId,
            memberId: assignment.memberId,
          },
        });

        if (existing) {
          // Update existing assignment
          await existing.update({
            estimatedEffort: assignment.estimatedEffort,
            estimatedStartDate: assignment.estimatedStartDate,
            estimatedEndDate: assignment.estimatedEndDate,
          });
        } else {
          // Create new assignment
          await this.stepScreenFunctionMemberRepository.create({
            stepScreenFunctionId: assignment.stepScreenFunctionId,
            memberId: assignment.memberId,
            estimatedEffort: assignment.estimatedEffort,
            estimatedStartDate: assignment.estimatedStartDate,
            estimatedEndDate: assignment.estimatedEndDate,
          } as any);
        }

        // Also update the parent StepScreenFunction dates
        const ssf = await this.stepScreenFunctionRepository.findByPk(assignment.stepScreenFunctionId);
        if (ssf) {
          await ssf.update({
            estimatedStartDate: assignment.estimatedStartDate,
            estimatedEndDate: assignment.estimatedEndDate,
            estimatedEffort: assignment.estimatedEffort,
          });
        }

        results.push({
          stepScreenFunctionId: assignment.stepScreenFunctionId,
          memberId: assignment.memberId,
          updated: true,
        });
      } catch (error) {
        console.error('Error applying assignment:', error);
        results.push({
          stepScreenFunctionId: assignment.stepScreenFunctionId,
          memberId: assignment.memberId,
          updated: false,
        });
      }
    }

    return { success: true, results };
  }

  // ===== Prompt Builders =====

  private buildEffortPrompt(
    screenFunctions: ScreenFunction[],
    members: Member[],
    historicalData: any,
    settings: any,
    project: any,
  ): string {
    const sfList = screenFunctions.map(sf => ({
      id: sf.id,
      name: sf.name,
      type: sf.type,
      priority: sf.priority,
      complexity: sf.complexity,
      description: sf.description || '',
      currentEstimate: sf.estimatedEffort || 0,
    }));

    const teamSummary = members.map(m => ({
      role: m.role,
      experience: m.yearsOfExperience || 0,
      skills: m.skills || [],
      availability: m.availability,
    }));

    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const workingDaysPerMonth = settings?.workingDaysPerMonth || 20;

    return `
Estimate the effort (in man-hours) for each screen function below.

Project: ${project.name}
Working hours/day: ${workingHoursPerDay}
Working days/month: ${workingDaysPerMonth}

Team Composition:
${JSON.stringify(teamSummary, null, 2)}

Historical Performance Data (completed tasks):
${JSON.stringify(historicalData, null, 2)}

Screen Functions to Estimate:
${JSON.stringify(sfList, null, 2)}

Respond with a JSON object in this exact format:
{
  "estimates": [
    {
      "screenFunctionId": <number>,
      "screenFunctionName": "<string>",
      "estimatedEffortHours": <number>,
      "confidence": "high" | "medium" | "low",
      "reasoning": "<brief explanation>",
      "breakdown": {
        "design": <hours>,
        "development": <hours>,
        "testing": <hours>
      }
    }
  ],
  "totalEstimatedHours": <number>,
  "totalEstimatedManMonths": <number>,
  "assumptions": ["<string>"]
}

Consider:
- Complexity level affects effort: Simple (~0.5x), Medium (~1x), Complex (~2x base)
- Priority affects scheduling order but not effort
- Team experience level impacts efficiency
- Historical actual/estimated ratios for calibration
- Include design, development, and testing phases
    `.trim();
  }

  private buildSchedulePrompt(
    stage: WorkflowStage,
    steps: WorkflowStep[],
    tasks: StepScreenFunction[],
    members: Member[],
    workloads: any,
    settings: any,
    project: any,
  ): string {
    const taskList = tasks.map(t => ({
      stepScreenFunctionId: t.id,
      stepName: (t as any).step?.name || 'Unknown',
      screenFunctionName: (t as any).screenFunction?.name || 'Unknown',
      priority: (t as any).screenFunction?.priority || 'Medium',
      complexity: (t as any).screenFunction?.complexity || 'Medium',
      estimatedEffort: t.estimatedEffort || 0,
      status: t.status,
    }));

    const memberList = members.map(m => {
      const workload = Array.isArray(workloads) ? workloads.find((w: any) => w.memberId === m.id) : null;
      return {
        memberId: m.id,
        name: m.name,
        role: m.role,
        experience: m.yearsOfExperience || 0,
        skills: m.skills || [],
        availability: m.availability,
        hourlyRate: m.hourlyRate || 0,
        currentWorkload: workload ? {
          assignedTasks: workload.totalAssigned || 0,
          pendingTasks: workload.pendingTasks || 0,
          totalEstimatedHours: workload.estimatedEffort || 0,
        } : { assignedTasks: 0, pendingTasks: 0, totalEstimatedHours: 0 },
      };
    });

    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const stageStartDate = stage.startDate || project.startDate || new Date().toISOString().split('T')[0];

    return `
Generate an optimal schedule for the following stage by assigning team members to tasks.

Project: ${project.name}
Stage: ${stage.name}
Stage Start Date: ${stageStartDate}
Working Hours/Day: ${workingHoursPerDay}
Non-Working Days: ${JSON.stringify(settings?.nonWorkingDays || [0, 6])} (0=Sunday, 6=Saturday)

Available Team Members:
${JSON.stringify(memberList, null, 2)}

Tasks to Schedule:
${JSON.stringify(taskList, null, 2)}

Respond with a JSON object in this exact format:
{
  "assignments": [
    {
      "stepScreenFunctionId": <number>,
      "memberId": <number>,
      "memberName": "<string>",
      "taskName": "<string>",
      "estimatedEffort": <hours>,
      "estimatedStartDate": "YYYY-MM-DD",
      "estimatedEndDate": "YYYY-MM-DD",
      "reasoning": "<brief explanation of why this member was chosen>"
    }
  ],
  "timeline": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "totalWorkingDays": <number>
  },
  "warnings": ["<any concerns or risks>"],
  "summary": "<brief overview of the schedule>"
}

Rules:
- Assign members based on role matching (DEV for coding, QA for testing, BA for requirements)
- Balance workload across team members
- Consider member experience level (senior members can handle complex tasks)
- Avoid overloading members who already have high workload
- Schedule tasks sequentially within the same member's calendar
- Skip weekends and non-working days for date calculations
- Part-time members work fewer hours per day
    `.trim();
  }

  // ===== Helper Methods =====

  private getLanguageInstruction(language: string): string {
    switch (language) {
      case 'Vietnamese':
        return 'Please provide reasoning and summaries in Vietnamese (Tiếng Việt), but keep JSON keys in English.';
      case 'Japanese':
        return 'Please provide reasoning and summaries in Japanese (日本語), but keep JSON keys in English.';
      case 'English':
      default:
        return 'Please respond in English.';
    }
  }

  private async getHistoricalData(projectId: number) {
    try {
      // Get completed StepScreenFunctions with both estimated and actual effort
      const completed = await this.stepScreenFunctionRepository.findAll({
        where: {
          status: 'Completed',
          estimatedEffort: { $gt: 0 } as any,
          actualEffort: { $gt: 0 } as any,
        },
        include: [
          {
            model: ScreenFunction,
            as: 'screenFunction',
            where: { projectId },
          },
        ],
      });

      if (completed.length === 0) {
        return { message: 'No historical data available', samples: 0 };
      }

      // Group by complexity
      const byComplexity: Record<string, { totalEstimated: number; totalActual: number; count: number }> = {};

      for (const task of completed) {
        const sf = (task as any).screenFunction;
        const complexity = sf?.complexity || 'Medium';
        if (!byComplexity[complexity]) {
          byComplexity[complexity] = { totalEstimated: 0, totalActual: 0, count: 0 };
        }
        byComplexity[complexity].totalEstimated += task.estimatedEffort || 0;
        byComplexity[complexity].totalActual += task.actualEffort || 0;
        byComplexity[complexity].count++;
      }

      const result: Record<string, any> = {};
      for (const [complexity, data] of Object.entries(byComplexity)) {
        result[complexity] = {
          avgEstimatedToActualRatio: data.totalEstimated > 0
            ? (data.totalActual / data.totalEstimated).toFixed(2)
            : 'N/A',
          samples: data.count,
          avgEstimatedHours: (data.totalEstimated / data.count).toFixed(1),
          avgActualHours: (data.totalActual / data.count).toFixed(1),
        };
      }

      return { samples: completed.length, byComplexity: result };
    } catch (error) {
      return { message: 'Error fetching historical data', samples: 0 };
    }
  }

  // ===== Fallback Template Methods =====

  private generateTemplateEstimation(screenFunctions: ScreenFunction[], settings: any) {
    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const workingDaysPerMonth = settings?.workingDaysPerMonth || 20;

    // Simple complexity-based estimation
    const complexityMultiplier: Record<string, number> = {
      'Simple': 8,    // 1 day
      'Medium': 24,   // 3 days
      'Complex': 56,  // 7 days
    };

    const estimates = screenFunctions.map(sf => {
      const baseHours = complexityMultiplier[sf.complexity] || 24;
      return {
        screenFunctionId: sf.id,
        screenFunctionName: sf.name,
        estimatedEffortHours: baseHours,
        confidence: 'low' as const,
        reasoning: `Template-based estimate: ${sf.complexity} complexity = ${baseHours} hours`,
        breakdown: {
          design: Math.round(baseHours * 0.15),
          development: Math.round(baseHours * 0.55),
          testing: Math.round(baseHours * 0.30),
        },
      };
    });

    const totalHours = estimates.reduce((sum, e) => sum + e.estimatedEffortHours, 0);

    return {
      estimates,
      totalEstimatedHours: totalHours,
      totalEstimatedManMonths: +(totalHours / (workingHoursPerDay * workingDaysPerMonth)).toFixed(2),
      assumptions: [
        'Template-based estimation (AI unavailable)',
        `Simple=8h, Medium=24h, Complex=56h`,
        `Working: ${workingHoursPerDay}h/day, ${workingDaysPerMonth} days/month`,
      ],
    };
  }

  private generateTemplateSchedule(
    tasks: StepScreenFunction[],
    members: Member[],
    stage: WorkflowStage,
    settings: any,
  ) {
    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const startDate = stage.startDate || new Date().toISOString().split('T')[0];

    // Filter to development-capable members
    const devMembers = members.filter(m =>
      ['DEV', 'QA', 'BA', 'TL'].includes(m.role) && m.status === 'Active'
    );

    if (devMembers.length === 0) {
      return { assignments: [], warnings: ['No active development team members found'], summary: 'Cannot generate schedule without team members' };
    }

    // Round-robin assignment
    const assignments = tasks.map((task, index) => {
      const member = devMembers[index % devMembers.length];
      const effort = task.estimatedEffort || 8;
      const daysNeeded = Math.ceil(effort / workingHoursPerDay);

      // Simple date calculation (no weekend/holiday awareness)
      const start = new Date(startDate);
      start.setDate(start.getDate() + Math.floor(index / devMembers.length) * daysNeeded);
      const end = new Date(start);
      end.setDate(end.getDate() + daysNeeded - 1);

      return {
        stepScreenFunctionId: task.id,
        memberId: member.id,
        memberName: member.name,
        taskName: `Task ${task.id}`,
        estimatedEffort: effort,
        estimatedStartDate: start.toISOString().split('T')[0],
        estimatedEndDate: end.toISOString().split('T')[0],
        reasoning: 'Round-robin assignment (AI unavailable)',
      };
    });

    return {
      assignments,
      timeline: {
        startDate,
        endDate: assignments.length > 0
          ? assignments[assignments.length - 1].estimatedEndDate
          : startDate,
        totalWorkingDays: Math.ceil(tasks.length / devMembers.length) * 3,
      },
      warnings: ['Template-based schedule - review and adjust manually'],
      summary: `Round-robin assignment of ${tasks.length} tasks to ${devMembers.length} members`,
    };
  }
}
