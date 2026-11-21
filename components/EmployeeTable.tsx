'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ArrowUpDown,
  Filter,
  AlertCircle,
  Building,
  Briefcase,
  ChevronLeft,
} from 'lucide-react';
import { EmployeePrediction } from '@/lib/types';

interface EmployeeTableProps {
  predictions: EmployeePrediction[];
  onSelectEmployee: (emp: EmployeePrediction) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  predictions,
  onSelectEmployee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictionFilter, setPredictionFilter] = useState<'ALL' | 'RESIGN' | 'STAY'>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MED' | 'LOW'>('ALL');
  const [sortBy, setSortBy] = useState<'RISK_DESC' | 'RISK_ASC' | 'ID_ASC'>('RISK_DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Counts for tabs
  const resignCount = useMemo(
    () => predictions.filter((p) => p.prediction === 'Will Resign').length,
    [predictions]
  );
  const stayCount = predictions.length - resignCount;

  // Filtered and sorted list
  const filteredPredictions = useMemo(() => {
    let result = [...predictions];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        if (p.id.toLowerCase().includes(q)) return true;
        const name = String(p.rawRecord.Name || p.rawRecord.name || '').toLowerCase();
        if (name.includes(q)) return true;
        const dept = String(p.rawRecord.Department || p.rawRecord.department || '').toLowerCase();
        if (dept.includes(q)) return true;
        const role = String(p.rawRecord.JobRole || p.rawRecord.role || '').toLowerCase();
        if (role.includes(q)) return true;
        return false;
      });
    }

    // Prediction filter
    if (predictionFilter === 'RESIGN') {
      result = result.filter((p) => p.prediction === 'Will Resign');
    } else if (predictionFilter === 'STAY') {
      result = result.filter((p) => p.prediction === 'Will Stay');
    }

    // Risk tier filter
    if (riskFilter === 'HIGH') {
      result = result.filter((p) => p.riskScore >= 65);
    } else if (riskFilter === 'MED') {
      result = result.filter((p) => p.riskScore >= 35 && p.riskScore < 65);
    } else if (riskFilter === 'LOW') {
      result = result.filter((p) => p.riskScore < 35);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'RISK_DESC') return b.riskScore - a.riskScore;
      if (sortBy === 'RISK_ASC') return a.riskScore - b.riskScore;
      if (sortBy === 'ID_ASC') return a.id.localeCompare(b.id, undefined, { numeric: true });
      return 0;
    });

    return result;
  }, [predictions, searchQuery, predictionFilter, riskFilter, sortBy]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filteredPredictions.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredPredictions.slice(start, start + pageSize);
  }, [filteredPredictions, activePage, pageSize]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, name, role, department..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* Filter Pills & Sort Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prediction Filter Pills */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setPredictionFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors ${
                predictionFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              All ({predictions.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setPredictionFilter('RESIGN');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors ${
                predictionFilter === 'RESIGN'
                  ? 'bg-rose-50 text-rose-700 shadow-2xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Will Resign ({resignCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setPredictionFilter('STAY');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors ${
                predictionFilter === 'STAY'
                  ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Will Stay ({stayCount})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 hidden sm:inline">Sort:</span>
            <select
              aria-label="Sort employees by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="RISK_DESC">Risk: Highest First</option>
              <option value="RISK_ASC">Risk: Lowest First</option>
              <option value="ID_ASC">Name / ID (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100 text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Employee</th>
              <th className="py-3 px-4">Prediction</th>
              <th className="py-3 px-4">Resignation Risk</th>
              <th className="py-3 px-4">Top Risk Factors</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p>No employees match the active filters.</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((emp) => {
                const name = emp.rawRecord.Name || emp.rawRecord.name || emp.id;
                const dept = emp.rawRecord.Department || emp.rawRecord.department;
                const role = emp.rawRecord.JobRole || emp.rawRecord.role;
                const isResigning = emp.prediction === 'Will Resign';

                // Risk progress bar color
                const riskBarColor =
                  emp.riskScore >= 65
                    ? 'bg-rose-500'
                    : emp.riskScore >= 35
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                const riskBadgeColor =
                  emp.riskScore >= 65
                    ? 'text-rose-700 bg-rose-50 border-rose-100'
                    : emp.riskScore >= 35
                    ? 'text-amber-700 bg-amber-50 border-amber-100'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-100';

                return (
                  <tr
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp)}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Employee info */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors shrink-0">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-mono">{emp.id}</span>
                            {role && <span className="truncate max-w-[140px]">&bull; {role}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Prediction Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isResigning
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isResigning ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        />
                        {emp.prediction}
                      </span>
                    </td>

                    {/* Risk % and bar */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="w-36">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold font-mono text-slate-800">
                            {emp.riskScore}%
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${riskBadgeColor}`}
                          >
                            {emp.riskScore >= 65 ? 'High' : emp.riskScore >= 35 ? 'Med' : 'Low'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${riskBarColor}`}
                            style={{ width: `${Math.max(4, emp.riskScore)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Top 2 risk factors */}
                    <td className="py-3.5 px-4">
                      {emp.topRiskFactors.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {emp.topRiskFactors.slice(0, 2).map((factor, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/70 truncate max-w-[140px]"
                              title={`${factor.featureName}: ${factor.employeeValue} (vs ${factor.datasetAverage})`}
                            >
                              {factor.featureName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Balanced indicators</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-indigo-600 transition-colors">
                        Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {filteredPredictions.length > pageSize && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(activePage - 1) * pageSize + 1} to{' '}
            {Math.min(activePage * pageSize, filteredPredictions.length)} of{' '}
            {filteredPredictions.length} employees
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {activePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
