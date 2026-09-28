const {GoogleGenAI} = require("@google/genai");
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const findEchoMatches = async (originalEcho, candidates) => {
  const candidateText = buildCandidateText(candidates);

  const prompt = createEchoMatchingPrompt(
      originalEcho,
      candidateText,
  );

  const response = await callGeminiForEchoMatches(prompt);
  const results = parseEchoMatchResponse(response);
  return formatEchoMatches(results, candidates);
};

const buildCandidateText = (candidates) => {
  return candidates.map((candidate) => {
    return `
ECHO_ID: ${candidate.echoId}

ECHO:
${candidate.echo}
        `;
  });
};

const createEchoMatchingPrompt = (originalEcho, candidateText) => {
  return `
You are a dream similarity analysis AI.

You will receive:

1. One ORIGINAL DREAM.
2. Multiple OTHER DREAMS.

Your job is to determine how similar each other dream is to the original dream.

Similarity should consider:

- Main events
- People or characters
- Places
- Actions
- Objects
- Emotions
- Themes
- Situations
- Overall meaning/context

Do NOT require the dreams to use the same words.

For example:

"Being chased by a large black dog"

and

"Running away from a frightening wolf"

should have meaningful similarity because the central situation is similar.

However, dreams should NOT receive a high score simply because they contain generic things like:

- sleeping
- being outside
- seeing people
- feeling happy
- feeling scared

Give each dream a similarity score from 0 to 100.

100 = extremely similar
90 = very similar
75 = strongly similar
50 = moderately similar
25 = weakly similar
0 = unrelated

Return ONLY JSON.

ORIGINAL DREAM:
${originalEcho}

OTHER DREAMS:
${candidateText}
`;
};

const callGeminiForEchoMatches = async (prompt) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",

    contents: prompt,

    config: {
      responseMimeType: "application/json",

      responseSchema: {
        type: "ARRAY",

        items: {
          type: "OBJECT",

          properties: {
            echoId: {
              type: "STRING",
            },

            similarityScore: {
              type: "NUMBER",
            },
          },

          required: [
            "echoId",
            "similarityScore",
          ],
        },
      },
    },
  });

  return response.text;
};


const parseEchoMatchResponse = (responseText) => {
  const cleanedText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

  return JSON.parse(cleanedText);
};

const formatEchoMatches = (results, candidates) => {
  const candidateMap = new Map();

  for (const candidate of candidates) {
    candidateMap.set(
        candidate.echoId,
        candidate,
    );
  }

  return results
      .map((result) => {
        const candidate = candidateMap.get(
            result.echoId,
        );

        if (!candidate) {
          return null;
        }

        let score = Number(
            result.similarityScore,
        );

        if (Number.isNaN(score)) {
          score = 0;
        }

        score = Math.max(
            0,
            Math.min(100, score),
        );

        return {
          echoId: candidate.echoId,
          chatId: candidate.chatId,
          similarityScore: Math.round(score),
          echo: candidate.echo,
          timestamp: candidate.timestamp,
        };
      })
      .filter(Boolean);
};


module.exports = {findEchoMatches};

