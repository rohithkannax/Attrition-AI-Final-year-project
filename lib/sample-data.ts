import { RawRow } from './types';

// Deterministic pseudo-random generator with seed
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateSampleEmployees(): RawRow[] {
  const rand = createSeededRandom(42);

  const departments = ['Research & Development', 'Sales', 'Human Resources'];
  const rolesByDept: Record<string, string[]> = {
    'Research & Development': [
      'Research Scientist',
      'Laboratory Technician',
      'Software Engineer',
      'Manufacturing Director',
      'Healthcare Representative',
    ],
    Sales: ['Sales Executive', 'Sales Representative', 'Manager'],
    'Human Resources': ['Human Resources Specialist', 'HR Manager'],
  };

  const firstNames = [
    'Sarah', 'Michael', 'Elena', 'David', 'Priya', 'James', 'Amina', 'Marcus', 'Chloe', 'Liam',
    'Yuki', 'Carlos', 'Maya', 'Alexander', 'Fatima', 'Daniel', 'Sophia', 'Lucas', 'Zoe', 'Wei',
    'Grace', 'Ethan', 'Hannah', 'Noah', 'Ava', 'Mason', 'Isabella', 'Logan', 'Mia', 'Oliver',
    'Emma', 'Elijah', 'Charlotte', 'Aiden', 'Amelia', 'Benjamin', 'Harper', 'Henry', 'Evelyn', 'Sebastian'
  ];

  const lastNames = [
    'Chen', 'Smith', 'Patel', 'Johnson', 'Kim', 'Garcia', 'Williams', 'Rodriguez', 'Brown', 'Mendoza',
    'Wong', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson',
    'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis'
  ];

  const employees: RawRow[] = [];

  for (let i = 1; i <= 200; i++) {
    const fName = firstNames[Math.floor(rand() * firstNames.length)];
    const lName = lastNames[Math.floor(rand() * lastNames.length)];
    const name = `${fName} ${lName}`;
    const empId = `EMP-${String(1000 + i)}`;

    // Age: 22 to 60
    const age = Math.floor(rand() * 38) + 22;

    // Department
    const deptRoll = rand();
    const department = deptRoll < 0.6 ? departments[0] : deptRoll < 0.9 ? departments[1] : departments[2];

    // Job Role
    const roles = rolesByDept[department];
    const jobRole = roles[Math.floor(rand() * roles.length)];

    // Years at company (bounded by age)
    const maxYears = Math.max(1, Math.min(25, age - 21));
    const yearsAtCompany = Math.floor(rand() * maxYears) + 1;

    // Years since last promotion
    const yearsSinceLastPromotion = Math.min(yearsAtCompany, Math.floor(rand() * 8));

    // Distance from home (km / miles: 1 to 35)
    const distanceFromHome = Math.floor(rand() * 32) + 1;

    // Overtime: Yes or No
    const overTimeRoll = rand();
    const overTime = overTimeRoll < 0.32 ? 'Yes' : 'No';

    // Job Satisfaction (1 to 4)
    const jobSatisfaction = Math.floor(rand() * 4) + 1;

    // Monthly Income ($2,500 - $18,500 based on age and role)
    const isDirectorOrMgr = jobRole.includes('Manager') || jobRole.includes('Director');
    const baseIncome = isDirectorOrMgr ? 9500 + rand() * 8000 : 3200 + rand() * 5500 + (yearsAtCompany * 180);
    const monthlyIncome = Math.round(baseIncome / 50) * 50;

    // Compute realistic risk probability to determine realistic historical Attrition
    let riskFactor = 0.12; // base attrition rate ~15%
    if (overTime === 'Yes') riskFactor += 0.22;
    if (jobSatisfaction <= 2) riskFactor += 0.25;
    if (jobSatisfaction === 4) riskFactor -= 0.10;
    if (monthlyIncome < 4000) riskFactor += 0.16;
    if (monthlyIncome > 9000) riskFactor -= 0.12;
    if (yearsSinceLastPromotion >= 5) riskFactor += 0.18;
    if (yearsAtCompany <= 2) riskFactor += 0.15;
    if (distanceFromHome > 20) riskFactor += 0.12;
    if (age < 28) riskFactor += 0.10;
    if (age > 48) riskFactor -= 0.08;

    riskFactor = Math.max(0.04, Math.min(0.92, riskFactor));
    const attrition = rand() < riskFactor ? 'Yes' : 'No';

    employees.push({
      EmployeeID: empId,
      Name: name,
      Age: age,
      Department: department,
      JobRole: jobRole,
      MonthlyIncome: monthlyIncome,
      OverTime: overTime,
      JobSatisfaction: jobSatisfaction,
      YearsAtCompany: yearsAtCompany,
      YearsSinceLastPromotion: yearsSinceLastPromotion,
      DistanceFromHome: distanceFromHome,
      Attrition: attrition,
    });
  }

  return employees;
}
