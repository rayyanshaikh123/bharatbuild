const OpenAI = require("openai");

/**
 * AI Insights Service
 * Management intelligence layer for construction projects
 * Read-only AI that explains patterns humans can't easily see
 */

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-3.5-turbo";

/**
 * Analyze delay root causes
 * @param {Object} delayData - Delayed plan items with DPRs
 * @returns {Object} Delay analysis with causes and recommendations
 */
async function analyzeDelayCauses(delayData) {
  try {
    const prompt = `You are a construction project analyst. Analyze the following delay data and identify root causes.

DATA:
${JSON.stringify(delayData, null, 2)}

Provide analysis in JSON format with:
{
  "summary": "Brief overview of delays",
  "primary_causes": ["cause1", "cause2", "cause3"],
  "affected_plan_items": [{"task_name": "...", "delay_days": number, "cause": "..."}],
  "engineer_risk_flags": [{"site_engineer_id": "...", "pattern": "..."}],
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on:
- Repeating patterns in DPR descriptions
- Weather, material, manpower, approval delays
- Engineer-specific patterns
- Actionable recommendations`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a construction project analyst. Provide insights in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("[AI Insights] Delay analysis error:", error.message);
    return {
      summary: "AI analysis unavailable",
      primary_causes: [],
      affected_plan_items: [],
      engineer_risk_flags: [],
      recommendations: ["Manual review recommended"],
      error: error.message,
    };
  }
}

/**
 * Analyze material consumption anomalies
 * @param {Object} materialData - Material requests, bills, DPR extractions
 * @returns {Object} Anomaly detection with recommendations
 */
async function analyzeMaterialAnomalies(materialData) {
  try {
    const prompt = `You are a construction auditor. Analyze material consumption patterns and detect anomalies.

DATA:
${JSON.stringify(materialData, null, 2)}

Provide analysis in JSON format with:
{
  "anomalies": [
    {
      "material": "material_name",
      "engineer_id": "uuid or null",
      "issue": "description",
      "confidence": 0.0-1.0,
      "period": "timeframe"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"]
}

Detect:
- Usage significantly above/below baseline
- Sudden spikes or drops
- Engineer-specific patterns
- Inconsistencies between DPR extractions and bills`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a construction auditor. Provide insights in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("[AI Insights] Material anomaly error:", error.message);
    return {
      anomalies: [],
      recommendations: ["Manual audit recommended"],
      error: error.message,
    };
  }
}

/**
 * Analyze audit log patterns
 * @param {Object} auditData - Audit logs with user behavior
 * @returns {Object} Pattern analysis with risk flags
 */
async function analyzeAuditPatterns(auditData) {
  try {
    const prompt = `You are a compliance analyst. Analyze audit log patterns and detect risky behavior.

DATA:
${JSON.stringify(auditData, null, 2)}

Provide analysis in JSON format with:
{
  "risk_patterns": [
    {
      "user_role": "role",
      "pattern": "description",
      "count": number,
      "severity": "low|medium|high"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"]
}

Detect:
- Excessive edits or deletions
- Repeated reversals
- Late-night critical updates
- Pre-approval manipulation
- Unusual frequency patterns`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a compliance analyst. Provide insights in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("[AI Insights] Audit pattern error:", error.message);
    return {
      risk_patterns: [],
      recommendations: ["Manual review recommended"],
      error: error.message,
    };
  }
}

/**
 * Calculate project health score
 * @param {Object} projectData - Combined project metrics
 * @returns {Object} Health score with breakdown
 */
async function calculateProjectHealth(projectData) {
  try {
    const prompt = `You are a project health analyst. Calculate an overall health score (0-100) for this construction project.

DATA:
${JSON.stringify(projectData, null, 2)}

Provide analysis in JSON format with:
{
  "health_score": 0-100,
  "status": "HEALTHY|AT RISK|CRITICAL",
  "score_breakdown": {
    "budget_health": 0-100,
    "timeline_health": 0-100,
    "resource_health": 0-100,
    "compliance_health": 0-100
  },
  "top_risks": ["risk1", "risk2"],
  "action_items": ["action1", "action2"]
}

Consider:
- Budget utilization vs timeline progress
- Delay frequency and severity
- Material anomalies
- Audit volatility
- Attendance stability`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a project health analyst. Provide insights in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("[AI Insights] Health calculation error:", error.message);
    return {
      health_score: 50,
      status: "UNKNOWN",
      score_breakdown: {},
      top_risks: [],
      action_items: ["AI analysis unavailable - manual review needed"],
      error: error.message,
    };
  }
}

/**
 * Analyze organization-wide risks
 * @param {Object} orgData - All projects data
 * @returns {Object} Organization risk analysis
 */
async function analyzeOrganizationRisks(orgData) {
  try {
    const prompt = `You are an executive analyst. Analyze organization-wide construction risks across multiple projects.

DATA:
${JSON.stringify(orgData, null, 2)}

Provide analysis in JSON format with:
{
  "organization_health": 0-100,
  "high_risk_projects": [
    {
      "project_id": "uuid",
      "project_name": "name",
      "risk_score": 0-100,
      "primary_risks": ["risk1", "risk2"]
    }
  ],
  "systemic_issues": ["issue1", "issue2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Identify:
- Projects with highest risk
- Common patterns across projects
- Systemic organizational issues
- Strategic recommendations`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an executive analyst. Provide insights in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 900,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("[AI Insights] Organization risk error:", error.message);
    return {
      organization_health: 50,
      high_risk_projects: [],
      systemic_issues: [],
      recommendations: ["AI analysis unavailable"],
      error: error.message,
    };
  }
}

/**
 * Analyze engineer performance patterns
 * @param {Object} engineerData - Engineer metrics across projects
 * @returns {Object} Performance insights (advisory only)
 */
async function analyzeEngineerPerformance(engineerData) {
  try {
    const prompt = `You are a performance advisor. Analyze site engineer patterns in a supportive, non-punitive way.

DATA:
${JSON.stringify(engineerData, null, 2)}

Provide analysis in JSON format with:
{
  "insights": [
    {
      "engineer_id": "uuid",
      "engineer_name": "name",
      "performance_indicator": "HIGH_PERFORMER|AVERAGE|NEEDS_SUPPORT",
      "strengths": ["strength1", "strength2"],
      "areas_for_improvement": ["area1", "area2"],
      "recommendations": ["supportive recommendation"]
    }
  ],
  "note": "Advisory only - not for punitive action"
}

Focus on:
- Delay patterns
- Material management
- DPR quality
- Audit behavior
- Constructive feedback only`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a supportive performance advisor. Provide constructive insights in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 900,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("[AI Insights] Engineer performance error:", error.message);
    return {
      insights: [],
      note: "AI analysis unavailable",
      error: error.message,
    };
  }
}

/**
 * Detect financial drift
 * @param {Object} financeData - Budget, spending, ledger data
 * @returns {Object} Financial drift analysis
 */
async function detectFinancialDrift(financeData) {
  try {
    const prompt = `You are a financial analyst. Detect spending anomalies and budget drift in construction projects.

DATA:
${JSON.stringify(financeData, null, 2)}

Provide analysis in JSON format with:
{
  "drift_detected": true|false,
  "projects_at_risk": [
    {
      "project_id": "uuid",
      "project_name": "name",
      "budget_utilization": percentage,
      "expected_utilization": percentage,
      "drift_percentage": percentage,
      "cause": "description"
    }
  ],
  "spending_imbalances": [
    {
      "project_id": "uuid",
      "issue": "description",
      "recommendation": "action"
    }
  ],
  "ledger_concerns": [
    {
      "project_id": "uuid",
      "issue": "description",
      "recommendation": "action"
    }
  ]
}

Detect:
- Spend velocity above expected
- Wage vs material imbalance
- Frequent ledger adjustments
- Budget overruns`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a financial analyst. Provide insights in valid JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("[AI Insights] Financial drift error:", error.message);
    return {
      drift_detected: false,
      projects_at_risk: [],
      spending_imbalances: [],
      ledger_concerns: [],
      error: error.message,
    };
  }
}

module.exports = {
  analyzeDelayCauses,
  analyzeMaterialAnomalies,
  analyzeAuditPatterns,
  calculateProjectHealth,
  analyzeOrganizationRisks,
  analyzeEngineerPerformance,
  detectFinancialDrift,
};
