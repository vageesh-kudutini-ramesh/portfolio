exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  let messages, systemInstruction;

  try {
    const parsed = JSON.parse(event.body);
    messages = parsed.messages;
    systemInstruction = parsed.systemInstruction;
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  // Convert Gemini format to OpenAI format (OpenRouter uses OpenAI format)
  const openAIMessages = [
    { role: "system", content: systemInstruction.parts[0].text },
    ...messages.map(m => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.parts[0].text
    }))
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://vageeshkr-dev.netlify.app",
        "X-Title": "Vageesh Portfolio Chatbot"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: openAIMessages,
        max_tokens: 400,
        temperature: 0.85
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API error:", response.status, errText);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "API error", detail: errText }),
      };
    }

    const data = await response.json();
    console.log("OpenRouter response received successfully");

    // Convert OpenAI format back to Gemini format so frontend works unchanged
    const reply = data.choices[0].message.content;
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text: reply }] } }]
      }),
    };
  } catch (error) {
    console.error("Function error:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to reach API", detail: error.message }),
    };
  }
};
