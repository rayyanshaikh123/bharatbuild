/**
 * AI Service
 * Provides AI-powered features with pluggable provider support
 *
 * CONFIGURATION:
 * Set AI_PROVIDER environment variable to: 'openai' | 'gemini' | 'huggingface'
 * Set corresponding API key: OPENAI_API_KEY | GEMINI_API_KEY | HUGGINGFACE_API_KEY
 */

const pool = require("../db");

// AI Provider configuration
const AI_PROVIDER = process.env.AI_PROVIDER || "placeholder";
const AI_API_KEY = getApiKey();

function getApiKey() {
  switch (AI_PROVIDER) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "huggingface":
      return process.env.HUGGINGFACE_API_KEY;
    default:
      return null;
  }
}

/**
 * Extract materials from DPR text
 * @param {string} dprText - Raw DPR description text
 * @returns {Object} Extracted materials with confidence score
 */
async function extractMaterialsFromDPR(dprText) {
  // Placeholder implementation - returns mock data
  // TODO: Integrate with actual AI provider when decided

  if (AI_PROVIDER === "placeholder") {
    console.log("[AI Service] Using placeholder material extraction");
    return placeholderExtractMaterials(dprText);
  }

  // Future implementation will call actual AI provider
  try {
    switch (AI_PROVIDER) {
      case "openai":
        return await extractWithOpenAI(dprText);
      case "gemini":
        return await extractWithGemini(dprText);
      case "huggingface":
        return await extractWithHuggingFace(dprText);
      default:
        throw new Error(`Unknown AI provider: ${AI_PROVIDER}`);
    }
  } catch (error) {
    console.error("[AI Service] Material extraction failed:", error.message);
    // Fallback to placeholder
    return placeholderExtractMaterials(dprText);
  }
}

/**
 * Generate human-readable delay summary
 * @param {number} projectId - Project ID
 * @param {number} planItemId - Plan item ID
 * @returns {Object} Delay summary with referenced DPRs
 */
async function generateDelaySummary(projectId, planItemId) {
  const client = await pool.connect();
  try {
    // Get plan item details
    const planItem = await client.query(
      `
      SELECT * FROM plan_items WHERE id = $1 AND project_id = $2
    `,
      [planItemId, projectId],
    );

    if (planItem.rows.length === 0) {
      throw new Error("Plan item not found");
    }

    const item = planItem.rows[0];

    if (item.status !== "DELAYED") {
      return {
        summary: "This task is not marked as delayed.",
        delay_days: 0,
        referenced_dprs: [],
      };
    }

    const delayInfo = item.delay || {};
    const referencedDprs = delayInfo.referenced_dprs || [];
    const delayReason = delayInfo.delay_reason || "No reason provided";

    // Calculate delay days
    let delayDays = 0;
    if (item.completed_at && item.completed_at > item.period_end) {
      delayDays =
        (new Date(item.completed_at) - new Date(item.period_end)) /
        (1000 * 60 * 60 * 24);
    }

    // Placeholder summary generation
    if (AI_PROVIDER === "placeholder") {
      const summary =
        `${item.task_name} was delayed by ${delayDays.toFixed(1)} days. ` +
        `Planned completion: ${item.period_end.toISOString().split("T")[0]}, ` +
        `Actual completion: ${item.completed_at ? item.completed_at.toISOString().split("T")[0] : "Not completed"}. ` +
        `Reason: ${delayReason}. ` +
        (referencedDprs.length > 0
          ? `Referenced in DPRs: #${referencedDprs.join(", #")}.`
          : "");

      return {
        summary: summary,
        delay_days: parseFloat(delayDays.toFixed(2)),
        referenced_dprs: referencedDprs,
      };
    }

    // Future: Use AI to generate more sophisticated summary
    try {
      switch (AI_PROVIDER) {
        case "openai":
          return await summarizeDelayWithOpenAI(item, delayDays, delayInfo);
        case "gemini":
          return await summarizeDelayWithGemini(item, delayDays, delayInfo);
        case "huggingface":
          return await summarizeDelayWithHuggingFace(
            item,
            delayDays,
            delayInfo,
          );
        default:
          throw new Error(`Unknown AI provider: ${AI_PROVIDER}`);
      }
    } catch (error) {
      console.error(
        "[AI Service] Delay summary generation failed:",
        error.message,
      );
      // Fallback to simple summary
      return {
        summary: `${item.task_name} delayed by ${delayDays.toFixed(1)} days. Reason: ${delayReason}`,
        delay_days: parseFloat(delayDays.toFixed(2)),
        referenced_dprs: referencedDprs,
      };
    }
  } finally {
    client.release();
  }
}

// ============================================================================
// PLACEHOLDER IMPLEMENTATIONS (for testing without AI provider)
// ============================================================================

function placeholderExtractMaterials(text) {
  // Simple regex-based extraction for common patterns
  const materials = [];

  // Pattern: "X bags of cement" or "X tons steel"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(bags?|tons?|kg|kgs|pieces?|pcs)\s+(?:of\s+)?(\w+)/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      materials.push({
        item: match[3].toLowerCase(),
        quantity: parseFloat(match[1]),
        unit: match[2].toLowerCase(),
      });
    }
  });

  return {
    materials: materials,
    confidence: materials.length > 0 ? 0.7 : 0.3,
    provider: "placeholder",
  };
}

// ============================================================================
// AI PROVIDER STUBS (to be implemented when provider is chosen)
// ============================================================================

async function extractWithOpenAI(text) {
  // TODO: Implement OpenAI integration
  // Example:
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4",
  //   messages: [{ role: "user", content: `Extract materials from: ${text}` }]
  // });
  throw new Error("OpenAI integration not yet implemented");
}

async function extractWithGemini(text) {
  // TODO: Implement Gemini integration
  throw new Error("Gemini integration not yet implemented");
}

async function extractWithHuggingFace(text) {
  // TODO: Implement HuggingFace integration
  throw new Error("HuggingFace integration not yet implemented");
}

async function summarizeDelayWithOpenAI(item, delayDays, delayInfo) {
  // TODO: Implement OpenAI delay summary
  throw new Error("OpenAI integration not yet implemented");
}

async function summarizeDelayWithGemini(item, delayDays, delayInfo) {
  // TODO: Implement Gemini delay summary
  throw new Error("Gemini integration not yet implemented");
}

async function summarizeDelayWithHuggingFace(item, delayDays, delayInfo) {
  // TODO: Implement HuggingFace delay summary
  throw new Error("HuggingFace integration not yet implemented");
}

module.exports = {
  extractMaterialsFromDPR,
  generateDelaySummary,
};
