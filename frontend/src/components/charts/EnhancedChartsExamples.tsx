/**
 * Enhanced Charts Usage Examples
 * 
 * This file demonstrates how to use the new Enhanced Charts
 * in your project pages and components.
 */

import React from 'react';
import {
  EnhancedMetricsChart,
  EnhancedProgressChart,
  EnhancedTestingQualityChart,
} from '@/components/charts';

// ============================================
// Example 1: Basic Metrics Chart
// ============================================
export const Example1_BasicMetrics = () => {
  const metricsData = {
    spi: 0.98,
    cpi: 1.05,
    passRate: 96.5,
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Project Performance Metrics</h2>
      <EnhancedMetricsChart data={metricsData} />
    </div>
  );
};

// ============================================
// Example 2: Metrics with Historical Data
// ============================================
export const Example2_MetricsWithHistory = () => {
  const metricsData = {
    spi: 0.98,
    cpi: 1.05,
    passRate: 96.5,
    defectRate: 0.03,
    velocity: 120,
  };

  const historicalData = [
    { period: 'Sprint 1', spi: 0.92, cpi: 0.98, passRate: 88, defectRate: 0.08, velocity: 100 },
    { period: 'Sprint 2', spi: 0.95, cpi: 1.0, passRate: 92, defectRate: 0.05, velocity: 110 },
    { period: 'Sprint 3', spi: 0.98, cpi: 1.05, passRate: 96.5, defectRate: 0.03, velocity: 120 },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Metrics Trend Analysis</h2>
      <EnhancedMetricsChart
        data={metricsData}
        historicalData={historicalData}
      />
    </div>
  );
};

// ============================================
// Example 3: Metrics Comparison
// ============================================
export const Example3_MetricsComparison = () => {
  const currentProjectMetrics = {
    spi: 0.98,
    cpi: 1.05,
    passRate: 96.5,
  };

  const previousProjectMetrics = {
    spi: 0.85,
    cpi: 0.92,
    passRate: 88,
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Current vs Previous Project</h2>
      <EnhancedMetricsChart
        data={currentProjectMetrics}
        showComparison={true}
        comparisonData={previousProjectMetrics}
        comparisonLabel="Previous Project"
      />
    </div>
  );
};

// ============================================
// Example 4: Progress Tracking
// ============================================
export const Example4_ProgressTracking = () => {
  const progressData = [
    { week: 'Week 1', planned: 10, actual: 9, progress: 12, variance: -1 },
    { week: 'Week 2', planned: 10, actual: 11, progress: 25, variance: 1 },
    { week: 'Week 3', planned: 10, actual: 10, progress: 38, variance: 0 },
    { week: 'Week 4', planned: 10, actual: 12, progress: 52, variance: 2 },
    { week: 'Week 5', planned: 10, actual: 11, progress: 65, variance: 1 },
    { week: 'Week 6', planned: 10, actual: 10, progress: 78, variance: 0 },
    { week: 'Week 7', planned: 10, actual: 9, progress: 88, variance: -1 },
    { week: 'Week 8', planned: 10, actual: 10, progress: 100, variance: 0 },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Weekly Progress Tracking</h2>
      <EnhancedProgressChart
        data={progressData}
        showVariance={true}
        showTrendLine={true}
        targetProgress={100}
      />
    </div>
  );
};

// ============================================
// Example 5: Cumulative Progress View
// ============================================
export const Example5_CumulativeProgress = () => {
  const progressData = [
    { week: 'Week 1', planned: 10, actual: 9, progress: 12 },
    { week: 'Week 2', planned: 10, actual: 11, progress: 25 },
    { week: 'Week 3', planned: 10, actual: 10, progress: 38 },
    { week: 'Week 4', planned: 10, actual: 12, progress: 52 },
    { week: 'Week 5', planned: 10, actual: 11, progress: 65 },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Cumulative Effort Tracking</h2>
      <EnhancedProgressChart
        data={progressData}
        showCumulative={true}
        showTrendLine={true}
      />
    </div>
  );
};

// ============================================
// Example 6: Testing Quality Monitoring
// ============================================
export const Example6_TestingQuality = () => {
  const testingData = [
    { week: 'Week 1', passed: 85, failed: 15, passRate: 85.0, defects: 18 },
    { week: 'Week 2', passed: 92, failed: 8, passRate: 92.0, defects: 12 },
    { week: 'Week 3', passed: 95, failed: 5, passRate: 95.0, defects: 8 },
    { week: 'Week 4', passed: 97, failed: 3, passRate: 97.0, defects: 5 },
    { week: 'Week 5', passed: 98, failed: 2, passRate: 98.0, defects: 3 },
    { week: 'Week 6', passed: 96, failed: 4, passRate: 96.0, defects: 6 },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Testing Quality Analysis</h2>
      <EnhancedTestingQualityChart
        data={testingData}
        showDefects={true}
        showPassRate={true}
        showTrendLine={true}
        targetPassRate={95}
      />
    </div>
  );
};

// ============================================
// Example 7: Complete Dashboard with All Charts
// ============================================
export const Example7_CompleteDashboard = () => {
  const metricsData = {
    spi: 0.98,
    cpi: 1.05,
    passRate: 96.5,
    defectRate: 0.03,
    velocity: 120,
  };

  const progressData = [
    { week: 'Week 1', planned: 10, actual: 9, progress: 12 },
    { week: 'Week 2', planned: 10, actual: 11, progress: 25 },
    { week: 'Week 3', planned: 10, actual: 10, progress: 38 },
    { week: 'Week 4', planned: 10, actual: 12, progress: 52 },
  ];

  const testingData = [
    { week: 'Week 1', passed: 85, failed: 15, passRate: 85.0 },
    { week: 'Week 2', passed: 92, failed: 8, passRate: 92.0 },
    { week: 'Week 3', passed: 95, failed: 5, passRate: 95.0 },
    { week: 'Week 4', passed: 97, failed: 3, passRate: 97.0 },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">Project Dashboard</h1>
      </div>

      {/* Metrics Overview */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
        <EnhancedMetricsChart data={metricsData} height={350} />
      </div>

      {/* Progress and Testing Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Progress Tracking</h2>
          <EnhancedProgressChart
            data={progressData}
            showVariance={true}
            height={350}
          />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Quality</h2>
          <EnhancedTestingQualityChart
            data={testingData}
            showPassRate={true}
            height={350}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// Example 8: Using in Phase Detail Page
// ============================================
export const Example8_PhaseDetailIntegration = ({ phaseId }: { phaseId: number }) => {
  // In real app, fetch from API
  const { data: efforts } = useQuery(['efforts', phaseId], () => 
    effortApi.getByPhase(phaseId)
  );

  const { data: testings } = useQuery(['testing', phaseId], () => 
    testingApi.getByPhase(phaseId)
  );

  // Transform API data to chart format
  const progressData = efforts?.map(e => ({
    week: `Week ${e.weekNumber}`,
    planned: e.plannedEffort,
    actual: e.actualEffort,
    progress: e.progress,
  })) || [];

  const testingData = testings?.map(t => ({
    week: `Week ${t.weekNumber}`,
    passed: t.passedTestCases,
    failed: t.failedTestCases,
    passRate: t.passRate,
    defects: t.defectsDetected,
  })) || [];

  return (
    <div className="space-y-6">
      <EnhancedProgressChart
        data={progressData}
        showVariance={true}
        showTrendLine={true}
      />

      <EnhancedTestingQualityChart
        data={testingData}
        showDefects={true}
        showPassRate={true}
      />
    </div>
  );
};

// ============================================
// Example 9: Export Functionality
// ============================================
export const Example9_WithExport = () => {
  const handleExport = async (type: 'png' | 'svg') => {
    // You can use html2canvas or other libraries
    console.log(`Exporting as ${type}`);
    
    // Example with html2canvas:
    // const element = document.getElementById('chart-container');
    // const canvas = await html2canvas(element);
    // const link = document.createElement('a');
    // link.download = `metrics-${Date.now()}.png`;
    // link.href = canvas.toDataURL();
    // link.click();
  };

  const metricsData = {
    spi: 0.98,
    cpi: 1.05,
    passRate: 96.5,
  };

  return (
    <div id="chart-container" className="p-6">
      <h2 className="text-2xl font-bold mb-4">Exportable Chart</h2>
      <EnhancedMetricsChart
        data={metricsData}
        onExport={handleExport}
      />
    </div>
  );
};

// ============================================
// Example 10: Real-time Updates
// ============================================
export const Example10_RealTimeUpdates = () => {
  const [metricsData, setMetricsData] = React.useState({
    spi: 0.98,
    cpi: 1.05,
    passRate: 96.5,
  });

  // Simulate real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetricsData(prev => ({
        spi: prev.spi + (Math.random() - 0.5) * 0.05,
        cpi: prev.cpi + (Math.random() - 0.5) * 0.05,
        passRate: Math.max(0, Math.min(100, prev.passRate + (Math.random() - 0.5) * 2)),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Live Metrics</h2>
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live
        </span>
      </div>
      <EnhancedMetricsChart data={metricsData} />
    </div>
  );
};
