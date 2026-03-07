import { Card, Button, Input, Select, EmptyState } from "@/components/common";
import { useTranslation } from "react-i18next";
import type { Member, EffortUnit } from "@/types";
import { EFFORT_UNIT_LABELS } from "@/utils/effortUtils";

interface ProjectMembersTabProps {
  memberSummary: any;
  filteredMembers: Member[] | undefined;
  memberFilter: { role: string; status: string; search: string };
  setMemberFilter: (filter: { role: string; status: string; search: string }) => void;
  getMemberWorkload: (memberId: number) => any;
  setShowAddMember: (show: boolean) => void;
  setShowCopyMembers: (show: boolean) => void;
  setEditingMember: (member: Member | null) => void;
  setLinkingMemberId: (id: number | null) => void;
  linkUserMutation: { mutate: (data: { memberId: number; userId: number | null }) => void };
  deleteMemberMutation: { mutate: (id: number) => void };
  effortUnit: EffortUnit;
  displayEffort: (value: number, sourceUnit: EffortUnit) => string;
}

export function ProjectMembersTab({
  memberSummary,
  filteredMembers,
  memberFilter,
  setMemberFilter,
  getMemberWorkload,
  setShowAddMember,
  setShowCopyMembers,
  setEditingMember,
  setLinkingMemberId,
  linkUserMutation,
  deleteMemberMutation,
  effortUnit,
  displayEffort,
}: ProjectMembersTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {memberSummary && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">
              {t("common.total")} {t("member.title")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {memberSummary.total || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {memberSummary.byStatus?.Active || 0} {t("member.statusActive")}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">{t("member.averageExperience")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {(memberSummary.averageExperience || 0).toFixed(1)}{" "}
              <span className="text-sm text-gray-500">{t("member.expYears")}</span>
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">{t("member.totalHourlyRate")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              ${(memberSummary.totalHourlyRate || 0).toFixed(2)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">{t("member.byAvailability")}</p>
            <div className="mt-1 text-sm">
              <span className="text-green-600">
                {memberSummary.byAvailability?.["Full-time"] || 0} FT
              </span>
              {" / "}
              <span className="text-blue-600">
                {memberSummary.byAvailability?.["Part-time"] || 0} PT
              </span>
              {" / "}
              <span className="text-yellow-600">
                {memberSummary.byAvailability?.["Contract"] || 0} C
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Role Breakdown */}
      {memberSummary && memberSummary.byRole && (
        <div className="grid grid-cols-9 gap-2">
          {Object.entries(memberSummary.byRole).map(([role, count]) => (
            <div key={role} className="bg-gray-50 p-2 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-700">{(count as number) || 0}</p>
              <p className="text-xs text-gray-500">{role}</p>
            </div>
          ))}
        </div>
      )}

      {/* Member List */}
      <Card
        title={t("member.teamMembers")}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowCopyMembers(true)}>
              {t("member.copyFromProject")}
            </Button>
            <Button onClick={() => setShowAddMember(true)}>
              {t("member.create")}
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t("screenFunction.searchPlaceholder")}
              value={memberFilter.search}
              onChange={(e) => setMemberFilter({ ...memberFilter, search: e.target.value })}
            />
          </div>
          <Select
            value={memberFilter.role}
            onChange={(e) => setMemberFilter({ ...memberFilter, role: e.target.value })}
            options={[
              { value: "", label: t("member.allRoles") },
              { value: "PM", label: t("member.rolePM") },
              { value: "TL", label: t("member.roleTL") },
              { value: "BA", label: t("member.roleBA") },
              { value: "DEV", label: t("member.roleDEV") },
              { value: "QA", label: t("member.roleQA") },
              { value: "Comtor", label: t("member.roleComtor") },
              { value: "Designer", label: t("member.roleDesigner") },
              { value: "DevOps", label: t("member.roleDevOps") },
              { value: "Other", label: t("member.roleOther") },
            ]}
            fullWidth={false}
          />
          <Select
            value={memberFilter.status}
            onChange={(e) => setMemberFilter({ ...memberFilter, status: e.target.value })}
            options={[
              { value: "", label: t("member.allStatuses") },
              { value: "Active", label: t("member.statusActive") },
              { value: "Inactive", label: t("member.statusInactive") },
              { value: "On Leave", label: t("member.statusOnLeave") },
            ]}
            fullWidth={false}
          />
        </div>

        {filteredMembers && filteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">{t("common.name")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("member.role")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("member.experience")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("common.status")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("member.availability")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("member.workload")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("member.linkedUser")}</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  let currentRole = "";
                  return filteredMembers.map((member, index) => {
                    const workload = getMemberWorkload(member.id);
                    const isNewRole = member.role !== currentRole;
                    if (isNewRole) currentRole = member.role;

                    const expYears = member.yearsOfExperience || 0;
                    const expLevel =
                      expYears >= 10
                        ? "Senior+"
                        : expYears >= 5
                          ? "Senior"
                          : expYears >= 3
                            ? "Mid"
                            : expYears >= 1
                              ? "Junior"
                              : "Fresher";
                    const expColor =
                      expYears >= 10
                        ? "text-purple-600"
                        : expYears >= 5
                          ? "text-blue-600"
                          : expYears >= 3
                            ? "text-green-600"
                            : "text-gray-600";

                    return (
                      <tr
                        key={member.id}
                        className={`hover:bg-gray-50 ${isNewRole && index > 0 ? "border-t-2 border-gray-300" : ""}`}
                      >
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            {member.email && (
                              <p className="text-gray-500 text-xs">{member.email}</p>
                            )}
                            {member.skills && member.skills.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {member.skills.slice(0, 3).map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 text-xs bg-gray-100 rounded"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {member.skills.length > 3 && (
                                  <span className="text-xs text-gray-400">
                                    +{member.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${
                              member.role === "PM"
                                ? "bg-purple-100 text-purple-800"
                                : member.role === "TL"
                                  ? "bg-blue-100 text-blue-800"
                                  : member.role === "DEV"
                                    ? "bg-green-100 text-green-800"
                                    : member.role === "QA"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : member.role === "BA"
                                        ? "bg-orange-100 text-orange-800"
                                        : member.role === "Comtor"
                                          ? "bg-pink-100 text-pink-800"
                                          : member.role === "Designer"
                                            ? "bg-indigo-100 text-indigo-800"
                                            : member.role === "DevOps"
                                              ? "bg-cyan-100 text-cyan-800"
                                              : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${expColor}`}>
                              {member.yearsOfExperience
                                ? `${member.yearsOfExperience} ${t("member.expYears")}`
                                : "-"}
                            </span>
                            {member.yearsOfExperience && (
                              <span className={`text-xs ${expColor}`}>{expLevel}</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              member.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : member.status === "On Leave"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {member.availability}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {workload && workload.totalAssigned > 0 ? (
                            <div className="text-xs">
                              <p className="font-medium">
                                {workload.totalAssigned} {t("member.totalAssigned")}
                              </p>
                              <p className="text-gray-500">
                                {workload.completedTasks} {t("member.done")} / {workload.inProgressTasks}{" "}
                                {t("member.active")}
                              </p>
                              {(workload.totalEstimatedEffort > 0 || workload.totalActualEffort > 0) && (
                                <p className="text-gray-400 mt-0.5">
                                  {displayEffort(workload.totalEstimatedEffort, "man-hour")} /{" "}
                                  {displayEffort(workload.totalActualEffort, "man-hour")}{" "}
                                  {EFFORT_UNIT_LABELS[effortUnit]}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">{t("member.noTasks")}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {member.userId && (member as any).user ? (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {(member as any).user.username}
                              </span>
                              <button
                                className="text-gray-400 hover:text-red-500 text-xs"
                                title={t("member.unlinkUser")}
                                onClick={() =>
                                  linkUserMutation.mutate({ memberId: member.id, userId: null })
                                }
                              >
                                x
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={() => setLinkingMemberId(member.id)}
                            >
                              {t("member.linkUser")}
                            </button>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditingMember(member)}
                            >
                              {t("common.edit")}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                if (confirm(t("member.delete") + "?")) {
                                  deleteMemberMutation.mutate(member.id);
                                }
                              }}
                            >
                              {t("common.delete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={t("member.noMembers")}
            description={t("member.noMembersDesc")}
            action={
              <Button onClick={() => setShowAddMember(true)}>
                {t("member.addFirstMember")}
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}
