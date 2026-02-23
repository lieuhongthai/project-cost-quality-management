import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { ScreenFunctionDefaultMember } from '../screen-function/screen-function-default-member.model';
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
  AIEstimateStageEffortDto,
  AIGenerateScheduleDto,
  ApplyAIEstimationDto,
  ApplyAIStageEstimationDto,
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
    @Inject('WORKFLOW_STAGE_REPOSITORY')
    private stageRepository: typeof WorkflowStage,
    @Inject('SCREEN_FUNCTION_DEFAULT_MEMBER_REPOSITORY')
    private defaultMemberRepository: typeof ScreenFunctionDefaultMember,
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
        model: 'gpt-4o',
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

    // Fetch default member assignments for screen functions in this stage
    const sfIds = tasks.map(t => t.screenFunctionId).filter(Boolean);
    const defaultMembers = sfIds.length > 0
      ? await this.defaultMemberRepository.findAll({
          where: { screenFunctionId: sfIds },
          include: [{ model: Member, as: 'member' }],
        })
      : [];

    // Build a map: screenFunctionId → [{memberId, memberName, memberRole}]
    const defaultMemberMap = new Map<number, Array<{ memberId: number; memberName: string; memberRole: string }>>();
    for (const dm of defaultMembers) {
      const sfId = dm.screenFunctionId;
      if (!defaultMemberMap.has(sfId)) {
        defaultMemberMap.set(sfId, []);
      }
      const member = (dm as any).member;
      if (member) {
        defaultMemberMap.get(sfId)!.push({
          memberId: member.id,
          memberName: member.name,
          memberRole: member.role || '',
        });
      }
    }

    // Fetch project settings
    const project = await this.projectService.findOne(projectId);
    const settings = await this.projectService.getSettings(projectId);

    // Build prompt
    const prompt = this.buildSchedulePrompt(stage, steps, tasks, members, workloads, defaultMemberMap, settings, project);

    try {
      const languageInstruction = this.getLanguageInstruction(language);
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
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
        data: this.generateTemplateSchedule(tasks, members, defaultMemberMap, stage, settings),
      };
    }
  }

  // ===== Stage Effort Estimation =====

  async estimateStageEffort(dto: AIEstimateStageEffortDto) {
    const { projectId, stageIds, language = 'English' } = dto;

    // Fetch stages
    const allStages = await this.taskWorkflowService.findAllStages(projectId);
    const stages = stageIds && stageIds.length > 0
      ? allStages.filter(s => stageIds.includes(s.id))
      : allStages;

    if (stages.length === 0) {
      throw new BadRequestException('No workflow stages found for this project');
    }

    // Fetch screen functions to understand project scope
    const screenFunctions = await this.screenFunctionRepository.findAll({
      where: { projectId },
    });

    // Fetch team members
    const members = await this.memberService.findActiveByProject(projectId);

    // Fetch project settings
    const project = await this.projectService.findOne(projectId);
    const settings = await this.projectService.getSettings(projectId);

    // Fetch historical stage data
    const historicalData = await this.getHistoricalData(projectId);

    // Get step-screen function counts per stage for context
    const stageContext = await this.getStageContext(stages);

    // Build prompt
    const prompt = this.buildStageEffortPrompt(stages, stageContext, screenFunctions, members, historicalData, settings, project);

    try {
      const languageInstruction = this.getLanguageInstruction(language);
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a software project estimation expert. Analyze workflow stages, screen functions scope, and team composition to provide accurate stage-level effort estimates. Each stage represents a phase of software development (e.g., Requirement, Design, Coding, Testing). ${languageInstruction} You MUST respond with a valid JSON object.`,
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
      console.error('AI stage effort estimation error:', error);
      return {
        success: true,
        source: 'Template',
        data: this.generateTemplateStageEstimation(stages, stageContext, screenFunctions, members, settings, project),
      };
    }
  }

  // ===== Apply Results =====

  async applyStageEstimation(dto: ApplyAIStageEstimationDto) {
    const { projectId, estimates } = dto;

    const results: Array<{ stageId: number; updated: boolean }> = [];

    for (const estimate of estimates) {
      try {
        const stage = await this.stageRepository.findByPk(estimate.stageId);
        if (stage && stage.projectId === projectId) {
          const updateData: any = { estimatedEffort: estimate.estimatedEffortHours };
          if (estimate.startDate) updateData.startDate = estimate.startDate;
          if (estimate.endDate) updateData.endDate = estimate.endDate;
          await stage.update(updateData);
          results.push({ stageId: estimate.stageId, updated: true });
        } else {
          results.push({ stageId: estimate.stageId, updated: false });
        }
      } catch (error) {
        results.push({ stageId: estimate.stageId, updated: false });
      }
    }

    return { success: true, results };
  }

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
    defaultMemberMap: Map<number, Array<{ memberId: number; memberName: string; memberRole: string }>>,
    settings: any,
    project: any,
  ): string {
    const taskList = tasks.map(t => {
      const sfId = t.screenFunctionId;
      const assignedMembers = defaultMemberMap.get(sfId) || [];
      return {
        stepScreenFunctionId: t.id,
        stepName: (t as any).step?.name || 'Unknown',
        screenFunctionName: (t as any).screenFunction?.name || 'Unknown',
        priority: (t as any).screenFunction?.priority || 'Medium',
        complexity: (t as any).screenFunction?.complexity || 'Medium',
        estimatedEffort: t.estimatedEffort || 0,
        status: t.status,
        registeredMembers: assignedMembers.length > 0
          ? assignedMembers.map(m => ({ memberId: m.memberId, name: m.memberName, role: m.memberRole }))
          : [],
      };
    });

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
- CRITICAL: If a task has "registeredMembers" (non-empty array), you MUST assign that task to one of the registered members. These are the members the project manager has explicitly designated for this screen function.
- Only fall back to other members if no registered members are available for a task
- For tasks without registered members, assign based on role matching (DEV for coding, QA for testing, BA for requirements)
- Balance workload across team members within their registered assignments
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

  private async getStageContext(stages: WorkflowStage[]) {
    const context: Array<{
      stageId: number;
      stageName: string;
      stepCount: number;
      linkedScreenFunctions: number;
      totalEstimatedEffort: number;
    }> = [];

    for (const stage of stages) {
      const steps = await this.taskWorkflowService.findAllSteps(stage.id);
      const stepIds = steps.map(s => s.id);

      let linkedSFs = 0;
      let totalEffort = 0;
      if (stepIds.length > 0) {
        const ssfs = await this.stepScreenFunctionRepository.findAll({
          where: { stepId: stepIds },
        });
        linkedSFs = ssfs.length;
        totalEffort = ssfs.reduce((sum, s) => sum + (s.estimatedEffort || 0), 0);
      }

      context.push({
        stageId: stage.id,
        stageName: stage.name,
        stepCount: steps.length,
        linkedScreenFunctions: linkedSFs,
        totalEstimatedEffort: totalEffort,
      });
    }

    return context;
  }

  private buildStageEffortPrompt(
    stages: WorkflowStage[],
    stageContext: Array<any>,
    screenFunctions: ScreenFunction[],
    members: Member[],
    historicalData: any,
    settings: any,
    project: any,
  ): string {
    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const workingDaysPerMonth = settings?.workingDaysPerMonth || 20;
    const projectStartDate = project.startDate || new Date().toISOString().split('T')[0];

    const stageList = stages.map(s => {
      const ctx = stageContext.find(c => c.stageId === s.id);
      // Note: all effort fields below are in MAN-DAYS (MD)
      const existingMD = ctx?.totalEstimatedEffort || 0;
      return {
        id: s.id,
        name: s.name,
        displayOrder: s.displayOrder,
        currentEstimatedEffort_manDays: s.estimatedEffort || 0,
        currentEstimatedEffort_hours: (s.estimatedEffort || 0) * workingHoursPerDay,
        currentStartDate: s.startDate || null,
        currentEndDate: s.endDate || null,
        stepCount: ctx?.stepCount || 0,
        linkedScreenFunctions: ctx?.linkedScreenFunctions || 0,
        existingStepEffort_manDays: existingMD,
        existingStepEffort_hours: existingMD * workingHoursPerDay,
      };
    });

    const sfSummary = {
      total: screenFunctions.length,
      byComplexity: {
        Simple: screenFunctions.filter(sf => sf.complexity === 'Simple').length,
        Medium: screenFunctions.filter(sf => sf.complexity === 'Medium').length,
        Complex: screenFunctions.filter(sf => sf.complexity === 'Complex').length,
      },
      byType: {
        Screen: screenFunctions.filter(sf => sf.type === 'Screen').length,
        Function: screenFunctions.filter(sf => sf.type === 'Function').length,
        Other: screenFunctions.filter(sf => sf.type === 'Other').length,
      },
      // estimatedEffort is stored in MAN-DAYS (MD) in the database
      totalCurrentEstimate_manDays: +(screenFunctions.reduce((sum, sf) => sum + (sf.estimatedEffort || 0), 0)).toFixed(2),
      totalCurrentEstimate_hours: +(screenFunctions.reduce((sum, sf) => sum + (sf.estimatedEffort || 0), 0) * workingHoursPerDay).toFixed(0),
    };

    const teamSummary = {
      totalMembers: members.length,
      byRole: members.reduce((acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      avgExperience: members.length > 0
        ? (members.reduce((sum, m) => sum + (m.yearsOfExperience || 0), 0) / members.length).toFixed(1)
        : 0,
    };

    const totalProjectHours = sfSummary.totalCurrentEstimate_hours;
    const totalProjectMD = sfSummary.totalCurrentEstimate_manDays;

    return `
Estimate the effort (in man-hours) for each workflow stage below.
Each stage represents a phase in the software development lifecycle.

CRITICAL UNIT NOTICE:
- All "manDays" values in the data are in MAN-DAYS (MD), NOT hours
- 1 MD = ${workingHoursPerDay} hours
- The total project estimated effort is ${totalProjectMD} MD = ${totalProjectHours} hours
- Your "estimatedEffortHours" responses MUST be in HOURS

Project: ${project.name}
Project Start Date: ${projectStartDate}
Working hours/day: ${workingHoursPerDay}
Working days/month: ${workingDaysPerMonth}
Total project scope: ${totalProjectMD} man-days = ${totalProjectHours} hours (use this as your baseline)

Team Composition:
${JSON.stringify(teamSummary, null, 2)}

Screen Functions Summary (project scope):
${JSON.stringify(sfSummary, null, 2)}

Historical Performance Data:
${JSON.stringify(historicalData, null, 2)}

Workflow Stages to Estimate:
${JSON.stringify(stageList, null, 2)}

Respond with a JSON object in this exact format:
{
  "estimates": [
    {
      "stageId": <number>,
      "stageName": "<string>",
      "estimatedEffortHours": <number>,
      "suggestedStartDate": "YYYY-MM-DD",
      "suggestedEndDate": "YYYY-MM-DD",
      "confidence": "high" | "medium" | "low",
      "reasoning": "<brief explanation>",
      "effortDistribution": "<percentage of total project effort>"
    }
  ],
  "totalEstimatedHours": <number>,
  "totalEstimatedManMonths": <number>,
  "assumptions": ["<string>"]
}

Rules:
- The sum of all stage estimatedEffortHours should be close to the total project hours (${totalProjectHours}h = ${totalProjectMD} MD)
- Distribute effort using typical ratios: Requirement ~10%, Design ~15%, Coding ~30%, Unit Test ~15%, Integration Test ~10%, System Test ~10%, User Test ~10%
- Adjust distribution based on project complexity (Simple/Medium/Complex mix of screen functions)
- Team size (${teamSummary.totalMembers} members) determines calendar duration, not total effort
- If existingStepEffort_hours > 0 for a stage, use that as a strong signal for that stage's effort
- Stages are sequential; each stage's suggestedStartDate = previous stage's suggestedEndDate + 1 working day
- Calendar duration of a stage = estimatedEffortHours / (workingHoursPerDay × parallel_team_members)
- Skip weekends for date calculations (assuming non-working days: Saturday, Sunday)
    `.trim();
  }

  private addWorkingDays(startDate: Date, days: number, nonWorkingDays: number[] = [0, 6]): Date {
    const result = new Date(startDate);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (!nonWorkingDays.includes(result.getDay())) {
        added++;
      }
    }
    return result;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private generateTemplateStageEstimation(
    stages: WorkflowStage[],
    stageContext: Array<any>,
    screenFunctions: ScreenFunction[],
    members: Member[],
    settings: any,
    project: any,
  ) {
    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const workingDaysPerMonth = settings?.workingDaysPerMonth || 20;
    const nonWorkingDays = settings?.nonWorkingDays || [0, 6];

    // Calculate total SF effort as baseline
    // estimatedEffort on ScreenFunction is stored in MAN-DAYS — convert to hours
    const totalSFEffortMD = screenFunctions.reduce((sum, sf) => sum + (sf.estimatedEffort || 0), 0);
    const totalSFEffortHours = totalSFEffortMD * workingHoursPerDay;
    // If no SF effort, estimate based on count and complexity (already in hours)
    const baseTotalEffort = totalSFEffortHours > 0
      ? totalSFEffortHours
      : screenFunctions.reduce((sum, sf) => {
          const mult = sf.complexity === 'Simple' ? 8 : sf.complexity === 'Complex' ? 56 : 24;
          return sum + mult;
        }, 0) || 160; // default 160h (1 man-month) if no SFs

    // Typical effort distribution by stage name
    const stageDistribution: Record<string, number> = {
      'Requirement': 0.10,
      'Functional Design': 0.15,
      'Coding': 0.30,
      'Unit Test': 0.15,
      'Integration Test': 0.10,
      'System Test': 0.10,
      'User Test': 0.10,
    };

    // Team capacity: parallel work factor (how many people can work simultaneously)
    const activeMembers = members.filter(m => m.status === 'Active');
    const parallelFactor = Math.max(1, Math.min(activeMembers.length, 3)); // cap at 3 for realistic parallelism

    // Calculate start date for sequential stages
    let currentDate = new Date(project.startDate || new Date().toISOString().split('T')[0]);

    const estimates = stages.map(stage => {
      const ctx = stageContext.find(c => c.stageId === stage.id);
      // Use existing step effort if available, otherwise use distribution
      const distribution = stageDistribution[stage.name] || (1 / stages.length);
      const effortFromSteps = ctx?.totalEstimatedEffort || 0;
      const estimatedHours = effortFromSteps > 0
        ? effortFromSteps
        : Math.round(baseTotalEffort * distribution);

      // Calculate calendar days: effort hours / (hours per day * parallel workers)
      const calendarDays = Math.max(1, Math.ceil(estimatedHours / (workingHoursPerDay * parallelFactor)));

      const suggestedStartDate = this.formatDate(currentDate);
      const endDate = this.addWorkingDays(currentDate, calendarDays, nonWorkingDays);
      const suggestedEndDate = this.formatDate(endDate);

      // Next stage starts the working day after this stage ends
      currentDate = this.addWorkingDays(endDate, 1, nonWorkingDays);

      return {
        stageId: stage.id,
        stageName: stage.name,
        estimatedEffortHours: estimatedHours,
        suggestedStartDate,
        suggestedEndDate,
        confidence: 'low' as const,
        reasoning: effortFromSteps > 0
          ? `Based on ${ctx?.linkedScreenFunctions} linked step-screen functions totaling ${effortFromSteps}h`
          : `Template: ${(distribution * 100).toFixed(0)}% of total project effort (${baseTotalEffort}h)`,
        effortDistribution: `${(distribution * 100).toFixed(0)}%`,
      };
    });

    const totalHours = estimates.reduce((sum, e) => sum + e.estimatedEffortHours, 0);

    return {
      estimates,
      totalEstimatedHours: totalHours,
      totalEstimatedManMonths: +(totalHours / (workingHoursPerDay * workingDaysPerMonth)).toFixed(2),
      assumptions: [
        'Template-based estimation (AI unavailable)',
        'Standard effort distribution: Req 10%, Design 15%, Coding 30%, UT 15%, IT 10%, ST 10%, UAT 10%',
        `Working: ${workingHoursPerDay}h/day, ${workingDaysPerMonth} days/month`,
        totalSFEffortMD > 0
          ? `Base total effort: ${totalSFEffortMD} MD × ${workingHoursPerDay}h = ${baseTotalEffort}h from ${screenFunctions.length} screen functions`
          : `Base total effort: ${baseTotalEffort}h (estimated from ${screenFunctions.length} screen functions by complexity)`,
        `Parallel factor: ${parallelFactor} members working simultaneously`,
        'Stages are sequential (each stage starts after the previous one ends)',
      ],
    };
  }

  private generateTemplateSchedule(
    tasks: StepScreenFunction[],
    members: Member[],
    defaultMemberMap: Map<number, Array<{ memberId: number; memberName: string; memberRole: string }>>,
    stage: WorkflowStage,
    settings: any,
  ) {
    const workingHoursPerDay = settings?.workingHoursPerDay || 8;
    const nonWorkingDays = settings?.nonWorkingDays || [0, 6];
    const stageStart = new Date(stage.startDate || new Date().toISOString().split('T')[0]);

    // Filter to development-capable members
    const devMembers = members.filter(m =>
      ['DEV', 'QA', 'BA', 'TL'].includes(m.role) && m.status === 'Active'
    );

    if (devMembers.length === 0) {
      return { assignments: [], warnings: ['No active development team members found'], summary: 'Cannot generate schedule without team members' };
    }

    // Track each member's next available date
    const memberNextDate = new Map<number, Date>();
    devMembers.forEach(m => memberNextDate.set(m.id, new Date(stageStart)));

    let fallbackIndex = 0;
    const assignments = tasks.map((task) => {
      const effort = task.estimatedEffort || 8;
      const daysNeeded = Math.max(1, Math.ceil(effort / workingHoursPerDay));
      const sfId = task.screenFunctionId;
      const sf = (task as any).screenFunction;
      const taskName = sf?.name || `Task ${task.id}`;

      // Check for registered default members
      const registeredMembers = defaultMemberMap.get(sfId) || [];
      let chosenMember: Member | undefined;
      let reasoning: string;

      if (registeredMembers.length > 0) {
        // Prefer registered member with the earliest available date
        let earliestDate: Date | null = null;
        for (const rm of registeredMembers) {
          const m = devMembers.find(dm => dm.id === rm.memberId);
          if (m) {
            const nextDate = memberNextDate.get(m.id) || stageStart;
            if (!earliestDate || nextDate < earliestDate) {
              earliestDate = nextDate;
              chosenMember = m;
            }
          }
        }
        reasoning = chosenMember
          ? `Assigned to registered default member for "${taskName}"`
          : 'Registered members not available, using fallback';
      }

      // Fallback: round-robin from devMembers
      if (!chosenMember) {
        chosenMember = devMembers[fallbackIndex % devMembers.length];
        fallbackIndex++;
        reasoning = 'Round-robin assignment (no registered member)';
      }

      const memberStart = memberNextDate.get(chosenMember.id) || new Date(stageStart);
      const memberEnd = this.addWorkingDays(memberStart, daysNeeded - 1, nonWorkingDays);

      // Update this member's next available date
      memberNextDate.set(chosenMember.id, this.addWorkingDays(memberEnd, 1, nonWorkingDays));

      return {
        stepScreenFunctionId: task.id,
        memberId: chosenMember.id,
        memberName: chosenMember.name,
        taskName,
        estimatedEffort: effort,
        estimatedStartDate: this.formatDate(memberStart),
        estimatedEndDate: this.formatDate(memberEnd),
        reasoning,
      };
    });

    const startDateStr = this.formatDate(stageStart);
    const registeredCount = tasks.filter(t => (defaultMemberMap.get(t.screenFunctionId) || []).length > 0).length;

    return {
      assignments,
      timeline: {
        startDate: startDateStr,
        endDate: assignments.length > 0
          ? assignments[assignments.length - 1].estimatedEndDate
          : startDateStr,
        totalWorkingDays: Math.max(...Array.from(memberNextDate.values()).map(d =>
          Math.ceil((d.getTime() - stageStart.getTime()) / (1000 * 60 * 60 * 24))
        )),
      },
      warnings: [
        'Template-based schedule - review and adjust manually',
        registeredCount > 0
          ? `${registeredCount}/${tasks.length} tasks assigned to registered default members`
          : 'No registered default members found — using round-robin',
      ],
      summary: `Assigned ${tasks.length} tasks to ${devMembers.length} members (${registeredCount} by registration, ${tasks.length - registeredCount} by round-robin)`,
    };
  }
}
