

// /app/api/lookup/route.js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word");
  if (!word) return new Response(JSON.stringify({ meaning: "No word" }), { status: 400 });

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    console.log('line 12',word, data);
    console.log('line 13',word, data[0]?.meanings[0]);
    const meaning = data[0]?.meanings[0]?.definitions[0]?.definition || "Not found";

    return new Response(JSON.stringify({ meaning }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ meaning: "Error fetching meaning" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
