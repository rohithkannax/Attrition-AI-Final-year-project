'use client';

import React from 'react';
import { Users, UserMinus, AlertTriangle, TrendingUp } from 'lucide-react';
import { EmployeePrediction } from '@/lib/types';

interface SummaryCardsProps {
  predictions: EmployeePrediction[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ predictions }) => {
  const total = predictions.length;
  const resignCount = predictions.filter((p) => p.prediction === 'Will Resign').length;
  const resignPct = total > 0 ? Math.round((resignCount / total) * 100) : 0;

  const highRiskCount = predictions.filter((p) => p.riskScore >= 65).length;
  const highRiskPct = total > 0 ? Math.round((highRiskCount / total) * 100) : 0;

  const avgRisk = total > 0
    ? Math.round(predictions.reduce((acc, p) => acc + p.riskScore, 0) / total)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Employees */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            Total Workforce
          </p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{total}</p>
          <p className="text-xs text-slate-500 mt-1">Evaluated records</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Predicted to Resign */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            Predicted To Resign
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 tracking-tight">{resignCount}</span>
            <span className="text-sm font-semibold text-rose-600/80">({resignPct}%)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Risk probability &ge; 50%</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
          <UserMinus className="w-6 h-6" />
        </div>
      </div>

      {/* High Risk Count */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            Critical Risk Tier
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 tracking-tight">{highRiskCount}</span>
            <span className="text-sm font-semibold text-amber-600/80">({highRiskPct}%)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Risk score &ge; 65%</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* Average Workforce Risk */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            Average Attrition Risk
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{avgRisk}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Workforce risk baseline</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
