
export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  const respond = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });

  if (request.method !== "POST") {
    return respond({ error: "Gebruik POST." }, 405);
  }

  try {
    const { review, rating, bedrijfsnaam } =
      await request.json();

    if (
      typeof review !== "string" ||
      !review.trim() ||
      review.length > 3000
    ) {
      return respond({ error: "Ongeldige review." }, 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return respond({ error: "AI is niet ingesteld." }, 500);
    }

    const prompt = `
Je bent ReactieAssistent, een professionele
Nederlandstalige klantenservice-assistent.

Schrijf één persoonlijk antwoord op deze review.

Bedrijf: ${String(bedrijfsnaam || "ons bedrijf").slice(0, 100)}
Sterren: ${Number(rating) || "onbekend"}
Review: ${review}

Regels:
- Reageer vriendelijk en professioneel.
- Gebruik maximaal 80 woorden.
- Bedank de klant voor de feedback.
- Toon begrip bij negatieve ervaringen.
- Beloof geen compensatie of terugbetaling.
- Verzin geen feiten of bedrijfsbeleid.
- Deel geen persoonsgegevens.
- Geef uitsluitend de antwoordtekst.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7
          }
        })
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return respond(
        { error: "AI-aanvraag mislukt. Controleer de instellingen." },
        502
      );
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return respond({ error: "Geen AI-antwoord ontvangen." }, 502);
    }

    return respond({ antwoord: answer });
  } catch (error) {
    console.error("ReactieAssistent error:", error);
    return respond({ error: "Er ging iets mis." }, 500);
  }
};
