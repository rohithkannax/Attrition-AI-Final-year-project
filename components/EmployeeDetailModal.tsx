'use client';

import React, { useEffect, useState, useId } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Lightbulb,
  Building,
  Briefcase,
  Layers,
} from 'lucide-react';
import { AIExplanationResponse, EmployeePrediction } from '@/lib/types';

interface EmployeeDetailModalProps {
  employee: EmployeePrediction | null;
  onClose: () => void;
  cachedExplanation?: AIExplanationResponse | null;
  onSaveExplanationCache: (id: string, explanation: AIExplanationResponse) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  onClose,
  cachedExplanation,
  onSaveExplanationCache,
}) => {
  const [loading, setLoading] = useState<boolean>(!cachedExplanation);
  const [error, setError] = useState<string | null>(null);
  const [fetchedExplanation, setFetchedExplanation] = useState<AIExplanationResponse | null>(null);

  const titleId = useId();
  const descId = useId();

  const explanation = cachedExplanation || fetchedExplanation;

  // Fetch explanation only if not already cached
  useEffect(() => {
    if (!employee || cachedExplanation) {
      return;
    }

    let isCancelled = false;

    const runFetch = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/gemini/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: employee.id,
            prediction: employee.prediction,
            riskScore: employee.riskScore,
            rawRecord: employee.rawRecord,
            topRiskFactors: employee.topRiskFactors,
            topProtectiveFactors: employee.topProtectiveFactors,
            mode: employee.mode,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned error ${res.status}`);
        }
        const data = await res.json();
        if (isCancelled) return;

        const result: AIExplanationResponse = {
          overview: data.overview,
          factorsAnalysis: data.factorsAnalysis,
          retentionActions: data.retentionActions || [],
        };
        setFetchedExplanation(result);
        onSaveExplanationCache(employee.id, result);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to fetch explanation:', err);
        setError(err.message || 'Could not generate AI explanation. Please check connection or retry.');
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    // Schedule async task to avoid synchronous state update in effect body
    const timer = setTimeout(runFetch, 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [employee, cachedExplanation, onSaveExplanationCache]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!employee) return null;

  const isResigning = employee.prediction === 'Will Resign';
  const riskColor =
    employee.riskScore >= 65
      ? 'text-rose-600 bg-rose-50 border-rose-200'
      : employee.riskScore >= 35
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  const riskBarBg =
    employee.riskScore >= 65
      ? 'bg-rose-500'
      : employee.riskScore >= 35
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  // Merge top risk and protective factors for the factors chart
  const allFactors = [...employee.topRiskFactors, ...employee.topProtectiveFactors].slice(0, 6);
  const maxAbsScore = Math.max(0.1, ...allFactors.map((f) => Math.abs(f.contributionScore)));

  const dept =
    employee.rawRecord.Department || employee.rawRecord.department || employee.rawRecord.Dept;
  const role =
    employee.rawRecord.JobRole ||
    employee.rawRecord.role ||
    employee.rawRecord.Position ||
    employee.rawRecord.Title;

  // Clean error message parser
  let cleanErrorMessage = error;
  if (error && error.includes('{')) {
    try {
      const parsedErr = JSON.parse(error);
      cleanErrorMessage = parsedErr?.error?.message || parsedErr?.message || error;
    } catch {
      // keep as is
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/35 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span id={titleId} className="text-xl font-bold text-slate-900 tracking-tight">
                {employee.rawRecord.Name || employee.rawRecord.name || employee.id}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${riskColor}`}
              >
                {employee.prediction}
              </span>
            </div>
            <div id={descId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
              <span>ID: <span className="font-mono text-slate-700">{employee.id}</span></span>
              {dept && (
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  {dept}
                </span>
              )}
              {role && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-400" />
                  {role}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Risk Gauge Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Resignation Probability
              </span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {employee.riskScore}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${riskBarBg}`}
                style={{ width: `${Math.max(4, employee.riskScore)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
              <span>0% Low Risk</span>
              <span>50% Threshold</span>
              <span>100% Critical</span>
            </div>
          </div>

          {/* AI Overview Section */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">AI Overview &amp; Reasoning</h4>
              </div>
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Gemini Grounded
              </span>
            </div>

            {loading && (
              <div className="space-y-2 py-1 animate-pulse">
                <div className="h-3.5 bg-indigo-200/50 rounded w-full" />
                <div className="h-3.5 bg-indigo-200/50 rounded w-5/6" />
                <div className="h-3.5 bg-indigo-200/50 rounded w-4/6" />
              </div>
            )}

            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Notice</p>
                    <p className="text-rose-600 mt-0.5 leading-relaxed">{cleanErrorMessage}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setLoading(true);
                        fetch('/api/gemini/explain', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            employeeId: employee.id,
                            prediction: employee.prediction,
                            riskScore: employee.riskScore,
                            rawRecord: employee.rawRecord,
                            topRiskFactors: employee.topRiskFactors,
                            topProtectiveFactors: employee.topProtectiveFactors,
                            mode: employee.mode,
                          }),
                        })
                          .then((r) => r.json())
                          .then((d) => {
                            if (d.error) throw new Error(d.error);
                            setFetchedExplanation(d);
                            onSaveExplanationCache(employee.id, d);
                          })
                          .catch((e) => setError(e.message))
                          .finally(() => setLoading(false));
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Retry Generation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading && explanation && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>{explanation.overview}</p>
                {explanation.factorsAnalysis && (
                  <p className="text-xs text-slate-500 italic bg-white/70 p-2.5 rounded-xl border border-slate-100">
                    {explanation.factorsAnalysis}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Key Factors Mini Bar Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                Key Contributing Factors
              </h4>
              <span className="text-xs text-slate-400">Impact on risk score</span>
            </div>

            {allFactors.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No specific outlier factors detected.</p>
            ) : (
              <div className="space-y-2.5">
                {allFactors.map((factor, idx) => {
                  const isRisk = factor.direction === 'increases_risk';
                  const pct = Math.round((Math.abs(factor.contributionScore) / maxAbsScore) * 100);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-slate-800">
                          {factor.featureName}
                        </span>
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isRisk ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isRisk ? (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              Increases Risk
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3" />
                              Protective
                            </>
                          )}
                        </span>
                      </div>

                      {/* Factor Comparison Bar */}
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${isRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Value:{' '}
                          <span className="font-semibold text-slate-700">
                            {factor.employeeValue}
                          </span>
                        </span>
                        <span>
                          Dataset Benchmark:{' '}
                          <span className="font-semibold text-slate-700">
                            {factor.datasetAverage}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Suggested Retention Actions */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Suggested Retention Actions
            </h4>

            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <div className="h-3 bg-slate-100 rounded w-4/6" />
              </div>
            ) : explanation?.retentionActions && explanation.retentionActions.length > 0 ? (
              <ul className="space-y-2.5">
                {explanation.retentionActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Initiate manager 1-on-1 to review workload distribution and growth goals.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Benchmark compensation and recognition milestones against role expectations.</span>
                </li>
              </ul>
            )}
          </div>

          {/* Full Record Attributes Table */}
          <div className="border-t border-slate-100 pt-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              All Employee Attributes
            </h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(employee.rawRecord).map(([key, val]) => (
                <div key={key} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">{key}</span>
                  <span className="font-medium text-slate-800 break-all">{String(val ?? 'N/A')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
