// /app/api/lookup/route.js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word");
  if (!word)
    return new Response(JSON.stringify({ meaning: "No word" }), {
      status: 400,
    });

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    const data = await res.json();
    console.log("line 12", word, data);
    console.log("line 13", word, data[0]?.meanings[0]);
    const meaning =
      data[0]?.meanings[0]?.definitions[0]?.definition || "Not found";
    const allMeanings =
      data[0]?.meanings?.flatMap((meaningObj) =>
        meaningObj.definitions.map((defObj) => ({
          partOfSpeech: meaningObj.partOfSpeech,
          definition: defObj.definition,
          example: defObj.example || "",
          synonyms: [
            ...(defObj.synonyms || []),
            ...(meaningObj.synonyms || []),
            ...(data[0].synonyms || []),
          ],
        }))
      ) || [];

    const dmRes = await fetch(`https://api.datamuse.com/words?ml=${word}`);
    const dmData = await dmRes.json();

    const relatedWords = dmData.slice(0, 10).map((w) => w.word);

    return new Response(
      JSON.stringify({ meaning, allMeanings, relatedWords }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(JSON.stringify({ meaning: "Error fetching meaning" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
