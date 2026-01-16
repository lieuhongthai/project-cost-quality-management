import { createFileRoute } from "@tanstack/react-router";
import { EnhancedMetricsChart, EnhancedProgressChart, EnhancedTestingQualityChart } from "@/components/charts";
import { Card } from "@/components/common";

export const Route = createFileRoute("/test-enhanced-charts")({
  component: TestEnhancedCharts,
});

function TestEnhancedCharts() {
  // Sample data for Metrics Chart
  const metricsData = {
    spi: 0.98,
    cpi: 1.05,
    passRate: 96.5,
    defectRate: 0.03,
    velocity: 120,
  };

  const historicalMetrics = [
    { period: 'Sprint 1', spi: 0.92, cpi: 0.98, passRate: 88, defectRate: 0.08, velocity: 100 },
    { period: 'Sprint 2', spi: 0.95, cpi: 1.0, passRate: 92, defectRate: 0.05, velocity: 110 },
    { period: 'Sprint 3', spi: 0.98, cpi: 1.05, passRate: 96.5, defectRate: 0.03, velocity: 120 },
  ];

  // Sample data for Progress Chart
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

  // Sample data for Testing Quality Chart
  const testingData = [
    { week: 'Week 1', passed: 85, failed: 15, passRate: 85.0, defects: 18 },
    { week: 'Week 2', passed: 92, failed: 8, passRate: 92.0, defects: 12 },
    { week: 'Week 3', passed: 95, failed: 5, passRate: 95.0, defects: 8 },
    { week: 'Week 4', passed: 97, failed: 3, passRate: 97.0, defects: 5 },
    { week: 'Week 5', passed: 98, failed: 2, passRate: 98.0, defects: 3 },
    { week: 'Week 6', passed: 96, failed: 4, passRate: 96.0, defects: 6 },
    { week: 'Week 7', passed: 97, failed: 3, passRate: 97.0, defects: 4 },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Enhanced Charts Demo</h1>
        <p className="mt-2 text-gray-600">
          Interactive, customizable charts with advanced features
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Interactive Charts
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Click chart type buttons to switch visualizations</li>
                <li>Hover over data points for detailed tooltips</li>
                <li>Toggle grid and legend with checkboxes</li>
                <li>Export buttons ready for PNG/SVG download</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="space-y-8">
        {/* Metrics Chart */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
            <p className="text-sm text-gray-600">SPI, CPI, Quality, Defect Rate, and Velocity</p>
          </div>
          <EnhancedMetricsChart 
            data={metricsData}
            historicalData={historicalMetrics}
            height={450}
          />
        </Card>

        {/* Metrics with Comparison */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Metrics Comparison</h2>
            <p className="text-sm text-gray-600">Current vs Previous Sprint</p>
          </div>
          <EnhancedMetricsChart 
            data={metricsData}
            showComparison={true}
            comparisonData={{
              spi: 0.85,
              cpi: 0.92,
              passRate: 88,
              defectRate: 0.08,
              velocity: 100,
            }}
            comparisonLabel="Previous Sprint"
            height={450}
          />
        </Card>

        {/* Progress Chart */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Progress Tracking</h2>
            <p className="text-sm text-gray-600">Weekly effort and progress with variance analysis</p>
          </div>
          <EnhancedProgressChart 
            data={progressData}
            showVariance={true}
            showTrendLine={true}
            targetProgress={100}
            height={450}
          />
        </Card>

        {/* Progress Chart - Cumulative View */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Cumulative Effort View</h2>
            <p className="text-sm text-gray-600">Total effort accumulated over time</p>
          </div>
          <EnhancedProgressChart 
            data={progressData}
            showCumulative={true}
            showTrendLine={true}
            height={450}
          />
        </Card>

        {/* Testing Quality Chart */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Testing Quality Analysis</h2>
            <p className="text-sm text-gray-600">Pass rate trends with defects tracking</p>
          </div>
          <EnhancedTestingQualityChart 
            data={testingData}
            showDefects={true}
            showPassRate={true}
            showTrendLine={true}
            targetPassRate={95}
            height={450}
          />
        </Card>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Compact Metrics</h2>
            </div>
            <EnhancedMetricsChart 
              data={metricsData}
              height={350}
            />
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Compact Progress</h2>
            </div>
            <EnhancedProgressChart 
              data={progressData}
              showVariance={true}
              height={350}
            />
          </Card>
        </div>

        {/* Feature Highlights */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Enhanced Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🎨 Multiple Chart Types</h3>
              <p className="text-sm text-gray-600">Switch between 4-5 different chart types per component</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Comparison Mode</h3>
              <p className="text-sm text-gray-600">Compare current data with historical or other datasets</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📈 Trend Lines</h3>
              <p className="text-sm text-gray-600">Linear regression trends to predict future values</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">💾 Export</h3>
              <p className="text-sm text-gray-600">Download charts as PNG or SVG files</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🎯 Reference Lines</h3>
              <p className="text-sm text-gray-600">Show target values and thresholds</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📋 Statistics</h3>
              <p className="text-sm text-gray-600">Auto-calculated summary cards below charts</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
