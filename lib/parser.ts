import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnMeta, ColumnType, RawRow, SchemaDetectionResult } from './types';

const COMMON_ID_NAMES = [
  'id',
  'empid',
  'emp_id',
  'employee_id',
  'employeeid',
  'emp_no',
  'employeeno',
  'name',
  'employee_name',
  'emp_name',
  'fullname',
  'full_name',
  'email',
  'staff_id',
];

const COMMON_TARGET_NAMES = [
  'attrition',
  'left',
  'resigned',
  'turnover',
  'exited',
  'churn',
  'status',
  'quit',
  'is_left',
  'has_left',
  'will_resign',
];

const POSITIVE_LABELS = new Set([
  'yes',
  '1',
  'true',
  'left',
  'resigned',
  'exited',
  'quit',
  'churned',
  'positive',
]);

const NEGATIVE_LABELS = new Set([
  'no',
  '0',
  'false',
  'stayed',
  'active',
  'retained',
  'negative',
  'current',
  'employed',
]);

/**
 * Checks if a string looks like an ISO date or standard date
 */
function isDateString(val: string): boolean {
  if (typeof val !== 'string' || val.trim().length < 8) return false;
  // Exclude simple numbers
  if (!isNaN(Number(val))) return false;
  const parsed = Date.parse(val);
  return !isNaN(parsed) && /[-/:]/.test(val);
}

/**
 * Infer the best type for a column given sample values
 */
export function inferColumnType(values: any[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length === 0) return 'categorical';

  let numericCount = 0;
  let booleanCount = 0;
  let dateCount = 0;

  for (const v of nonNull) {
    if (typeof v === 'boolean') {
      booleanCount++;
      continue;
    }
    const str = String(v).trim().toLowerCase();
    if (str === 'true' || str === 'false' || str === 'yes' || str === 'no') {
      booleanCount++;
      continue;
    }
    if (isDateString(String(v))) {
      dateCount++;
      continue;
    }
    if (!isNaN(Number(str))) {
      numericCount++;
      continue;
    }
  }

  const total = nonNull.length;
  if (booleanCount / total >= 0.85) return 'boolean';
  if (numericCount / total >= 0.85) return 'numeric';
  if (dateCount / total >= 0.85) return 'date';
  return 'categorical';
}

/**
 * Parse raw file (CSV or XLSX) into an array of objects
 */
export async function parseFileToRows(file: File): Promise<RawRow[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('The Excel workbook contains no sheets.');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
    if (!rows || rows.length === 0) {
      throw new Error('The uploaded Excel file contains no data rows.');
    }
    return rows;
  }

  // Otherwise handle as CSV or text
  const text = await file.text();
  return parseCsvStringToRows(text);
}

/**
 * Parse CSV string into array of objects
 */
export function parseCsvStringToRows(csvText: string): RawRow[] {
  if (!csvText || !csvText.trim()) {
    throw new Error('The CSV file is empty.');
  }

  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false, // Keep as strings initially for robust type inference
  });

  if (result.errors && result.errors.length > 0 && (!result.data || result.data.length === 0)) {
    throw new Error(`Failed to parse CSV: ${result.errors[0]?.message || 'Unknown syntax error'}`);
  }

  // Filter out any rows that have no keys or all empty values
  const rows = result.data.filter((r) => {
    const keys = Object.keys(r);
    return keys.length > 0 && keys.some((k) => r[k] !== undefined && String(r[k]).trim() !== '');
  });

  if (rows.length === 0) {
    throw new Error('The CSV contains no valid data rows.');
  }

  return rows;
}

/**
 * Detect schema, identifying column types, ID column, target column, and usable features
 */
export function detectSchema(rows: RawRow[], userSpecifiedTarget?: string | null): SchemaDetectionResult {
  if (!rows || rows.length === 0) {
    throw new Error('Cannot detect schema on empty dataset.');
  }

  const allColumns = Object.keys(rows[0]);
  const rowCount = rows.length;
  const columnMetas: ColumnMeta[] = [];

  for (const col of allColumns) {
    const values = rows.map((r) => r[col]);
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const uniqueValues = Array.from(new Set(nonNullValues.map((v) => String(v).trim())));
    const type = inferColumnType(values);

    const isConstant = uniqueValues.length <= 1;
    const isIdLike =
      !isConstant &&
      type !== 'numeric' &&
      uniqueValues.length >= rowCount * 0.95 &&
      rowCount >= 10;

    columnMetas.push({
      name: col,
      type,
      uniqueCount: uniqueValues.length,
      missingCount: rowCount - nonNullValues.length,
      sampleValues: uniqueValues.slice(0, 5),
      isConstant,
      isIdLike,
    });
  }

  // 1. Detect ID column candidate
  const candidateIds: string[] = [];
  for (const meta of columnMetas) {
    const lowerName = meta.name.toLowerCase().replace(/[\s_-]/g, '');
    if (COMMON_ID_NAMES.some((idName) => lowerName === idName.replace(/[\s_-]/g, ''))) {
      candidateIds.push(meta.name);
    } else if (meta.isIdLike && (lowerName.includes('id') || lowerName.includes('name') || lowerName.includes('code'))) {
      candidateIds.push(meta.name);
    }
  }

  const idColumn = candidateIds.length > 0 ? candidateIds[0] : null;

  // 2. Detect Target column candidate
  const candidateTargets: string[] = [];
  for (const meta of columnMetas) {
    const lowerName = meta.name.toLowerCase().replace(/[\s_-]/g, '');
    const isTargetName = COMMON_TARGET_NAMES.some((tgt) => lowerName.includes(tgt.replace(/[\s_-]/g, '')));

    // A target column should have 2 distinct classes (or at most binary)
    if (meta.uniqueCount === 2) {
      if (isTargetName) {
        candidateTargets.unshift(meta.name);
      } else {
        // Check if values look like positive/negative labels
        const samples = meta.sampleValues.map((s) => String(s).toLowerCase().trim());
        const hasPos = samples.some((s) => POSITIVE_LABELS.has(s));
        const hasNeg = samples.some((s) => NEGATIVE_LABELS.has(s));
        if (hasPos || hasNeg) {
          candidateTargets.push(meta.name);
        }
      }
    } else if (isTargetName && meta.uniqueCount > 2) {
      // Potentially multiclass target name
      candidateTargets.push(meta.name);
    }
  }

  // Use userSpecifiedTarget if valid, else first candidateTarget, else null
  let finalTargetColumn: string | null = null;
  if (userSpecifiedTarget !== undefined) {
    finalTargetColumn = userSpecifiedTarget;
  } else if (candidateTargets.length > 0) {
    finalTargetColumn = candidateTargets[0];
  }

  // Identify positive class for target column
  let detectedPositiveClass: string | null = null;
  if (finalTargetColumn) {
    const targetMeta = columnMetas.find((c) => c.name === finalTargetColumn);
    if (targetMeta) {
      const vals = targetMeta.sampleValues.map((v) => String(v).trim());
      for (const val of vals) {
        if (POSITIVE_LABELS.has(val.toLowerCase())) {
          detectedPositiveClass = val;
          break;
        }
      }
      // If none explicitly matched positive labels, pick the less frequent class as positive (attrition is usually minority)
      if (!detectedPositiveClass && targetMeta.uniqueCount === 2) {
        const counts: Record<string, number> = {};
        for (const row of rows) {
          const v = String(row[finalTargetColumn] ?? '').trim();
          if (v) counts[v] = (counts[v] || 0) + 1;
        }
        const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
        detectedPositiveClass = sorted[0]?.[0] || vals[0] || null;
      }
    }
  }

  // Usable feature columns:
  // Drop constant columns, drop ID column, drop target column, drop high-cardinality ID-like columns
  const usableFeatureColumns = columnMetas
    .filter((col) => {
      if (col.isConstant) return false;
      if (col.name === idColumn) return false;
      if (col.name === finalTargetColumn) return false;
      if (col.isIdLike) return false;
      return true;
    })
    .map((c) => c.name);

  return {
    columns: columnMetas,
    idColumn,
    targetColumn: finalTargetColumn,
    detectedPositiveClass,
    candidateTargets,
    candidateIds,
    usableFeatureColumns,
    rowCount,
  };
}
