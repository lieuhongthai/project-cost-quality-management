import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Member } from './member.model';
import { CreateMemberDto, UpdateMemberDto } from './member.dto';
import { Op } from 'sequelize';

@Injectable()
export class MemberService {
  constructor(
    @Inject('MEMBER_REPOSITORY')
    private memberRepository: typeof Member,
  ) {}

  async findAll(): Promise<Member[]> {
    return this.memberRepository.findAll({
      order: [['name', 'ASC']],
    });
  }

  async findByProject(projectId: number): Promise<Member[]> {
    return this.memberRepository.findAll({
      where: { projectId },
      order: [['name', 'ASC']],
    });
  }

  async findActiveByProject(projectId: number): Promise<Member[]> {
    return this.memberRepository.findAll({
      where: { projectId, status: 'Active' },
      order: [['name', 'ASC']],
    });
  }

  async findOne(id: number): Promise<Member> {
    const member = await this.memberRepository.findByPk(id);

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    return member;
  }

  async create(createDto: CreateMemberDto): Promise<Member> {
    return this.memberRepository.create(createDto as any);
  }

  async update(id: number, updateDto: UpdateMemberDto): Promise<Member> {
    const member = await this.findOne(id);
    await member.update(updateDto);
    return member;
  }

  async remove(id: number): Promise<void> {
    const member = await this.findOne(id);
    await member.destroy();
  }

  // Get summary for a project
  async getProjectSummary(projectId: number) {
    const members = await this.findByProject(projectId);

    const byRole: Record<string, number> = {
      PM: 0,
      TL: 0,
      BA: 0,
      DEV: 0,
      QA: 0,
      Comtor: 0,
      Designer: 0,
      DevOps: 0,
      Other: 0,
    };
    const byStatus: Record<string, number> = {
      Active: 0,
      Inactive: 0,
      'On Leave': 0,
    };
    const byAvailability: Record<string, number> = {
      'Full-time': 0,
      'Part-time': 0,
      Contract: 0,
    };

    let totalHourlyRate = 0;
    let totalExperience = 0;
    let membersWithExperience = 0;

    for (const member of members) {
      // Count by role
      byRole[member.role] = (byRole[member.role] || 0) + 1;

      // Count by status
      byStatus[member.status] = (byStatus[member.status] || 0) + 1;

      // Count by availability
      byAvailability[member.availability] = (byAvailability[member.availability] || 0) + 1;

      // Sum hourly rates
      totalHourlyRate += member.hourlyRate || 0;

      // Sum experience
      if (member.yearsOfExperience) {
        totalExperience += member.yearsOfExperience;
        membersWithExperience++;
      }
    }

    return {
      total: members.length,
      byRole,
      byStatus,
      byAvailability,
      averageExperience: membersWithExperience > 0 ? totalExperience / membersWithExperience : 0,
      totalHourlyRate,
    };
  }

  // Get workload for a specific member
  async getMemberWorkload(memberId: number) {
    const member = await this.findOne(memberId);

    // Import PhaseScreenFunction to calculate workload
    const { PhaseScreenFunction } = await import('../screen-function/phase-screen-function.model');

    const assignments = await PhaseScreenFunction.findAll({
      where: { assigneeId: memberId },
    });

    let totalEstimatedEffort = 0;
    let totalActualEffort = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;

    for (const assignment of assignments) {
      totalEstimatedEffort += assignment.estimatedEffort || 0;
      totalActualEffort += assignment.actualEffort || 0;

      if (assignment.status === 'Completed') {
        completedTasks++;
      } else if (assignment.status === 'In Progress') {
        inProgressTasks++;
      } else if (assignment.status === 'Not Started') {
        pendingTasks++;
      }
    }

    return {
      memberId: member.id,
      memberName: member.name,
      totalAssigned: assignments.length,
      totalEstimatedEffort,
      totalActualEffort,
      completedTasks,
      inProgressTasks,
      pendingTasks,
    };
  }

  // Get all members' workload for a project
  async getProjectWorkload(projectId: number) {
    const members = await this.findByProject(projectId);

    const workloads = await Promise.all(
      members.map(async (member) => {
        return this.getMemberWorkload(member.id);
      }),
    );

    return workloads;
  }

  /**
   * Copy members from another project
   * Creates new member records with the same data but different projectId
   * Skips members that already exist in the target project (by name + email)
   */
  async copyMembersFromProject(
    sourceProjectId: number,
    targetProjectId: number,
    memberIds: number[],
  ): Promise<{ copied: number; skipped: number; members: Member[] }> {
    const existingMembers = await this.findByProject(targetProjectId);
    const existingKeys = new Set(
      existingMembers.map((m) => `${m.name.toLowerCase()}-${m.email?.toLowerCase() || ''}`),
    );

    const copiedMembers: Member[] = [];
    let skipped = 0;

    for (const memberId of memberIds) {
      try {
        const sourceMember = await this.findOne(memberId);

        // Check if member already exists in target project
        const key = `${sourceMember.name.toLowerCase()}-${sourceMember.email?.toLowerCase() || ''}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        // Create a copy in the target project
        const newMember = await this.memberRepository.create({
          projectId: targetProjectId,
          name: sourceMember.name,
          email: sourceMember.email,
          role: sourceMember.role,
          availability: sourceMember.availability,
          hourlyRate: sourceMember.hourlyRate,
          yearsOfExperience: sourceMember.yearsOfExperience,
          skills: sourceMember.skills,
          status: 'Active', // New members start as active
        } as any);

        copiedMembers.push(newMember);
        existingKeys.add(key); // Prevent duplicates within same batch
      } catch (error) {
        // Skip if source member not found
        skipped++;
      }
    }

    return {
      copied: copiedMembers.length,
      skipped,
      members: copiedMembers,
    };
  }
}
