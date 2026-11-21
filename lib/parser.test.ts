import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvStringToRows, detectSchema, inferColumnType } from './parser';

test('inferColumnType identifies numeric, boolean, date, and categorical', () => {
  assert.equal(inferColumnType(['12', '45.5', '100', '0']), 'numeric');
  assert.equal(inferColumnType(['Yes', 'No', 'Yes', 'No']), 'boolean');
  assert.equal(inferColumnType(['true', 'false', 'true']), 'boolean');
  assert.equal(inferColumnType(['2023-01-15', '2024-05-20', '2022-11-04']), 'date');
  assert.equal(inferColumnType(['Sales', 'Engineering', 'HR', 'Marketing']), 'categorical');
});

test('parseCsvStringToRows parses valid CSV string', () => {
  const csv = `id,name,age,department,attrition
1,Alice,32,Sales,No
2,Bob,25,Engineering,Yes
3,Charlie,40,HR,No`;

  const rows = parseCsvStringToRows(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].name, 'Alice');
  assert.equal(rows[1].attrition, 'Yes');
});

test('detectSchema detects ID column and Attrition target column', () => {
  const csv = `EmployeeID,Age,Department,OverTime,MonthlyIncome,Attrition
EMP-001,30,Sales,Yes,4500,Yes
EMP-002,45,R&D,No,9000,No
EMP-003,28,Sales,Yes,3200,Yes
EMP-004,50,HR,No,8500,No
EMP-005,35,R&D,No,6000,No`;

  const rows = parseCsvStringToRows(csv);
  const schema = detectSchema(rows);

  assert.equal(schema.idColumn, 'EmployeeID');
  assert.equal(schema.targetColumn, 'Attrition');
  assert.equal(schema.detectedPositiveClass, 'Yes');
  assert.ok(schema.usableFeatureColumns.includes('Age'));
  assert.ok(schema.usableFeatureColumns.includes('Department'));
  assert.ok(schema.usableFeatureColumns.includes('OverTime'));
  assert.ok(schema.usableFeatureColumns.includes('MonthlyIncome'));
  // Target and ID should not be in usable features
  assert.ok(!schema.usableFeatureColumns.includes('EmployeeID'));
  assert.ok(!schema.usableFeatureColumns.includes('Attrition'));
});
