import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSampleEmployees } from './sample-data';
import { detectSchema } from './parser';
import { calculateRocAuc, calculateMetrics, trainAndEvaluateOutOfFold, LogisticRegressionModel } from './ml';

test('calculateRocAuc returns 1.0 for perfect predictions and >= 0.5 for realistic', () => {
  const yTrue = [1, 1, 0, 0];
  const yScorePerfect = [0.9, 0.8, 0.2, 0.1];
  const auc = calculateRocAuc(yTrue, yScorePerfect);
  assert.equal(auc, 1.0);

  const yScoreInverted = [0.1, 0.2, 0.8, 0.9];
  const aucInverted = calculateRocAuc(yTrue, yScoreInverted);
  assert.equal(aucInverted, 0.0);
});

test('calculateMetrics calculates precision, recall, f1, and accuracy correctly', () => {
  const yTrue = [1, 1, 0, 0];
  const yScore = [0.8, 0.6, 0.3, 0.2];
  const metrics = calculateMetrics(yTrue, yScore, 0.5);

  assert.equal(metrics.accuracy, 1.0);
  assert.equal(metrics.precision, 1.0);
  assert.equal(metrics.recall, 1.0);
  assert.equal(metrics.f1Score, 1.0);
  assert.equal(metrics.rocAuc, 1.0);
});

test('trainAndEvaluateOutOfFold runs 5-fold cross-validation on sample data', () => {
  const sampleRows = generateSampleEmployees();
  assert.equal(sampleRows.length, 200);

  const schema = detectSchema(sampleRows);
  assert.equal(schema.targetColumn, 'Attrition');
  assert.equal(schema.detectedPositiveClass, 'Yes');

  const result = trainAndEvaluateOutOfFold(schema, sampleRows);

  assert.equal(result.predictions.length, 200);
  assert.ok(result.metrics.rocAuc > 0.6, `ROC-AUC should be reasonable, got ${result.metrics.rocAuc}`);
  assert.ok(result.metrics.accuracy > 0.6, `Accuracy should be reasonable, got ${result.metrics.accuracy}`);
  assert.ok(result.featureImportance.length > 0);

  // Check an individual prediction
  const p1 = result.predictions[0];
  assert.ok(p1.id.startsWith('EMP-') || p1.id.length > 0);
  assert.ok(p1.riskScore >= 0 && p1.riskScore <= 100);
  assert.ok(p1.prediction === 'Will Resign' || p1.prediction === 'Will Stay');
  assert.ok(Array.isArray(p1.topRiskFactors));
});
