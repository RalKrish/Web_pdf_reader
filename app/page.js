"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [pdfjsLib, setPdfjsLib] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWords, setPageWords] = useState([]); // words for current page
  const [meanings, setMeanings] = useState({});
  const [tooltip, setTooltip] = useState({ word: "", x: 0, y: 0, show: false });
  const [pdfDoc, setPdfDoc] = useState(null);
  const [highlightedWord, setHighlightedWord] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js";
    script.onload = () => {
      setPdfjsLib(window.pdfjsLib);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const pdfData = new Uint8Array(reader.result);
      if (pdfjsLib) loadPDF(pdfData);
    };
    reader.readAsArrayBuffer(file);
  }

  // Add at the top, below imports
  const STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "if",
    "in",
    "on",
    "at",
    "for",
    "with",
    "by",
    "to",
    "of",
    "he",
    "she",
    "it",
    "they",
    "him",
    "her",
    "his",
    "hers",
    "them",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "shall",
    "should",
    "can",
    "could",
    "may",
    "might",
    "must",
    "also",
    "so",
    "some",
    "any",
    "all",
    "this",
    "that",
    "these",
    "those",
    "from",
    "as",
    "not",
    "no",
    "into",
    "up",
    "down",
    "out",
    "about",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "very",
    "more",
    "most",
    "such",
    "own",
    "same",
    "other",
    "than",
    "too",
    "just",
    "like",
    "over",
    "after",
    "before",
    "between",
    "each",
    "because",
    "while",
    "during",
    "above",
    "below",
    "off",
    "now",
    "only",
    "ever",
    "never",
    "both",
    "few",
    "many",
    "much",
    "another",
    "anyone",
    "every",
    "everyone",
    "everything",
    "someone",
    "something",
    "nothing",
    "something",
    "nothing",
    "everybody",
    "someone",
    "anybody",
    "who",
    "whom",
    "whose",
    "which",
    "what",
    "where",
    "when",
    "why",
    "how",
  ]);

  async function loadPDF(data) {
    const doc = await pdfjsLib.getDocument({ data }).promise;
    setPdfDoc(doc);
    renderPage(doc, 1); // render first page
  }

  async function renderPage(doc, pageNum) {
    const page = await doc.getPage(pageNum);
    setCurrentPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const container = document.getElementById("pdfContainer");
    container.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.id = "pdfCanvas";
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    container.appendChild(canvas);

    // Extract text and words
    const textContent = await page.getTextContent();
    const wordsSet = new Set();

    // Save positions for highlights
    const wordPositions = [];

    textContent.items.forEach((item) => {
      const splitWords = item.str
        .replace(/[^a-zA-Z0-9]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.toLowerCase())
        .filter((w) => !STOP_WORDS.has(w)); // remove common words

      splitWords.forEach((w) => wordsSet.add(w));

      // Save positions for highlight
      const transform = item.transform;
      splitWords.forEach((w) => {
        wordPositions.push({
          word: w,
          x: transform[4] * viewport.scale,
          y: viewport.height - transform[5] * viewport.scale,
          width: (item.width / splitWords.length) * viewport.scale,
          height: item.height * viewport.scale,
        });
      });
    });

    setPageWords(Array.from(wordsSet).sort((a, b) => a.localeCompare(b)));

    // Draw highlight if any
    if (highlightedWord) {
      highlightWordOnCanvas(highlightedWord, wordPositions, ctx);
    }

    // Attach word positions for future highlights
    canvas.wordPositions = wordPositions;
  }

  function highlightWordOnCanvas(word, positions, ctx) {
    positions.forEach((pos) => {
      if (pos.word === word) {
        ctx.fillStyle = "rgba(255,255,0,0.5)";
        ctx.fillRect(pos.x, pos.y - pos.height, pos.width, pos.height);
      }
    });
  }

  function handleWordClick(word) {
    const canvas = document.getElementById("pdfCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Re-render page to redraw canvas
    renderPage(pdfDoc, currentPage);

    // Highlight clicked word
    const positions = canvas.wordPositions || [];
    highlightWordOnCanvas(word, positions, ctx);

    // Show tooltip
    const rect = canvas.getBoundingClientRect();
    setTooltip({
      word,
      x: rect.x + rect.width / 2,
      y: rect.y + 20,
      show: true,
    });
    if (!meanings[word]) fetchMeaning(word);
  }

  async function fetchMeaning(word) {
    try {
      const res = await fetch(`/api/lookup?word=${word}`);
      const data = await res.json();
      setMeanings((prev) => ({ ...prev, [word]: data.meaning || "Not found" }));
    } catch {
      setMeanings((prev) => ({ ...prev, [word]: "Error fetching meaning" }));
    }
  }

  const nextPage = () => {
    if (pdfDoc && currentPage < pdfDoc.numPages)
      renderPage(pdfDoc, currentPage + 1);
  };
  const prevPage = () => {
    if (pdfDoc && currentPage > 1) renderPage(pdfDoc, currentPage - 1);
  };

  return (
    <div style={{ display: "flex", height: "90vh" }}>
      <div style={{ flex: 2, position: "relative" }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
        />
        <div
          style={{
            marginTop: "10px",
            background: "#f0f0f0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span style={{ marginLeft: "10px" }}>
            Page: {currentPage}/{pdfDoc ? pdfDoc.numPages : 0}
          </span>

          <div className="ml-5 flex w-[200px] bg-amber-200 justify-around items-end">
            <div>
              <button onClick={prevPage} disabled={currentPage === 1}>
                Prev
              </button>
            </div>
            <div>
              <button
                onClick={nextPage}
                disabled={pdfDoc && currentPage === pdfDoc.numPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
        <div
          id="pdfContainer"
          style={{
            flex: 1,
            overflow: "auto",
            border: "1px solid #ccc",
            position: "relative",
            marginTop: "10px",
          }}
        ></div>

        {tooltip.show && (
          <div
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              background: "#fff",
              border: "1px solid #333",
              padding: "5px",
              borderRadius: "4px",
              zIndex: 1000,
              maxWidth: "200px",
              boxShadow: "0px 2px 5px rgba(0,0,0,0.3)",
            }}
          >
            <strong>{tooltip.word}</strong>:{" "}
            {meanings[tooltip.word] || "Loading..."}
          </div>
        )}
      </div>

      {/* Right side: page words in 4 cols, scrollable */}
      <div
        style={{
          flex: 1,
          border: "2px solid #888",
          padding: "10px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "2px",
          overflowY: "auto",
          height: "100vh",
        }}
      >
        {pageWords.map((word) => (
          <div
            key={word}
            style={{
              border: "1px solid #ccc",
              borderRadius: "3px",
              textAlign: "start",
              cursor: "pointer",
              background: "#f7f7f7",
            }}
            onClick={() => {
              setHighlightedWord(word);
              handleWordClick(word);
            }}
          >
            {word}
          </div>
        ))}
      </div>
    </div>
  );
}
