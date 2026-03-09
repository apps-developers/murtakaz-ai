import { NextRequest, NextResponse } from "next/server";

type Variable = { code: string; displayName: string };

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "true") {
    return NextResponse.json({ error: "AI features are disabled." }, { status: 403 });
  }

  const { description, variables } = (await req.json()) as {
    description: string;
    variables?: Variable[];
  };

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL ?? "gpt-4o";

  if (!apiKey) {
    return NextResponse.json({
      formula: "// AI_API_KEY not configured",
      explanation: "Please set the AI_API_KEY environment variable to enable this feature.",
    });
  }

  const variablesContext =
    variables && variables.length > 0
      ? `Available variables (access as vars.CODE):\n${variables.map((v) => `- vars.${v.code} (${v.displayName})`).join("\n")}`
      : "No variables defined yet.";

  const systemPrompt = `You are a KPI formula assistant. The user will describe a calculation in plain language.
Generate a JavaScript formula expression that can be evaluated safely.
Use only: arithmetic operators (+, -, *, /), Math functions, and variables from the provided list (accessed as vars.CODE).
Return a JSON object with exactly these fields:
- formula: the JavaScript expression string (single line, no function declaration)
- explanation: plain language explanation of what the formula does (1-2 sentences)
- example: optional example calculation showing sample values and result

${variablesContext}

IMPORTANT: Return ONLY valid JSON, no markdown, no code fences.`;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { formula?: string; explanation?: string; example?: string };

    return NextResponse.json({
      formula: parsed.formula ?? "",
      explanation: parsed.explanation ?? "",
      example: parsed.example,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
