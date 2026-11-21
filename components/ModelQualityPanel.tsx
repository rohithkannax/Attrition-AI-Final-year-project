'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Info, CheckCircle2, Sparkles } from 'lucide-react';
import { ModelMetrics } from '@/lib/types';

interface ModelQualityPanelProps {
  metrics?: ModelMetrics;
  mode: 'A' | 'B';
  modeBNotice?: string;
}

export const ModelQualityPanel: React.FC<ModelQualityPanelProps> = ({
  metrics,
  mode,
  modeBNotice,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (mode === 'B') {
    return (
      <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-indigo-950">
            Mode B: Gemini AI Pattern Risk Estimation
          </p>
          <p className="text-indigo-800/90 mt-0.5 leading-relaxed">
            {modeBNotice ||
              'These scores are estimated directly by Gemini based on HR retention patterns (workload, compensation, tenure, progression velocity). Because historical resignation outcomes were not labeled in this dataset, no supervised validation metrics are available.'}
          </p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-900">
              Model Quality &amp; Validation (5-Fold Stratified CV)
            </span>
            <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
              Out-of-fold metrics across {metrics.sampleCount} rows
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span className="text-slate-500">ROC-AUC:</span>
            <span className="font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
              {metrics.rocAuc.toFixed(3)}
            </span>
            <span className="text-slate-500 ml-1">F1:</span>
            <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold">
              {metrics.f1Score.toFixed(3)}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 text-xs sm:text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
            {/* Accuracy */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block">Accuracy</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {(metrics.accuracy * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400">Overall correct</span>
            </div>

            {/* Precision */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block">Precision</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {(metrics.precision * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400">True alarms / flags</span>
            </div>

            {/* Recall */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block">Recall</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {(metrics.recall * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400">Resignations caught</span>
            </div>

            {/* F1 Score */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block">F1 Score</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {metrics.f1Score.toFixed(3)}
              </span>
              <span className="text-[11px] text-slate-400">Harmonic balance</span>
            </div>

            {/* ROC-AUC */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 block">ROC-AUC</span>
              <span className="text-lg font-bold text-emerald-600 font-mono mt-0.5 block">
                {metrics.rocAuc.toFixed(3)}
              </span>
              <span className="text-[11px] text-slate-400">Rank discrimination</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Unbiased Out-Of-Fold Validation: Every employee prediction score was generated by a model fold that never saw that employee during training.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
