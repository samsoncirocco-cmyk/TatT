/**
 * Cost Estimator Service
 * 
 * AI-powered tattoo cost estimation using Gemini vision analysis.
 * Analyzes design complexity, size requirements, color density, and style
 * to provide realistic price ranges based on industry standards.
 */

import { getGcpAccessToken } from '@/lib/google-auth-edge';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const REGION = process.env.GCP_REGION || 'us-central1';
const MODEL = 'gemini-2.0-flash-exp';

// Industry-standard hourly rates by region
const HOURLY_RATES = {
  apprentice: { min: 50, max: 80 },
  standard: { min: 100, max: 175 },
  experienced: { min: 175, max: 300 },
  renowned: { min: 300, max: 500 },
  celebrity: { min: 500, max: 1500 }
};

// Size-to-time estimates (hours)
const SIZE_TIME_MAP = {
  tiny: { min: 0.5, max: 1, description: '1-2 inches' },
  small: { min: 1, max: 2, description: '2-4 inches' },
  medium: { min: 2, max: 4, description: '4-6 inches' },
  large: { min: 4, max: 8, description: '6-10 inches' },
  xlarge: { min: 8, max: 15, description: '10-15 inches' },
  sleeve: { min: 15, max: 30, description: 'half sleeve' },
  fullsleeve: { min: 30, max: 60, description: 'full sleeve' },
  backpiece: { min: 40, max: 100, description: 'full back' }
};

export interface CostEstimateRequest {
  imageDataUrl?: string;  // Base64 data URL of the design
  prompt?: string;        // Design description (fallback if no image)
  style?: string;         // Style category
  bodyPart?: string;      // Target body location
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge' | 'sleeve' | 'fullsleeve' | 'backpiece';
}

export interface CostBreakdown {
  lineWork: number;       // 0-10 complexity
  shading: number;        // 0-10 density
  color: number;          // 0-10 (0 = blackwork, 10 = full color)
  detail: number;         // 0-10 fine detail level
  coverage: number;       // 0-10 fill density
}

export interface CostEstimate {
  success: boolean;
  priceRange: {
    low: number;
    mid: number;
    high: number;
    premium: number;
  };
  timeEstimate: {
    sessionsMin: number;
    sessionsMax: number;
    hoursPerSession: number;
    totalHoursMin: number;
    totalHoursMax: number;
  };
  breakdown: CostBreakdown;
  factors: string[];
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  metadata: {
    analyzedAt: string;
    style: string;
    bodyPart: string;
    size: string;
    model: string;
  };
}

/**
 * Analyze a design and estimate tattoo cost
 */
export async function estimateCost(request: CostEstimateRequest): Promise<CostEstimate> {
  const accessToken = await getGcpAccessToken();
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`;

  const size = request.size || 'medium';
  const sizeInfo = SIZE_TIME_MAP[size];

  const analysisPrompt = `You are an expert tattoo artist and shop owner with 20+ years of experience. Analyze this tattoo design and provide a detailed cost estimate.

Context:
- Target Body Part: ${request.bodyPart || 'forearm'}
- Style: ${request.style || 'custom'}
- Approximate Size: ${sizeInfo.description}

${request.prompt ? `Design Description: ${request.prompt}` : ''}

Analyze the design and return a JSON object with this exact structure:
{
  "lineWorkComplexity": <0-10, where 0=minimal lines, 10=extremely intricate linework>,
  "shadingDensity": <0-10, where 0=no shading, 10=heavy/complex shading>,
  "colorComplexity": <0-10, where 0=blackwork only, 10=full color palette with gradients>,
  "detailLevel": <0-10, where 0=bold/simple, 10=micro-realism/hyper-detailed>,
  "coverageDensity": <0-10, where 0=sparse/negative space, 10=solid fill>,
  "estimatedHours": <number, realistic hours for an experienced artist>,
  "sessionCount": <number of sessions recommended, considering healing time>,
  "difficultyFactors": [<list of specific elements that add complexity>],
  "costFactors": [<list of factors that would increase price: rare ink colors, cover-up, difficult placement, etc>],
  "recommendations": [<practical advice: aftercare, artist specialization needed, touch-up expectations>],
  "confidenceLevel": <"low"|"medium"|"high" based on how clear the design is>
}

Be realistic - most tattoos take longer than clients expect. Fine line work is actually more difficult and time-consuming than bold traditional. Color saturation requires multiple passes. Consider healing between sessions for large pieces.`;

  // Build request body with or without image
  const parts: any[] = [{ text: analysisPrompt }];
  
  if (request.imageDataUrl) {
    // Extract base64 from data URL
    const base64Match = request.imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (base64Match) {
      const mimeType = `image/${base64Match[1]}`;
      const base64Data = base64Match[2];
      parts.unshift({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3  // Lower temp for more consistent estimates
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No analysis generated from Gemini');
  }

  let analysis;
  try {
    analysis = JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse cost analysis');
    }
  }

  // Calculate price ranges based on analysis
  const complexity = (
    analysis.lineWorkComplexity +
    analysis.shadingDensity +
    analysis.colorComplexity +
    analysis.detailLevel +
    analysis.coverageDensity
  ) / 5;

  const hoursMin = Math.max(sizeInfo.min, analysis.estimatedHours * 0.8);
  const hoursMax = Math.max(sizeInfo.max, analysis.estimatedHours * 1.2);

  // Determine artist tier based on complexity
  const artistTier = complexity >= 8 ? 'renowned' :
                     complexity >= 6 ? 'experienced' :
                     complexity >= 4 ? 'standard' : 'apprentice';
  const rates = HOURLY_RATES[artistTier];

  const priceRange = {
    low: Math.round(hoursMin * rates.min / 50) * 50,     // Round to nearest $50
    mid: Math.round(((hoursMin + hoursMax) / 2) * ((rates.min + rates.max) / 2) / 50) * 50,
    high: Math.round(hoursMax * rates.max / 50) * 50,
    premium: Math.round(hoursMax * HOURLY_RATES.renowned.max / 50) * 50
  };

  return {
    success: true,
    priceRange,
    timeEstimate: {
      sessionsMin: Math.max(1, analysis.sessionCount || 1),
      sessionsMax: Math.max(analysis.sessionCount || 1, Math.ceil(hoursMax / 4)),
      hoursPerSession: 3.5,
      totalHoursMin: Math.round(hoursMin * 10) / 10,
      totalHoursMax: Math.round(hoursMax * 10) / 10
    },
    breakdown: {
      lineWork: analysis.lineWorkComplexity,
      shading: analysis.shadingDensity,
      color: analysis.colorComplexity,
      detail: analysis.detailLevel,
      coverage: analysis.coverageDensity
    },
    factors: [
      ...(analysis.difficultyFactors || []),
      ...(analysis.costFactors || [])
    ],
    recommendations: analysis.recommendations || [],
    confidence: analysis.confidenceLevel || 'medium',
    metadata: {
      analyzedAt: new Date().toISOString(),
      style: request.style || 'custom',
      bodyPart: request.bodyPart || 'forearm',
      size,
      model: MODEL
    }
  };
}

/**
 * Quick estimate without AI (for rate-limited scenarios)
 */
export function quickEstimate(
  style: string,
  bodyPart: string,
  size: keyof typeof SIZE_TIME_MAP = 'medium'
): CostEstimate {
  const sizeInfo = SIZE_TIME_MAP[size];
  
  // Style complexity multipliers
  const styleMultipliers: Record<string, number> = {
    'traditional': 1.0,
    'neo-traditional': 1.2,
    'japanese': 1.3,
    'blackwork': 0.9,
    'fine-line': 1.4,
    'geometric': 1.1,
    'watercolor': 1.3,
    'realism': 1.6,
    'trash-polka': 1.2,
    'minimalist': 0.8,
    'anime': 1.2,
    'chicano': 1.3,
    'biomech': 1.5,
    'tribal': 0.9,
    'dotwork': 1.4
  };

  const multiplier = styleMultipliers[style?.toLowerCase()] || 1.0;
  const hours = ((sizeInfo.min + sizeInfo.max) / 2) * multiplier;
  const rates = HOURLY_RATES.experienced;

  return {
    success: true,
    priceRange: {
      low: Math.round(hours * rates.min * 0.7 / 50) * 50,
      mid: Math.round(hours * ((rates.min + rates.max) / 2) / 50) * 50,
      high: Math.round(hours * rates.max / 50) * 50,
      premium: Math.round(hours * HOURLY_RATES.renowned.max / 50) * 50
    },
    timeEstimate: {
      sessionsMin: 1,
      sessionsMax: Math.ceil(hours / 4),
      hoursPerSession: 3.5,
      totalHoursMin: sizeInfo.min * multiplier,
      totalHoursMax: sizeInfo.max * multiplier
    },
    breakdown: {
      lineWork: 5,
      shading: 5,
      color: style?.toLowerCase() === 'blackwork' ? 0 : 5,
      detail: 5,
      coverage: 5
    },
    factors: ['Estimate based on style averages'],
    recommendations: ['Get in-person consultation for accurate quote'],
    confidence: 'low',
    metadata: {
      analyzedAt: new Date().toISOString(),
      style: style || 'custom',
      bodyPart: bodyPart || 'forearm',
      size,
      model: 'quick-estimate'
    }
  };
}
