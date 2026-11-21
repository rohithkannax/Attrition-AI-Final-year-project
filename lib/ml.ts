import { EmployeePrediction, FeatureContribution, ModelMetrics, RawRow, SchemaDetectionResult } from './types';

export interface PreprocessedFeatureInfo {
  name: string;
  originalColumn: string;
  type: 'numeric' | 'categorical_one_hot' | 'boolean';
  categoryValue?: string;
  mean: number;
  std: number;
  originalMean?: number;
  originalMode?: string;
}

export interface TrainingData {
  X: number[][]; // [samples, features]
  y: number[];   // [samples] (0 or 1)
  featureInfos: PreprocessedFeatureInfo[];
  rawRows: RawRow[];
}

/**
 * Robust Logistic Regression with L2 Regularization, class weighting, and momentum GD
 */
export class LogisticRegressionModel {
  weights: number[] = [];
  bias: number = 0;
  l2Reg: number = 0.01;
  learningRate: number = 0.1;
  maxEpochs: number = 250;

  constructor(options?: { l2Reg?: number; learningRate?: number; maxEpochs?: number }) {
    if (options?.l2Reg !== undefined) this.l2Reg = options.l2Reg;
    if (options?.learningRate !== undefined) this.learningRate = options.learningRate;
    if (options?.maxEpochs !== undefined) this.maxEpochs = options.maxEpochs;
  }

  fit(X: number[][], y: number[], classWeights?: { 0: number; 1: number }) {
    const numSamples = X.length;
    if (numSamples === 0) return;
    const numFeatures = X[0].length;

    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    // Default class weights: inverse frequency
    let w0 = 1;
    let w1 = 1;
    if (classWeights) {
      w0 = classWeights[0];
      w1 = classWeights[1];
    } else {
      const posCount = y.filter((val) => val === 1).length;
      const negCount = numSamples - posCount;
      if (posCount > 0 && negCount > 0) {
        w1 = numSamples / (2 * posCount);
        w0 = numSamples / (2 * negCount);
      }
    }

    const vWeights = new Array(numFeatures).fill(0);
    let vBias = 0;
    const momentum = 0.9;
    const lr = this.learningRate;

    for (let epoch = 0; epoch < this.maxEpochs; epoch++) {
      const gradW = new Array(numFeatures).fill(0);
      let gradB = 0;
      let totalWeight = 0;

      for (let i = 0; i < numSamples; i++) {
        const xi = X[i];
        const yi = y[i];
        const sampleWeight = yi === 1 ? w1 : w0;
        totalWeight += sampleWeight;

        // z = w dot x + b
        let z = this.bias;
        for (let j = 0; j < numFeatures; j++) {
          z += this.weights[j] * xi[j];
        }

        // Sigmoid with numerical stability
        const pred = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
        const error = (pred - yi) * sampleWeight;

        for (let j = 0; j < numFeatures; j++) {
          gradW[j] += error * xi[j];
        }
        gradB += error;
      }

      if (totalWeight === 0) totalWeight = 1;

      // Update with momentum and L2 regularization
      for (let j = 0; j < numFeatures; j++) {
        const dw = gradW[j] / totalWeight + this.l2Reg * this.weights[j];
        vWeights[j] = momentum * vWeights[j] - lr * dw;
        this.weights[j] += vWeights[j];
      }
      const db = gradB / totalWeight;
      vBias = momentum * vBias - lr * db;
      this.bias += vBias;
    }
  }

  predictProba(x: number[]): number {
    let z = this.bias;
    for (let j = 0; j < this.weights.length; j++) {
      z += this.weights[j] * (x[j] ?? 0);
    }
    return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
  }

  getFeatureContributions(x: number[], featureInfos: PreprocessedFeatureInfo[]): {
    featureInfo: PreprocessedFeatureInfo;
    contribution: number;
  }[] {
    return featureInfos.map((info, idx) => ({
      featureInfo: info,
      contribution: (this.weights[idx] ?? 0) * (x[idx] ?? 0),
    }));
  }
}

/**
 * Prepares and preprocesses raw dataset rows into numerical matrices
 */
export function prepareFeatures(
  rows: RawRow[],
  usableFeatureColumns: string[],
  columnTypes: Record<string, string>,
  targetColumn?: string | null,
  positiveClass?: string | null
): TrainingData {
  const numRows = rows.length;

  // 1. Compute missing imputation stats (median for numeric, mode for categorical)
  const numericStats: Record<string, { median: number; mean: number; std: number }> = {};
  const categoricalModes: Record<string, string> = {};
  const categoricalCategories: Record<string, string[]> = {};

  for (const col of usableFeatureColumns) {
    const type = columnTypes[col];
    const vals = rows.map((r) => r[col]);

    if (type === 'numeric') {
      const nums = vals
        .map((v) => (v !== null && v !== undefined && String(v).trim() !== '' ? Number(v) : NaN))
        .filter((n) => !isNaN(n));

      if (nums.length === 0) {
        numericStats[col] = { median: 0, mean: 0, std: 1 };
      } else {
        nums.sort((a, b) => a - b);
        const mid = Math.floor(nums.length / 2);
        const median = nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((acc, val) => acc + (val - mean) ** 2, 0) / (nums.length || 1);
        const std = Math.sqrt(variance) || 1;
        numericStats[col] = { median, mean, std };
      }
    } else {
      // Categorical or boolean
      const counts: Record<string, number> = {};
      for (const v of vals) {
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          const str = String(v).trim();
          counts[str] = (counts[str] || 0) + 1;
        }
      }
      const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      categoricalModes[col] = sortedEntries[0]?.[0] || 'Unknown';

      // Keep top categories to prevent explosion (limit to top 10 most frequent)
      const topCats = sortedEntries.slice(0, 10).map((e) => e[0]);
      categoricalCategories[col] = topCats;
    }
  }

  // 2. Build feature info definitions
  const featureInfos: PreprocessedFeatureInfo[] = [];

  for (const col of usableFeatureColumns) {
    const type = columnTypes[col];
    if (type === 'numeric') {
      featureInfos.push({
        name: col,
        originalColumn: col,
        type: 'numeric',
        mean: 0, // standardized mean is 0
        std: 1,
        originalMean: numericStats[col].mean,
      });
    } else {
      const cats = categoricalCategories[col] || [];
      // If binary category, just 1 dummy is sufficient, but for explicitness we encode each top category
      for (const cat of cats) {
        featureInfos.push({
          name: `${col}: ${cat}`,
          originalColumn: col,
          type: 'categorical_one_hot',
          categoryValue: cat,
          mean: 0,
          std: 1,
          originalMode: categoricalModes[col],
        });
      }
    }
  }

  // 3. Transform rows into scaled X matrix
  const X: number[][] = [];
  for (let i = 0; i < numRows; i++) {
    const row = rows[i];
    const xVec: number[] = [];

    for (const info of featureInfos) {
      const rawVal = row[info.originalColumn];

      if (info.type === 'numeric') {
        let num = Number(rawVal);
        if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '' || isNaN(num)) {
          num = numericStats[info.originalColumn].median;
        }
        // Scale: (x - mean) / std
        const std = numericStats[info.originalColumn].std;
        const mean = numericStats[info.originalColumn].mean;
        const z = (num - mean) / std;
        xVec.push(z);
      } else {
        // Categorical one-hot
        let catStr = String(rawVal ?? '').trim();
        if (!catStr) {
          catStr = categoricalModes[info.originalColumn];
        }
        // One-hot binary (1 or 0)
        const isMatch = catStr.toLowerCase() === (info.categoryValue || '').toLowerCase() ? 1 : 0;
        xVec.push(isMatch);
      }
    }
    X.push(xVec);
  }

  // 4. Target variable extraction
  const y: number[] = [];
  if (targetColumn && positiveClass) {
    const posLower = positiveClass.toLowerCase();
    for (let i = 0; i < numRows; i++) {
      const targetVal = String(rows[i][targetColumn] ?? '').trim().toLowerCase();
      y.push(targetVal === posLower ? 1 : 0);
    }
  }

  return { X, y, featureInfos, rawRows: rows };
}

/**
 * Calculates ROC-AUC score from true labels and prediction probabilities
 */
export function calculateRocAuc(yTrue: number[], yScore: number[]): number {
  const n = yTrue.length;
  if (n === 0) return 0.5;

  const pairs = yTrue.map((t, i) => ({ t, score: yScore[i] }));
  pairs.sort((a, b) => b.score - a.score);

  const nPos = yTrue.filter((y) => y === 1).length;
  const nNeg = n - nPos;
  if (nPos === 0 || nNeg === 0) return 0.5;

  let truePositives = 0;
  let falsePositives = 0;
  let prevScore = -Infinity;
  let auc = 0;
  let prevTpr = 0;
  let prevFpr = 0;

  for (let i = 0; i < n; i++) {
    const { t, score } = pairs[i];
    if (t === 1) {
      truePositives++;
    } else {
      falsePositives++;
    }

    if (i === n - 1 || pairs[i + 1].score !== score) {
      const tpr = truePositives / nPos;
      const fpr = falsePositives / nNeg;
      // Trapezoidal rule area
      auc += ((tpr + prevTpr) / 2) * (fpr - prevFpr);
      prevTpr = tpr;
      prevFpr = fpr;
    }
  }

  return Math.min(1, Math.max(0, Math.round(auc * 1000) / 1000));
}

/**
 * Evaluates binary classification metrics
 */
export function calculateMetrics(yTrue: number[], yScore: number[], threshold: number = 0.5): ModelMetrics {
  const n = yTrue.length;
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (let i = 0; i < n; i++) {
    const actual = yTrue[i];
    const predicted = yScore[i] >= threshold ? 1 : 0;
    if (actual === 1 && predicted === 1) tp++;
    else if (actual === 0 && predicted === 1) fp++;
    else if (actual === 0 && predicted === 0) tn++;
    else if (actual === 1 && predicted === 0) fn++;
  }

  const accuracy = (tp + tn) / (n || 1);
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const rocAuc = calculateRocAuc(yTrue, yScore);

  return {
    accuracy: Math.round(accuracy * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    f1Score: Math.round(f1Score * 1000) / 1000,
    rocAuc,
    sampleCount: n,
    positiveClassCount: tp + fn,
    negativeClassCount: tn + fp,
    kFoldFolds: 5,
  };
}

/**
 * Runs 5-fold Stratified Cross-Validation to generate Out-Of-Fold predictions
 */
export function trainAndEvaluateOutOfFold(
  schema: SchemaDetectionResult,
  rows: RawRow[]
): {
  predictions: EmployeePrediction[];
  metrics: ModelMetrics;
  featureImportance: { name: string; weight: number }[];
} {
  const targetCol = schema.targetColumn;
  const posClass = schema.detectedPositiveClass;
  if (!targetCol || !posClass) {
    throw new Error('Target column or positive class not specified for Mode A training.');
  }

  const columnTypes: Record<string, string> = {};
  for (const c of schema.columns) {
    columnTypes[c.name] = c.type;
  }

  const trainingData = prepareFeatures(rows, schema.usableFeatureColumns, columnTypes, targetCol, posClass);
  const { X, y, featureInfos, rawRows } = trainingData;
  const numSamples = X.length;

  // Stratified K-fold split
  const kFolds = Math.min(5, Math.max(2, Math.floor(numSamples / 10)));
  const posIndices: number[] = [];
  const negIndices: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    if (y[i] === 1) posIndices.push(i);
    else negIndices.push(i);
  }

  const folds: { trainIdx: number[]; valIdx: number[] }[] = Array.from({ length: kFolds }, () => ({
    trainIdx: [],
    valIdx: [],
  }));

  // Distribute positive samples
  posIndices.forEach((idx, i) => {
    folds[i % kFolds].valIdx.push(idx);
  });
  // Distribute negative samples
  negIndices.forEach((idx, i) => {
    folds[i % kFolds].valIdx.push(idx);
  });

  for (let k = 0; k < kFolds; k++) {
    const valSet = new Set(folds[k].valIdx);
    for (let i = 0; i < numSamples; i++) {
      if (!valSet.has(i)) {
        folds[k].trainIdx.push(i);
      }
    }
  }

  // Out-of-fold probability predictions array
  const oofProbabilities = new Array(numSamples).fill(0);
  const employeeContributions: FeatureContribution[][] = Array.from({ length: numSamples }, () => []);

  // Train on k-1 folds, predict on val fold
  for (let k = 0; k < kFolds; k++) {
    const { trainIdx, valIdx } = folds[k];
    const trainX = trainIdx.map((i) => X[i]);
    const trainY = trainIdx.map((i) => y[i]);

    const model = new LogisticRegressionModel({ l2Reg: 0.05, learningRate: 0.2, maxEpochs: 250 });
    model.fit(trainX, trainY);

    for (const vi of valIdx) {
      const proba = model.predictProba(X[vi]);
      oofProbabilities[vi] = proba;

      // Calculate feature contributions for this validation sample
      const contribs = model.getFeatureContributions(X[vi], featureInfos);
      
      const humanContribs: FeatureContribution[] = contribs.map((c) => {
        const feat = c.featureInfo;
        const rowVal = rawRows[vi][feat.originalColumn];
        let displayVal = rowVal !== undefined && rowVal !== null ? String(rowVal) : 'N/A';
        let displayAvg = '';

        if (feat.type === 'numeric') {
          displayAvg = feat.originalMean !== undefined ? feat.originalMean.toFixed(1) : 'Avg';
        } else {
          displayAvg = feat.originalMode || 'Common';
        }

        const isRisk = c.contribution > 0;
        return {
          featureName: feat.name,
          originalColumn: feat.originalColumn,
          employeeValue: displayVal,
          datasetAverage: displayAvg,
          contributionScore: Math.round(c.contribution * 1000) / 1000,
          direction: isRisk ? 'increases_risk' : 'decreases_risk',
          humanSummary: `${feat.name} (${displayVal} vs avg ${displayAvg})`,
        };
      });

      employeeContributions[vi] = humanContribs;
    }
  }

  // Train full model once on all data to get global feature importance weights
  const fullModel = new LogisticRegressionModel({ l2Reg: 0.05, learningRate: 0.2, maxEpochs: 250 });
  fullModel.fit(X, y);

  const featureImportance = featureInfos
    .map((info, idx) => ({
      name: info.name,
      weight: Math.round((fullModel.weights[idx] || 0) * 1000) / 1000,
    }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  // Build employee predictions
  const predictions: EmployeePrediction[] = [];

  for (let i = 0; i < numSamples; i++) {
    const rawRecord = rawRows[i];
    const idVal = schema.idColumn && rawRecord[schema.idColumn] !== undefined
      ? String(rawRecord[schema.idColumn])
      : `EMP-${String(i + 1).padStart(3, '0')}`;

    const prob = oofProbabilities[i];
    const riskScore = Math.min(100, Math.max(0, Math.round(prob * 100)));
    const prediction: 'Will Resign' | 'Will Stay' = riskScore >= 50 ? 'Will Resign' : 'Will Stay';

    const allContribs = employeeContributions[i] || [];

    // Sort by positive contribution for risk factors
    const riskFactors = allContribs
      .filter((c) => c.direction === 'increases_risk' && c.contributionScore > 0.01)
      .sort((a, b) => b.contributionScore - a.contributionScore);

    // Sort by negative contribution for protective factors
    const protectiveFactors = allContribs
      .filter((c) => c.direction === 'decreases_risk' && c.contributionScore < -0.01)
      .sort((a, b) => a.contributionScore - b.contributionScore);

    predictions.push({
      id: idVal,
      originalRowIndex: i,
      rawRecord,
      riskScore,
      prediction,
      topRiskFactors: riskFactors.slice(0, 5),
      topProtectiveFactors: protectiveFactors.slice(0, 5),
      mode: 'A',
    });
  }

  // Sort default by risk score descending
  predictions.sort((a, b) => b.riskScore - a.riskScore);

  const metrics = calculateMetrics(y, oofProbabilities, 0.5);

  return { predictions, metrics, featureImportance };
}
