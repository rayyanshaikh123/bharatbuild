const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function extractBillData(base64Image) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Extract the following details from this construction material bill image in JSON format:
              - vendor_name (string)
              - bill_number (string)
              - date (string, YYYY-MM-DD or as found)
              - items (array of { name, quantity, unit, rate, amount })
              - total_amount (number)
              - gst_amount (number)
              
              Return ONLY the JSON object.`,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("[OCR Service] Extraction failed:", error.message);
        throw error;
    }
}

module.exports = { extractBillData };
