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
    const { employees, idColumn } = body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json({ error: 'No employees provided for batch scoring' }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `You are AttritionAI, an expert HR workforce analytics engine.
Analyze the provided batch of employee records where historical attrition outcome is unlabelled.
Based strictly on workforce retention indicators (e.g. overtime, tenure, compensation, promotion velocity, satisfaction, distance from work), estimate the resignation risk score for each employee from 0 to 100.
Criteria:
- risk_score 0-34: Low risk (Will Stay)
- risk_score 35-64: Medium risk (Will Stay or At-risk)
- risk_score 65-100: High risk (Will Resign)
Return strict JSON with an array of objects matching the schema: { id, risk_score, reason, top_factors }.`;

    const sanitizedBatch = employees.slice(0, 30).map((emp: any, idx: number) => {
      const id = idColumn && emp[idColumn] !== undefined ? String(emp[idColumn]) : `EMP-${idx + 1}`;
      return { id, record: emp };
    });

    const userPrompt = `Evaluate resignation risk for these ${sanitizedBatch.length} employees:
${JSON.stringify(sanitizedBatch, null, 2)}`;

    const response = await generateWithFallback(
      ai,
      {
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                risk_score: {
                  type: Type.INTEGER,
                  description: 'Estimated resignation risk percentage between 0 and 100.',
                },
                top_factors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Top 2 primary risk factors (e.g. "Frequent Overtime", "Low Satisfaction").',
                },
                reason: {
                  type: Type.STRING,
                  description: 'Short 1-2 sentence neutral summary of why this score was assigned.',
                },
              },
              required: ['id', 'risk_score', 'reason', 'top_factors'],
            },
          },
        },
      },
      ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']
    );

    const text = response.text || '[]';
    const parsed = JSON.parse(text);

    return NextResponse.json({ results: parsed });
  } catch (error: any) {
    console.error('Gemini batch risk error:', error);
    const msg = String(error?.message || error || 'Failed to estimate batch resignation risk.');
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
