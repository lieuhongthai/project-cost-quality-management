import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { phaseApi, effortApi, testingApi } from "@/services/api";
import {
  Card,
  LoadingSpinner,
  StatusBadge,
  Button,
  Modal,
  EmptyState,
} from "@/components/common";
import { EffortForm, TestingForm } from "@/components/forms";
import { ProgressChart, TestingQualityChart } from "@/components/charts";
import { format } from "date-fns";

export const Route = createFileRoute("/phases/$phaseId")({
  component: PhaseDetail,
});

function PhaseDetail() {
  const { phaseId } = Route.useParams();
  const [activeTab, setActiveTab] = useState<"efforts" | "testing">("efforts");
  const [showAddEffort, setShowAddEffort] = useState(false);
  const [showAddTesting, setShowAddTesting] = useState(false);
  const [editingEffort, setEditingEffort] = useState<any>(null);
  const [editingTesting, setEditingTesting] = useState<any>(null);

  const { data: phase, isLoading } = useQuery({
    queryKey: ["phase", parseInt(phaseId)],
    queryFn: async () => {
      const response = await phaseApi.getOne(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: efforts } = useQuery({
    queryKey: ["efforts", parseInt(phaseId)],
    queryFn: async () => {
      const response = await effortApi.getByPhase(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: effortSummary } = useQuery({
    queryKey: ["effort-summary", parseInt(phaseId)],
    queryFn: async () => {
      const response = await effortApi.getSummary(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: testing } = useQuery({
    queryKey: ["testing", parseInt(phaseId)],
    queryFn: async () => {
      const response = await testingApi.getByPhase(parseInt(phaseId));
      return response.data;
    },
  });

  const { data: testingSummary } = useQuery({
    queryKey: ["testing-summary", parseInt(phaseId)],
    queryFn: async () => {
      const response = await testingApi.getSummary(parseInt(phaseId));
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Phase not found</p>
      </div>
    );
  }

  // Prepare chart data
  const effortChartData =
    efforts?.map((e) => ({
      week: `Week ${e.weekNumber}`,
      planned: e.plannedEffort,
      actual: e.actualEffort,
      progress: e.progress,
    })) || [];

  const testingChartData =
    testing?.map((t) => ({
      week: `Week ${t.weekNumber}`,
      passed: t.passedTestCases,
      failed: t.failedTestCases,
      passRate: t.passRate,
    })) || [];

  const tabs = [
    { id: "efforts" as const, name: "Efforts" },
    { id: "testing" as const, name: "Testing" },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{phase.name}</h1>
        <p className="mt-2 text-gray-600">Phase Details and Tracking</p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">Status</p>
            <div className="mt-1">
              <StatusBadge status={phase.status as any} />
            </div>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Progress</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {phase.progress.toFixed(1)}%
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Estimated Effort</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {phase.estimatedEffort}{" "}
              <span className="text-sm text-gray-500">MM</span>
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Actual Effort</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {phase.actualEffort}{" "}
              <span className="text-sm text-gray-500">MM</span>
            </p>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "efforts" && (
        <div className="space-y-6">
          {effortSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Card>
                <p className="text-sm text-gray-500">Total Planned</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {effortSummary.totalPlanned.toFixed(2)} MM
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Total Actual</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {effortSummary.totalActual.toFixed(2)} MM
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Variance</p>
                <p
                  className={`mt-1 text-2xl font-semibold ${
                    effortSummary.variance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {effortSummary.variance > 0 ? "+" : ""}
                  {effortSummary.variance.toFixed(2)} MM
                </p>
              </Card>
            </div>
          )}

          {effortChartData.length > 0 && (
            <Card title="Effort Trend">
              <ProgressChart data={effortChartData} />
            </Card>
          )}

          <Card
            title="Weekly Efforts"
            actions={
              <Button size="sm" onClick={() => setShowAddEffort(true)}>
                Add Effort
              </Button>
            }
          >
            {efforts && efforts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Week
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date Range
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Planned
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actual
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Progress
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {efforts.map((effort) => (
                      <tr key={effort.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          Week {effort.weekNumber}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(effort.weekStartDate), "MMM dd")} -{" "}
                          {format(new Date(effort.weekEndDate), "MMM dd")}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {effort.plannedEffort} MM
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {effort.actualEffort} MM
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {effort.progress.toFixed(1)}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingEffort(effort)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No effort data"
                description="Add weekly effort records to track progress"
                action={
                  <Button onClick={() => setShowAddEffort(true)}>
                    Add First Effort Record
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === "testing" && (
        <div className="space-y-6">
          {testingSummary && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <Card>
                <p className="text-sm text-gray-500">Total Test Cases</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {testingSummary.totalTestCases}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Pass Rate</p>
                <p className="mt-1 text-2xl font-semibold text-green-600">
                  {testingSummary.overallPassRate.toFixed(1)}%
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Total Defects</p>
                <p className="mt-1 text-2xl font-semibold text-red-600">
                  {testingSummary.totalDefects}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500">Defect Rate</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {testingSummary.overallDefectRate.toFixed(3)}
                </p>
              </Card>
            </div>
          )}

          {testingChartData.length > 0 && (
            <Card title="Testing Quality Trend">
              <TestingQualityChart data={testingChartData} />
            </Card>
          )}

          <Card
            title="Weekly Testing Data"
            actions={
              <Button size="sm" onClick={() => setShowAddTesting(true)}>
                Add Testing Data
              </Button>
            }
          >
            {testing && testing.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Week
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Total Cases
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Passed
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Failed
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Pass Rate
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Defects
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testing.map((test) => (
                      <tr key={test.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          Week {test.weekNumber}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {test.totalTestCases}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">
                          {test.passedTestCases}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600">
                          {test.failedTestCases}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {test.passRate.toFixed(1)}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {test.defectsDetected}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <StatusBadge status={test.status as any} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingTesting(test)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No testing data"
                description="Add weekly testing records to track quality"
                action={
                  <Button onClick={() => setShowAddTesting(true)}>
                    Add First Testing Record
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showAddEffort || !!editingEffort}
        onClose={() => {
          setShowAddEffort(false);
          setEditingEffort(null);
        }}
        title={editingEffort ? "Edit Effort Record" : "Add Effort Record"}
      >
        <EffortForm
          phaseId={parseInt(phaseId)}
          effort={editingEffort}
          onSuccess={() => {
            setShowAddEffort(false);
            setEditingEffort(null);
          }}
          onCancel={() => {
            setShowAddEffort(false);
            setEditingEffort(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={showAddTesting || !!editingTesting}
        onClose={() => {
          setShowAddTesting(false);
          setEditingTesting(null);
        }}
        title={editingTesting ? "Edit Testing Data" : "Add Testing Data"}
      >
        <TestingForm
          phaseId={parseInt(phaseId)}
          testing={editingTesting}
          onSuccess={() => {
            setShowAddTesting(false);
            setEditingTesting(null);
          }}
          onCancel={() => {
            setShowAddTesting(false);
            setEditingTesting(null);
          }}
        />
      </Modal>
    </div>
  );
}
