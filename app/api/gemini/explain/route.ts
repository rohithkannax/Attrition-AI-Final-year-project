import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

async function generateWithFallback(ai: GoogleGenAI, config: any, models: string[]) {
  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...config,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429')) {
        continue;
      }
      break;
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY is not configured. Please add your Gemini API key in the Settings > Secrets panel.',
          isConfigError: true,
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      employeeId,
      prediction,
      riskScore,
      rawRecord,
      topRiskFactors,
      topProtectiveFactors,
      mode,
    } = body;

    if (!rawRecord || riskScore === undefined) {
      return NextResponse.json({ error: 'Missing employee record or risk score' }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `You are AttritionAI, an objective HR analytics specialist.
Explain WHY an employee is predicted to ${prediction || (riskScore >= 50 ? 'resign' : 'stay')} in 3 to 5 clear, professional, plain-English sentences.
Rules:
1. Use ONLY the provided attributes, factor contributions, and dataset benchmarks.
2. Do NOT invent outside facts, assume personal motives, or make moral/subjective judgments.
3. Be neutral, constructive, and grounded in workplace analytics.
4. Also provide 2 to 3 practical, actionable HR retention or engagement steps tailored strictly to the identified factors.`;

    const userPrompt = `Employee Information:
ID / Name: ${employeeId || 'Unknown'}
Model Prediction: ${prediction} (${riskScore}% resignation risk)
Mode: ${mode === 'B' ? 'Direct AI Estimation' : 'Cross-validated Statistical Model (Mode A)'}

Key Contributing Factors to Risk:
${(topRiskFactors || [])
  .map(
    (f: any) =>
      `- ${f.featureName}: Employee value is "${f.employeeValue}", compared to dataset benchmark "${f.datasetAverage}". (Direction: Increases Risk)`
  )
  .join('\n') || 'None dominant'}

Protective / Stability Factors:
${(topProtectiveFactors || [])
  .map(
    (f: any) =>
      `- ${f.featureName}: Employee value is "${f.employeeValue}", compared to dataset benchmark "${f.datasetAverage}". (Direction: Decreases Risk)`
  )
  .join('\n') || 'None dominant'}

Full Employee Record:
${JSON.stringify(rawRecord, null, 2)}

Provide the explanation and retention actions in structured JSON.`;

    const response = await generateWithFallback(
      ai,
      {
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: {
                type: Type.STRING,
                description: 'A 3 to 5 sentence plain-English explanation of why this employee is predicted to resign or stay, strictly grounded in the provided data.',
              },
              factorsAnalysis: {
                type: Type.STRING,
                description: 'A brief 1-2 sentence contextual comparison of their top factors against the company average.',
              },
              retentionActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 3 concrete, practical HR retention or engagement actions.',
              },
            },
            required: ['overview', 'retentionActions'],
          },
        },
      },
      ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']
    );

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    return NextResponse.json({
      overview: parsed.overview || 'Analysis complete based on employee profile indicators.',
      factorsAnalysis: parsed.factorsAnalysis || '',
      retentionActions: parsed.retentionActions || [
        'Conduct a 1-on-1 check-in to discuss workload and compensation alignment.',
        'Review career advancement roadmap and recognition opportunities.',
      ],
    });
  } catch (error: any) {
    console.error('Gemini explanation error:', error);
    const msg = String(error?.message || error || 'Failed to generate AI explanation.');
    const isAuth =
      msg.includes('API_KEY') ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('authentication scopes') ||
      msg.includes('unauthorized') ||
      msg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
      msg.includes('403');

    return NextResponse.json(
      {
        error: isAuth
          ? 'Gemini API authentication required: please configure or select an active GEMINI_API_KEY in Settings > Secrets.'
          : msg,
        isConfigError: isAuth,
      },
      { status: isAuth ? 401 : 500 }
    );
  }
}
