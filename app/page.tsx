'use client';

import React, { useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { UploadArea } from '@/components/UploadArea';
import { SchemaConfigBar } from '@/components/SchemaConfigBar';
import { SummaryCards } from '@/components/SummaryCards';
import { ModelQualityPanel } from '@/components/ModelQualityPanel';
import { EmployeeTable } from '@/components/EmployeeTable';
import { EmployeeDetailModal } from '@/components/EmployeeDetailModal';
import {
  AIExplanationResponse,
  EmployeePrediction,
  ModelMetrics,
  RawRow,
  SchemaDetectionResult,
} from '@/lib/types';
import { parseFileToRows, detectSchema } from '@/lib/parser';
import { trainAndEvaluateOutOfFold } from '@/lib/ml';
import { generateSampleEmployees } from '@/lib/sample-data';
import Papa from 'papaparse';

export default function Home() {
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [schema, setSchema] = useState<SchemaDetectionResult | null>(null);
  const [predictions, setPredictions] = useState<EmployeePrediction[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | undefined>(undefined);
  const [mode, setMode] = useState<'A' | 'B'>('A');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePrediction | null>(null);
  const [explanationsCache, setExplanationsCache] = useState<Record<string, AIExplanationResponse>>({});

  // Core pipeline to process dataset given rows and selected target
  const processDataset = useCallback(
    async (datasetRows: RawRow[], userTarget?: string | null) => {
      setIsProcessing(true);
      setErrorMessage(null);
      setProcessingStatus('Analyzing schema and column structures...');

      try {
        if (!datasetRows || datasetRows.length === 0) {
          throw new Error('Dataset contains no valid records.');
        }

        const detected = detectSchema(datasetRows, userTarget);
        setSchema(detected);

        const rowCount = datasetRows.length;
        const target = detected.targetColumn;
        const targetMeta = detected.columns.find((c) => c.name === target);
        const isMulticlass = targetMeta ? targetMeta.uniqueCount > 2 : false;
        const isUnder50 = rowCount < 50;

        // Determine Mode A or Mode B
        if (target && !isMulticlass && !isUnder50) {
          // MODE A: In-browser 5-fold cross-validated logistic regression
          setProcessingStatus('Training 5-fold cross-validated model in browser...');
          setMode('A');

          // Yield to let UI update
          await new Promise((resolve) => setTimeout(resolve, 50));

          const { predictions: mlPredictions, metrics: mlMetrics } = trainAndEvaluateOutOfFold(
            detected,
            datasetRows
          );

          setPredictions(mlPredictions);
          setMetrics(mlMetrics);
        } else {
          // MODE B: Gemini AI batch estimation
          setMode('B');
          setMetrics(undefined);
          setProcessingStatus(
            isUnder50 && target
              ? 'Dataset has under 50 rows. Estimating risk scores with Gemini AI...'
              : 'Estimating risk scores using Gemini AI HR pattern models...'
          );

          // Batch score in groups of 25
          const batchSize = 25;
          const allBatchResults: any[] = [];
          const idCol = detected.idColumn;

          for (let i = 0; i < datasetRows.length; i += batchSize) {
            const batch = datasetRows.slice(i, i + batchSize);
            setProcessingStatus(
              `Scoring employees with Gemini AI (${Math.min(i + batchSize, datasetRows.length)} / ${datasetRows.length})...`
            );

            const res = await fetch('/api/gemini/batch-risk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employees: batch,
                idColumn: idCol,
              }),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Batch risk scoring failed (${res.status})`);
            }

            const data = await res.json();
            allBatchResults.push(...(data.results || []));
          }

          // Build Mode B predictions
          const modeBPredictions: EmployeePrediction[] = datasetRows.map((row, idx) => {
            const idVal = idCol && row[idCol] !== undefined ? String(row[idCol]) : `EMP-${idx + 1}`;
            const scoredItem = allBatchResults.find((r) => String(r.id) === idVal) || allBatchResults[idx];
            const riskScore = scoredItem ? Math.min(100, Math.max(0, scoredItem.risk_score)) : 40;
            const pred = riskScore >= 50 ? 'Will Resign' : 'Will Stay';

            const topFactors = (scoredItem?.top_factors || []).map((factorStr: string) => ({
              featureName: factorStr,
              originalColumn: 'HR Indicator',
              employeeValue: 'Identified',
              datasetAverage: 'Standard',
              contributionScore: 0.5,
              direction: 'increases_risk' as const,
              humanSummary: factorStr,
            }));

            return {
              id: idVal,
              originalRowIndex: idx,
              rawRecord: row,
              riskScore,
              prediction: pred,
              topRiskFactors: topFactors,
              topProtectiveFactors: [],
              aiReason: scoredItem?.reason,
              mode: 'B',
            };
          });

          // Sort highest risk first
          modeBPredictions.sort((a, b) => b.riskScore - a.riskScore);
          setPredictions(modeBPredictions);
        }
      } catch (err: any) {
        console.error('Processing error:', err);
        setErrorMessage(err.message || 'An unexpected error occurred while analyzing the data.');
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    []
  );

  // File upload handler
  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus('Parsing file in browser...');

    try {
      const parsedRows = await parseFileToRows(file);
      setRows(parsedRows);
      await processDataset(parsedRows);
    } catch (err: any) {
      console.error('File parse error:', err);
      setErrorMessage(err.message || 'Could not parse the uploaded file. Please verify CSV/XLSX structure.');
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Sample data button handler
  const handleLoadSampleData = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    const sample = generateSampleEmployees();
    setRows(sample);
    await processDataset(sample);
  };

  // Target outcome change dropdown
  const handleTargetChange = async (newTarget: string | null) => {
    if (!rows) return;
    await processDataset(rows, newTarget);
  };

  // Reset to upload screen
  const handleReset = () => {
    setRows(null);
    setSchema(null);
    setPredictions([]);
    setMetrics(undefined);
    setSelectedEmployee(null);
    setErrorMessage(null);
  };

  // Download results CSV
  const handleExportCsv = () => {
    if (predictions.length === 0) return;

    const exportData = predictions.map((p) => {
      const name = p.rawRecord.Name || p.rawRecord.name || '';
      return {
        EmployeeID: p.id,
        Name: name,
        Prediction: p.prediction,
        ResignationRiskPercent: p.riskScore,
        TopFactor1: p.topRiskFactors[0]?.featureName || '',
        TopFactor2: p.topRiskFactors[1]?.featureName || '',
        AnalysisMode: p.mode === 'A' ? 'ML Out-Of-Fold Model' : 'Gemini AI Estimation',
        ...p.rawRecord,
      };
    });

    const csvString = Papa.unparse(exportData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'attrition_predictions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cache handler for employee explanation
  const handleSaveExplanationCache = (id: string, explanation: AIExplanationResponse) => {
    setExplanationsCache((prev) => ({
      ...prev,
      [id]: explanation,
    }));
  };

  const hasData = rows !== null && rows.length > 0 && predictions.length > 0;
  const isMulticlass =
    schema && schema.targetColumn
      ? (schema.columns.find((c) => c.name === schema.targetColumn)?.uniqueCount || 0) > 2
      : false;
  const isSmallDataset = rows ? rows.length < 50 : false;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        hasData={hasData}
        onReset={handleReset}
        onExportCsv={handleExportCsv}
        rowCount={rows?.length}
        mode={mode}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 z-40 bg-white/90 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-base font-semibold text-slate-800 tracking-tight">
              {processingStatus || 'Analyzing workforce data...'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Processing client-side machine learning &amp; schema detection
            </p>
          </div>
        )}

        {!hasData ? (
          <UploadArea
            onFileSelected={handleFileSelected}
            onLoadSampleData={handleLoadSampleData}
            isLoading={isProcessing}
            errorMessage={errorMessage}
          />
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Schema & Target Configuration Bar */}
            {schema && (
              <SchemaConfigBar
                schema={schema}
                onTargetChange={handleTargetChange}
                isMulticlassTarget={isMulticlass}
                isSmallDataset={isSmallDataset}
                mode={mode}
              />
            )}

            {/* Dashboard Results Section */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
              {/* Summary Metric Cards */}
              <SummaryCards predictions={predictions} />

              {/* Model Quality & Validation Panel */}
              <ModelQualityPanel
                metrics={metrics}
                mode={mode}
                modeBNotice={
                  isSmallDataset
                    ? 'Because this dataset has fewer than 50 records, Gemini pattern estimation is applied directly rather than training on a small sample.'
                    : undefined
                }
              />

              {/* Employee Predictions Table */}
              <EmployeeTable
                predictions={predictions}
                onSelectEmployee={(emp) => setSelectedEmployee(emp)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Lazy Employee Detail Side Drawer / Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          cachedExplanation={explanationsCache[selectedEmployee.id]}
          onSaveExplanationCache={handleSaveExplanationCache}
        />
      )}
    </div>
  );
}
