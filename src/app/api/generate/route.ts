import { NextRequest, NextResponse } from "next/server";

// Simple helper to extract a JSON object from a text blob
function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // fallthrough
    }
  }
  throw new Error("Failed to parse JSON from model response");
}

export async function POST(req: NextRequest) {
  try {
    const { word } = await req.json();
    if (!word || typeof word !== "string") {
      return NextResponse.json(
        { error: "Missing 'word'" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    // Use higher-quality model for better lexical data
    const model = "gemini-1.5-pro";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a corpus linguistics assistant. Build realistic collocation profiles for the English lemma "${word}".
Strictly output ONLY valid JSON (no markdown, no comments) with this schema:
{
  "senses": [
    {"id": "${word}.s1", "label": "short label", "gloss": "concise definition"},
    {"id": "${word}.s2", "label": "short label", "gloss": "concise definition"}
  ],
  "profiles": [
    {
      "sense_id": "${word}.s1",
      "top_collocations": [
        {"token": "string", "freq": 240, "pmi": 3.4, "position": "left"},
        {"token": "string", "freq": 160, "pmi": 2.7, "position": "right"}
      ]
    }
  ],
  "examples": [
    {"sentence": "short example sentence using ${word}", "sense_id": "${word}.s1"}
  ],
  "graph": {
    "nodes": [
      {"id": "${word}", "group": "target"}
    ],
    "links": []
  }
}
Constraints:
- Provide 2–4 senses. Keep labels compact (e.g., "motion", "manage/operate").
- For each sense provide 8–12 collocations sorted by freq (desc).
- token: lowercased collocate (may be bigram like "make sure"). Avoid duplicates across senses where possible.
- freq: realistic integer frequency (range ~5–800).
- pmi: realistic float (0.5–6.5). Higher for more specific collocates.
- position: "left" if collocate tends to appear before the target, else "right".
- Provide 4–8 diverse example sentences; each maps to one of the sense ids.
- Build a graph from ALL profiles: take the top 20 collocates by summed freq across senses; nodes are the target and these collocates; links connect the target to each collocate with weight = summed freq.
- Return JSON only.`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json(
        { error: "Gemini request failed", details: err },
        { status: 502 },
      );
    }

    const result = await resp.json();
    const text = result?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("") || "";

    const parsed = extractJson(text);

    // Normalize and fill graph if missing
    const profiles = Array.isArray(parsed?.profiles) ? parsed.profiles : [];

    // Normalize positions
    for (const p of profiles) {
      if (Array.isArray(p?.top_collocations)) {
        for (const c of p.top_collocations) {
          const pos = String(c?.position || "right").toLowerCase();
          c.position = pos === "before" ? "left" : pos === "after" ? "right" : (pos === "left" || pos === "right" ? pos : "right");
          c.freq = Math.max(1, Math.floor(Number(c?.freq) || 1));
          c.pmi = Math.max(0, Number(c?.pmi) || 0);
          c.token = String(c?.token || "").toLowerCase();
        }
      }
    }

    function buildGraph() {
      const map = new Map<string, number>();
      for (const p of profiles) {
        for (const c of p?.top_collocations || []) {
          const prev = map.get(c.token) || 0;
          map.set(c.token, prev + (Number(c.freq) || 0));
        }
      }
      const top = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
      const nodes = [{ id: word, group: "target" as const }].concat(
        top.map(([token]) => ({ id: token, group: "collocation" as const }))
      );
      const links = top.map(([token, weight]) => ({ source: word, target: token, weight }));
      return { nodes, links };
    }

    let graph = parsed?.graph;
    const graphOk = graph && Array.isArray(graph.nodes) && Array.isArray(graph.links);
    if (!graphOk) {
      graph = buildGraph();
    }

    return NextResponse.json({ word, ...parsed, graph });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}