const OpenAI = require("openai");

/**
 * AI Report Insights Service
 * Generates AI-powered insights using OpenAI
 */

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-3.5-turbo"; // or 'gpt-4' for better results

/**
 * Generate executive summary from report data
 * @param {Object} reportData - Full report data
 * @param {String} reportType - Type of report
 * @returns {String} AI-generated summary
 */
async function generateReportSummary(reportData, reportType) {
  try {
    const prompt = buildSummaryPrompt(reportData, reportType);

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert construction project analyst. Provide concise, actionable insights based on project data. Focus on key metrics, trends, and recommendations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("[AI Service] Summary generation error:", error.message);
    return "AI summary unavailable. Please check OpenAI API configuration.";
  }
}

/**
 * Detect anomalies in report data
 * @param {Object} reportData - Report data
 * @param {String} reportType - Type of report
 * @returns {Array} List of detected anomalies
 */
async function detectAnomalies(reportData, reportType) {
  try {
    const prompt = buildAnomalyPrompt(reportData, reportType);

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a construction project auditor. Identify anomalies, risks, and unusual patterns in project data. Be specific and actionable.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 400,
      temperature: 0.5,
    });

    const content = response.choices[0].message.content;

    // Parse AI response into structured anomalies
    return parseAnomalies(content);
  } catch (error) {
    console.error("[AI Service] Anomaly detection error:", error.message);
    return [];
  }
}

/**
 * Explain project delays using DPR and delay data
 * @param {Array} delayedItems - Delayed plan items with delay_info
 * @returns {String} Human-readable explanation
 */
async function explainDelays(delayedItems) {
  try {
    if (!delayedItems || delayedItems.length === 0) {
      return "No delays detected in the selected period.";
    }

    const prompt = `Analyze the following project delays and provide a concise explanation:

${delayedItems
  .map(
    (item, index) => `
${index + 1}. Task: ${item.task_name}
   Delay: ${item.delay_days} days
   Planned End: ${item.period_end}
   Actual End: ${item.completed_at}
   Reason: ${item.delay_info?.delay_reason || "Not specified"}
   Referenced DPRs: ${item.delay_info?.referenced_dprs?.join(", ") || "None"}
`,
  )
  .join("\n")}

Provide:
1. Overall delay summary
2. Common delay patterns
3. Recommendations to prevent future delays`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a construction project manager analyzing delays. Provide practical insights and recommendations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("[AI Service] Delay explanation error:", error.message);
    return "Delay analysis unavailable.";
  }
}

/**
 * Generate executive insights for organization
 * @param {Object} financialData - Financial report data
 * @param {Object} progressData - Progress report data
 * @returns {Object} Executive insights
 */
async function generateExecutiveInsights(financialData, progressData) {
  try {
    const prompt = `Provide executive-level insights for a construction organization:

FINANCIAL DATA:
- Total Budget: ₹${financialData.summary.total_budget}
- Total Invested: ₹${financialData.summary.total_invested}
- Budget Utilization: ${financialData.summary.budget_utilization}%
- Material Costs: ₹${financialData.summary.total_material_cost}
- Wage Costs: ₹${financialData.summary.total_wages}

PROGRESS DATA:
- Total Plan Items: ${progressData.summary.plan_items.total}
- Completed: ${progressData.summary.plan_items.completed} (${progressData.summary.plan_items.completion_percentage}%)
- Delayed: ${progressData.summary.plan_items.delayed}
- Total DPRs: ${progressData.summary.total_dprs}

Provide:
1. Overall health assessment (1-2 sentences)
2. Top 3 strengths
3. Top 3 concerns
4. 3 actionable recommendations`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a senior construction executive advisor. Provide strategic, high-level insights.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 700,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;

    return {
      summary: content,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[AI Service] Executive insights error:", error.message);
    return {
      summary: "Executive insights unavailable.",
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * Generate project-specific AI insights
 * @param {String} projectId - Project ID
 * @param {Object} reportData - Combined report data
 * @returns {Object} Project insights
 */
async function generateProjectInsights(projectId, reportData) {
  try {
    const prompt = `Analyze this construction project:

PROJECT METRICS:
${JSON.stringify(reportData, null, 2)}

Provide:
1. Project health score (1-10)
2. Key achievements
3. Critical issues
4. Next steps`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a project manager analyzing a construction project. Be specific and actionable.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return {
      project_id: projectId,
      insights: response.choices[0].message.content,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[AI Service] Project insights error:", error.message);
    return {
      project_id: projectId,
      insights: "Project insights unavailable.",
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * Build summary prompt based on report type
 */
function buildSummaryPrompt(reportData, reportType) {
  switch (reportType) {
    case "financial":
      return `Summarize this financial report in 3-4 sentences:
Budget: ₹${reportData.summary.total_budget}
Invested: ₹${reportData.summary.total_invested}
Utilization: ${reportData.summary.budget_utilization}%
Material Costs: ₹${reportData.summary.total_material_cost}
Wage Costs: ₹${reportData.summary.total_wages}`;

    case "project_progress":
      return `Summarize this project progress report in 3-4 sentences:
Total Items: ${reportData.summary.plan_items.total}
Completed: ${reportData.summary.plan_items.completed} (${reportData.summary.plan_items.completion_percentage}%)
Delayed: ${reportData.summary.plan_items.delayed}
DPRs: ${reportData.summary.total_dprs}`;

    case "attendance":
      return `Summarize this attendance report in 3-4 sentences:
Total Hours: ${reportData.summary.total_hours}
Unique Labours: ${reportData.summary.unique_labours}
Avg Hours/Labour: ${reportData.summary.avg_hours_per_labour}
Manual Entries: ${reportData.summary.manual_entries}`;

    case "materials":
      return `Summarize this material report in 3-4 sentences:
Requests: ${reportData.summary.requests.total_requests} (${reportData.summary.requests.approved} approved)
Bills: ${reportData.summary.bills.total_bills} (${reportData.summary.bills.approved} approved)
Total Amount: ₹${reportData.summary.bills.total_approved_amount}`;

    case "audit":
      return `Summarize this audit report in 3-4 sentences:
Total Audits: ${reportData.summary.total_audits}
Unique Users: ${reportData.summary.unique_users}
Categories: ${reportData.summary.unique_categories}`;

    default:
      return `Summarize this report: ${JSON.stringify(reportData.summary)}`;
  }
}

/**
 * Build anomaly detection prompt
 */
function buildAnomalyPrompt(reportData, reportType) {
  return `Identify anomalies or risks in this ${reportType} report. List each anomaly with severity (low/medium/high):

${JSON.stringify(reportData, null, 2)}

Format each anomaly as:
- [Severity] Description`;
}

/**
 * Parse AI anomaly response into structured format
 */
function parseAnomalies(content) {
  const lines = content
    .split("\n")
    .filter((line) => line.trim().startsWith("-"));

  return lines.map((line) => {
    const match = line.match(/\[(\w+)\]\s*(.+)/);
    if (match) {
      return {
        severity: match[1].toLowerCase(),
        description: match[2].trim(),
      };
    }
    return {
      severity: "medium",
      description: line.replace("-", "").trim(),
    };
  });
}

module.exports = {
  generateReportSummary,
  detectAnomalies,
  explainDelays,
  generateExecutiveInsights,
  generateProjectInsights,
};
