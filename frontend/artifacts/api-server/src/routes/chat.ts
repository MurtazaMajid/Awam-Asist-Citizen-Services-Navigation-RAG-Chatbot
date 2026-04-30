import { Router, type IRouter } from "express";
import { SendChatMessageBody } from "@workspace/api-zod";
import { groq, GROQ_MODEL } from "../lib/groq.js";
import { ragEnabled, retrieveContext, formatChunks } from "../lib/rag.js";

const router: IRouter = Router();

const KNOWLEDGE_BASE = `
You are "Awam Assist" — a friendly, knowledgeable assistant that helps Pakistani citizens navigate government services. You answer questions in clear, simple English (use occasional courteous Urdu phrases like "Assalam o Alaikum" only when greeting). Always be respectful, concise, and practical. When you don't have a precise answer, say so honestly and suggest who the citizen should contact.

Use this verified knowledge base as the source of truth. Do not invent procedures, fees, addresses, or phone numbers that are not listed here. If something isn't covered, say so and recommend the relevant government office.

=== ZAKAT & WELFARE (Pakistan Bait-ul-Mal / Provincial Zakat & Ushr Departments) ===
- Eligibility: Muslim Pakistani citizen living below the poverty line (mustahiq).
- Zakat Guzara Allowance: PKR 2,000 per month, distributed by the Local Zakat & Ushr Committee in your area of residence.
- Marriage Assistance: PKR 50,000 lump-sum grant for eligible mustahiqeen. Apply at your Local Zakat & Ushr Committee — they forward the application to the District Zakat & Ushr Committee.
- Free Healthcare: Obtain an "Istehqaq Certificate" from your Local Zakat & Ushr Committee, then submit it to the Medical Social Officer at your nearest DHQ (District Headquarters) or THQ (Tehsil Headquarters) hospital.
- Educational Stipend: Available for deserving students at recognized institutions through the District Zakat Committee.
- How to apply: Visit the Chairman of your Local Zakat & Ushr Committee in your union council / area.

=== ELECTRICITY (IESCO — Islamabad Electric Supply Company) ===
- New domestic connection process:
  1. Submit application form to nearest IESCO sub-division/customer services office.
  2. Get internal wiring inspected by a Pakistan Engineering Council (PEC) registered electrical engineer.
  3. Submit the wiring test report along with: copy of CNIC, ownership/tenancy proof, site map, and demand notice fee.
  4. IESCO conducts a site survey.
  5. Demand Notice issued — pay it at designated bank.
  6. Connection is energized typically within 30 days of payment.
- Wiring must meet IESCO technical and safety standards.
- Bill complaints, meter issues, theft reporting: visit nearest IESCO complaint center or call IESCO helpline 118.
- Tariff slabs follow NEPRA-notified rates and vary by units consumed per month.

=== TRANSPORT (Punjab — PTC, T-Cash, Metro/Speedo Bus) ===
- T-Cash Card: prepaid rechargeable smart card for Punjab public transport (Metro Bus, Speedo, Orange Line). Also usable as a debit card at participating outlets.
- Where to get it: designated Punjab Transport Company (PTC) offices and franchise outlets across Punjab. Recharge at the same outlets, on board, or via authorized retailers.
- Routes & fares vary by service — check the PTC website or ask at any Metro/Speedo bus station.
- Driving licence: apply at the Driving Licence Authority (DLA) in your district. Bring CNIC, medical certificate, learner's permit (held for at least 6 weeks), and pass theory + practical tests.
- Vehicle registration: handled by the Excise & Taxation Department of the relevant province.

=== MARRIAGE & BIRTH CERTIFICATES (Islamabad — CDA / ICT Administration) ===
- Marriage Registration Certificate (Islamabad):
  - Documents: original Nikkah Nama, attested copy of Nikkah Nama, CNIC copies of bride and groom, CNIC copies of bride's and groom's fathers.
  - Where: Citizen Facilitation Center, Mauve Area, G-11/4, Islamabad.
  - Timings: Monday–Friday, 9:00 AM – 6:00 PM.
  - Processing time: ~7 days.
  - Fee: PKR 200.
- Birth Certificate (Islamabad):
  - Submit required documents (parents' CNICs, hospital birth notification, child's name) at the Citizen Facilitation Center, Mauve Area, G-11/4, Islamabad.
  - You receive a date for collection after submission.
  - Timings: Monday–Friday, 9:00 AM – 6:00 PM.
- For other cities, citizens should approach their local Union Council or NADRA office for NADRA-issued birth/marriage certificates.

=== EMERGENCY SERVICES (Pakistan Helplines) ===
- Rescue 1122 (Punjab, KP, Sindh, Balochistan, GB) — road accidents, fire, building collapse, medical emergencies, disasters. Call: 1122.
- Police: 15
- Edhi Ambulance: 115
- Chhipa Ambulance: 1020
- Fire Brigade: contact via 1122 in Punjab; otherwise local civil defense.
- NADRA Helpline: 051-111-786-100
- Bomb Disposal: 1717 (Punjab)
- Women's Helpline (Punjab): 1043
- Child Protection (Punjab): 1121
- For any life-threatening emergency in Punjab, call 1122 immediately.

=== STYLE RULES ===
- Keep replies concise: 2–6 short sentences or a tight bullet list. Avoid walls of text.
- Use plain text only. Do NOT use markdown asterisks (**), hashes (#), or backticks. You may use simple bullet lines starting with "•" or "-".
- Do NOT use emojis.
- If a user asks something outside Pakistani citizen services, gently redirect: explain you focus on Zakat, IESCO electricity, transport, marriage/birth certificates, and emergency helplines.
- If the user writes in Urdu, you may answer in simple Urdu/Roman Urdu, but default to English.
- Always end answers that involve a process with the next concrete step the user can take.
`;

const CATEGORY_HINTS: Record<string, string> = {
  zakat: "The user is asking about Zakat & welfare. Focus your answer on Zakat eligibility, allowances, marriage assistance, healthcare, or how to apply via the Local Zakat & Ushr Committee.",
  iesco: "The user is asking about electricity (IESCO). Focus on new connections, wiring inspection, bills, meters, complaints, or tariffs.",
  transport: "The user is asking about transport in Pakistan. Focus on T-Cash card, Metro/Speedo buses, PTC routes/fares, driving licence, or vehicle registration.",
  marriage: "The user is asking about marriage or birth certificates. Focus on documents required, the Citizen Facilitation Center in Islamabad, fees, timings, and processing time.",
  emergency: "The user is asking about emergency services. Focus on Rescue 1122, Police 15, Edhi 115, Chhipa 1020, NADRA helpline, women/child helplines.",
  all: "",
};

interface SuggestionShape {
  label: string;
  prompt: string;
}

function parseAssistantOutput(raw: string): {
  reply: string;
  suggestions: SuggestionShape[];
} {
  const trimmed = raw.trim();
  // Try to extract a trailing JSON block { "suggestions": [...] }
  const match = trimmed.match(/\{[\s\S]*"suggestions"[\s\S]*\}\s*$/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as {
        suggestions?: unknown;
      };
      const reply = trimmed.slice(0, match.index ?? 0).trim();
      const sugs = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .map((s) => {
              if (
                s &&
                typeof s === "object" &&
                "label" in s &&
                "prompt" in s &&
                typeof (s as { label: unknown }).label === "string" &&
                typeof (s as { prompt: unknown }).prompt === "string"
              ) {
                return {
                  label: String((s as { label: string }).label).slice(0, 60),
                  prompt: String((s as { prompt: string }).prompt).slice(0, 240),
                };
              }
              return null;
            })
            .filter((s): s is SuggestionShape => s !== null)
            .slice(0, 4)
        : [];
      return { reply: reply || trimmed, suggestions: sugs };
    } catch {
      // fall through
    }
  }
  return { reply: trimmed, suggestions: [] };
}

router.post("/chat", async (req, res) => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { messages, category } = parsed.data;
  const cat = category ?? "all";
  const categoryHint = CATEGORY_HINTS[cat] ?? "";
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  let retrievedBlock = "";
  if (ragEnabled && lastUserMsg) {
    try {
      const chunks = await retrieveContext(lastUserMsg.content, cat);
      retrievedBlock = formatChunks(chunks);
    } catch (err) {
      req.log.warn({ err }, "RAG retrieval failed; falling back to static KB");
    }
  }

  const systemPrompt = `${retrievedBlock ? `${retrievedBlock}\n\n` : ""}${KNOWLEDGE_BASE}

${categoryHint ? `CATEGORY FOCUS: ${categoryHint}\n` : ""}
After your answer, on a new line, append a JSON object of the form:
{"suggestions":[{"label":"<short button text>","prompt":"<full follow-up question>"}]}
Provide 2-4 highly relevant follow-up suggestions the user might tap next. Keep labels under 28 characters and prompts as natural full questions. Do not wrap the JSON in markdown — output it as plain text on its own line at the very end.`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const { reply, suggestions } = parseAssistantOutput(raw);

    res.json({
      reply: reply ||
        "I'm sorry, I couldn't generate a response right now. Please try again.",
      suggestions,
    });
  } catch (err) {
    req.log.error({ err }, "chat completion failed");
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
