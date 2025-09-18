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
  const [openAccordion, setOpenAccordion] = useState(null); // track which letter is open

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
    "everybody",
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
    const wordPositions = [];

    textContent.items.forEach((item) => {
      const splitWords = item.str
        .replace(/[^a-zA-Z0-9]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.toLowerCase())
        .filter((w) => !STOP_WORDS.has(w));

      splitWords.forEach((w) => wordsSet.add(w));

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

    if (highlightedWord) {
      highlightWordOnCanvas(highlightedWord, wordPositions, ctx);
    }

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

  function handleWordClick(word,e) {
    const canvas = document.getElementById("pdfCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderPage(pdfDoc, currentPage);

    const positions = canvas.wordPositions || [];
    highlightWordOnCanvas(word, positions, ctx);

    const rect = e.target.getBoundingClientRect(); // where you clicked
    setTooltip({
      word,
      x: rect.right -25, // show tooltip just beside clicked word
      y: rect.top,
      show: true,
    });
    setTimeout(() => {
      setTooltip((prev) => ({ ...prev, show: false }));
    }, 6000);

    if (!meanings[word]) fetchMeaning(word);
  }

useEffect(() => {
  function handleOutsideClick(e) {
    // if tooltip is showing and click not inside it, hide
    console.log("line 264 tooltip.show");
    const tooltipEl = document.getElementById("tooltip-box");
    if (tooltip.show && tooltipEl && !tooltipEl.contains(e.target)) {
      setTooltip((prev) => ({ ...prev, show: false }));
    }
  }

  document.addEventListener("mousedown", handleOutsideClick);
  return () => document.removeEventListener("mousedown", handleOutsideClick);
}, [tooltip.show]);


  async function fetchMeaning(word) {
    try {
      const res = await fetch(`/api/lookup?word=${word}`);
      const data = await res.json();
      console.log("data line 265", data);
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

  // group words by first letter
  const groupedWords = pageWords.reduce((acc, word) => {
    const firstLetter = word[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(word);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", height: "100%", background: "#f7f7f7" }}>
      {/* Left: PDF Viewer */}
      <div
        style={{
          width: "75%",
          // position: "relative",
          background: "#f7f7f7",
          height: "100%",
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="font-bold text-blue-500 border border-blue-500
          rounded-md px-2 py-1 bg-white hover:bg-blue-500
           hover:text-white transition duration-300 ease-in-out cursor-pointer"
        />
        <div
          style={{
            marginTop: "10px",
            background: "#f7f7f7",
            display: "flex",
            justifyContent: "start",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <span style={{ marginLeft: "10px" }}>
            Page: {currentPage}/{pdfDoc ? pdfDoc.numPages : 0}
          </span>

          <div className="ml-5 flex w-[100px] bg-amber-200 justify-around items-end">
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
            display: "flex",
            overflow: "auto",
            border: "6px solid #ccc",
            // position: "relative",
            marginTop: "2px",
            background: "#f7f7f7",
            justifyContent: "center",
          }}
        ></div>

        {tooltip.show && (
          <div
          id="tooltip-box"
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              background: "#fff",
              border: "1px solid #3lop3",
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

      {/* Right: Accordion words */}
      <div
        style={{
          width: "32%",
          border: "2px solid #888",
          padding: "1",
          overflowY: "none",
          height: "100vh",
          background: "#f7f7f7",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          flexWrap: "wrap",
          gap: "4px",
          alignContent: "start",
          justifyContent: "flex-start",
        }}
      >
        {Object.keys(groupedWords)
          .sort()
          .map((letter) => (
            <div
              key={letter}
              style={{
                border: "1px solid #ccc",
                marginBottom: "4px",
                borderRadius: "4px",
                background: "#eee",
                width: "20%",
                display: "flex",
              }}
            >
              {/* Accordion Header */}
              <div
                style={{
                  padding: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",

                  background: openAccordion === letter ? "#ddd" : "#f2f2f2",
                }}
                onClick={() =>
                  setOpenAccordion(openAccordion === letter ? null : letter)
                }
              >
                {letter}
              </div>

              {/* Accordion Content */}
              {openAccordion === letter && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1px",
                    padding: "4px",
                    background: "#fff",
                    zIndex: 180,
                    position: "relative",
                  }}
                >
                  {groupedWords[letter].map((word) => (
                    <div
                      key={word}
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "3px",
                        textAlign: "start",
                        width: "fit-content",
                        cursor: "pointer",
                        background: "#FFCCCB",
                        padding: "2px 4px",
                      }}
                      onClick={(e) => {
                        setHighlightedWord(word);
                        handleWordClick(word,e);
                      }}
                    >
                      {word}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
