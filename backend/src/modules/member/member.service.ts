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

    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {
      Active: 0,
      Inactive: 0,
    };

    let totalHourlyRate = 0;
    let totalExperience = 0;
    let membersWithExperience = 0;

    for (const member of members) {
      // Count by role
      byRole[member.role] = (byRole[member.role] || 0) + 1;

      // Count by status
      byStatus[member.status] = (byStatus[member.status] || 0) + 1;

      // Sum hourly rates
      totalHourlyRate += member.hourlyRate || 0;

      // Sum experience
      if (member.yearsOfExperience) {
        totalExperience += member.yearsOfExperience;
        membersWithExperience++;
      }
    }

    // Collect all unique skills
    const allSkills = new Set<string>();
    members.forEach((m) => {
      if (m.skills) {
        m.skills.forEach((skill) => allSkills.add(skill));
      }
    });

    return {
      total: members.length,
      active: byStatus.Active,
      inactive: byStatus.Inactive,
      byRole,
      avgHourlyRate: members.length > 0 ? totalHourlyRate / members.length : 0,
      avgExperience: membersWithExperience > 0 ? totalExperience / membersWithExperience : 0,
      totalHourlyCost: totalHourlyRate,
      skills: Array.from(allSkills),
    };
  }

  // Get workload for each member (will be enhanced when linked to PhaseScreenFunction)
  async getMemberWorkload(memberId: number) {
    const member = await this.findOne(memberId);

    // This will be enhanced to calculate actual workload from assigned tasks
    return {
      member,
      assignedTasks: 0,
      totalEstimatedEffort: 0,
      totalActualEffort: 0,
      capacityHoursPerWeek: (member.availability / 100) * 40, // Assuming 40h work week
      utilizationPercentage: 0,
    };
  }

  // Get all members' workload for a project
  async getProjectWorkload(projectId: number) {
    const members = await this.findActiveByProject(projectId);

    const workloads = await Promise.all(
      members.map(async (member) => {
        const workload = await this.getMemberWorkload(member.id);
        return workload;
      }),
    );

    return workloads;
  }
}
