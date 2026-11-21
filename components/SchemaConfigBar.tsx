'use client';

import React from 'react';
import { Settings2, AlertTriangle, Info, Sparkles, CheckCircle2 } from 'lucide-react';
import { SchemaDetectionResult } from '@/lib/types';

interface SchemaConfigBarProps {
  schema: SchemaDetectionResult;
  onTargetChange: (newTarget: string | null) => void;
  isMulticlassTarget?: boolean;
  isSmallDataset?: boolean;
  mode: 'A' | 'B';
}

export const SchemaConfigBar: React.FC<SchemaConfigBarProps> = ({
  schema,
  onTargetChange,
  isMulticlassTarget = false,
  isSmallDataset = false,
  mode,
}) => {
  const allColumns = schema.columns.map((c) => c.name);

  return (
    <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Target column selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              Target Outcome:
            </span>
            <select
              aria-label="Select target outcome column"
              value={schema.targetColumn || '__none__'}
              onChange={(e) => {
                const val = e.target.value === '__none__' ? null : e.target.value;
                onTargetChange(val);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {schema.columns
                .filter((c) => !c.isConstant)
                .map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} {col.name === schema.targetColumn ? '(Detected)' : ''}
                  </option>
                ))}
              <option value="__none__">None (Mode B: Gemini AI Risk Estimation)</option>
            </select>
          </div>

          {/* Identifier column info */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>ID Column:</span>
            <span className="font-medium text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              {schema.idColumn || 'Row Number (#1, #2...)'}
            </span>
          </div>

          {/* Features count */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Active Features:</span>
            <span className="font-medium text-slate-700">
              {schema.usableFeatureColumns.length} columns
            </span>
          </div>
        </div>

        {/* Mode & Notice indicator */}
        <div className="flex items-center gap-2">
          {isSmallDataset && (
            <div className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Dataset &lt; 50 rows. Running Mode B (Gemini AI zero-shot estimation).</span>
            </div>
          )}

          {isMulticlassTarget && (
            <div className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Selected target has &gt; 2 categories. Binary target recommended.</span>
            </div>
          )}

          {!isSmallDataset && !isMulticlassTarget && mode === 'A' && (
            <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mode A: 5-Fold Cross-Validation Active</span>
            </div>
          )}

          {!isSmallDataset && mode === 'B' && (
            <div className="inline-flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mode B: Gemini Zero-Shot Risk Scoring</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
