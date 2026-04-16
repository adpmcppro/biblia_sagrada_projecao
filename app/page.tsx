"use client";

import React, { useState, useEffect } from "react";
import {
  getBible,
  BibleBook,
  BibleVersion,
  VERSION_NAMES,
  searchBible,
  SearchResult,
} from "@/lib/bible";
import {
  BookOpen,
  Search,
  Share2,
  MonitorPlay,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Mic,
  Settings,
  Maximize,
  Minimize,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BibleApp() {
  const [version, setVersion] = useState<BibleVersion>("ara");
  const [bible, setBible] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Navigation State
  const [selectedBookIdx, setSelectedBookIdx] = useState<number>(0);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(0);

  // UI Modes
  const [mode, setMode] = useState<"read" | "search">("read");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Projection State
  const [projectedVerse, setProjectedVerse] = useState<{
    text: string;
    reference: string;
    bookIdx: number;
    chapterIdx: number;
    verseIdx: number;
  } | null>(null);

  // Customization State
  const [projFontFamily, setProjFontFamily] = useState("Georgia, serif");
  const [projFontSize, setProjFontSize] = useState(5);
  const [projFontColor, setProjFontColor] = useState("#FFFFFF");
  const [projTextAlign, setProjTextAlign] = useState<"left" | "center" | "right" | "justify">("center");
  const [projBgType, setProjBgType] = useState<"color" | "gradient" | "image">("gradient");
  const [projBgColor, setProjBgColor] = useState("#07080C");
  const [projBgGradient, setProjBgGradient] = useState("radial-gradient(circle at center, #161B29 0%, #07080C 100%)");
  const [projBgImage, setProjBgImage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const FONTS = [
    { name: "Georgia, serif", label: "Georgia (Serif)" },
    { name: "'Playfair Display', serif", label: "Playfair Display" },
    { name: "'Merriweather', serif", label: "Merriweather" },
    { name: "'Lora', serif", label: "Lora" },
    { name: "'PT Serif', serif", label: "PT Serif" },
    { name: "'Roboto', sans-serif", label: "Roboto" },
    { name: "'Montserrat', sans-serif", label: "Montserrat" },
    { name: "'Open Sans', sans-serif", label: "Open Sans" },
    { name: "'Oswald', sans-serif", label: "Oswald" },
    { name: "'Lato', sans-serif", label: "Lato" },
  ];

  const resetSettings = () => {
    setProjFontFamily("Georgia, serif");
    setProjFontSize(5);
    setProjFontColor("#FFFFFF");
    setProjTextAlign("center");
    setProjBgType("gradient");
    setProjBgColor("#07080C");
    setProjBgGradient("radial-gradient(circle at center, #161B29 0%, #07080C 100%)");
    setProjBgImage("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProjBgImage(url);
      setProjBgType("image");
    }
  };

  // Voice Command State
  const [isListening, setIsListening] = useState(false);

  // Projection Fullscreen State
  const projectionRef = React.useRef<HTMLDivElement>(null);
  const [showProjMenu, setShowProjMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic Font Loading
  useEffect(() => {
    if (projFontFamily && !projFontFamily.includes("serif") && !projFontFamily.includes("sans-serif")) {
      const fontName = projFontFamily.split(",")[0].replace(/['"]/g, "").trim();
      const linkId = `font-${fontName.replace(/\s+/g, "-")}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
    }
  }, [projFontFamily]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      projectionRef.current?.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleVoiceCommand = (transcript: string) => {
    let foundBookIdx = -1;
    let maxMatchLength = 0;
    
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedTranscript = normalize(transcript);

    for (let i = 0; i < bible.length; i++) {
      const normalizedBook = normalize(bible[i].name);
      if (normalizedTranscript.includes(normalizedBook) && normalizedBook.length > maxMatchLength) {
        foundBookIdx = i;
        maxMatchLength = normalizedBook.length;
      }
    }

    if (foundBookIdx !== -1) {
      const numbers = transcript.match(/\d+/g);
      let chapterIdx = 0;
      let verseIdx = 0;
      if (numbers && numbers.length >= 1) {
        chapterIdx = parseInt(numbers[0]) - 1;
      }
      if (numbers && numbers.length >= 2) {
        verseIdx = parseInt(numbers[1]) - 1;
      }

      const book = bible[foundBookIdx];
      if (chapterIdx >= 0 && chapterIdx < book.chapters.length) {
        const chapter = book.chapters[chapterIdx];
        if (verseIdx >= 0 && verseIdx < chapter.length) {
          setProjectedVerse({
            text: chapter[verseIdx],
            reference: `${book.name} ${chapterIdx + 1}:${verseIdx + 1}`,
            bookIdx: foundBookIdx,
            chapterIdx: chapterIdx,
            verseIdx: verseIdx,
          });
          setSelectedBookIdx(foundBookIdx);
          setSelectedChapterIdx(chapterIdx);
          return;
        }
      }
    }

    setSearchQuery(transcript);
    setMode("search");
    setSearchResults(searchBible(bible, transcript));
  };

  const startVoiceCommand = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Seu navegador não suporta comandos de voz. Tente usar o Google Chrome.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => {
        console.error("Voice recognition error:", e.error);
        if (e.error === 'not-allowed') {
          alert("Permissão de microfone negada. Por favor, permita o acesso ao microfone no seu navegador.");
        } else {
          alert(`Erro no comando de voz: ${e.error}`);
        }
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
      };
      recognition.start();
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar o comando de voz.");
      setIsListening(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("");

    getBible(version)
      .then((data) => {
        if (isMounted) {
          setBible(data);
          setLoading(false);
          // Reset chapter if the new version has fewer chapters (rare, but safe)
          if (data[selectedBookIdx]?.chapters.length <= selectedChapterIdx) {
            setSelectedChapterIdx(0);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError("Erro ao carregar a Bíblia. Verifique sua conexão.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [version, selectedBookIdx, selectedChapterIdx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!projectedVerse || !bible.length) return;

      if (e.key === "Escape") {
        setProjectedVerse(null);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        // Next verse
        const { bookIdx, chapterIdx, verseIdx } = projectedVerse;
        const currentBook = bible[bookIdx];
        const currentChapter = currentBook.chapters[chapterIdx];

        if (verseIdx < currentChapter.length - 1) {
          // Next verse in same chapter
          const nextVerseIdx = verseIdx + 1;
          setProjectedVerse({
            text: currentChapter[nextVerseIdx],
            reference: `${currentBook.name} ${chapterIdx + 1}:${nextVerseIdx + 1}`,
            bookIdx,
            chapterIdx,
            verseIdx: nextVerseIdx,
          });
        } else if (chapterIdx < currentBook.chapters.length - 1) {
          // First verse of next chapter
          const nextChapterIdx = chapterIdx + 1;
          setProjectedVerse({
            text: currentBook.chapters[nextChapterIdx][0],
            reference: `${currentBook.name} ${nextChapterIdx + 1}:1`,
            bookIdx,
            chapterIdx: nextChapterIdx,
            verseIdx: 0,
          });
        } else if (bookIdx < bible.length - 1) {
          // First verse of next book
          const nextBookIdx = bookIdx + 1;
          const nextBook = bible[nextBookIdx];
          setProjectedVerse({
            text: nextBook.chapters[0][0],
            reference: `${nextBook.name} 1:1`,
            bookIdx: nextBookIdx,
            chapterIdx: 0,
            verseIdx: 0,
          });
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        // Previous verse
        const { bookIdx, chapterIdx, verseIdx } = projectedVerse;

        if (verseIdx > 0) {
          // Previous verse in same chapter
          const prevVerseIdx = verseIdx - 1;
          const currentBook = bible[bookIdx];
          setProjectedVerse({
            text: currentBook.chapters[chapterIdx][prevVerseIdx],
            reference: `${currentBook.name} ${chapterIdx + 1}:${prevVerseIdx + 1}`,
            bookIdx,
            chapterIdx,
            verseIdx: prevVerseIdx,
          });
        } else if (chapterIdx > 0) {
          // Last verse of previous chapter
          const prevChapterIdx = chapterIdx - 1;
          const currentBook = bible[bookIdx];
          const prevChapter = currentBook.chapters[prevChapterIdx];
          const prevVerseIdx = prevChapter.length - 1;
          setProjectedVerse({
            text: prevChapter[prevVerseIdx],
            reference: `${currentBook.name} ${prevChapterIdx + 1}:${prevVerseIdx + 1}`,
            bookIdx,
            chapterIdx: prevChapterIdx,
            verseIdx: prevVerseIdx,
          });
        } else if (bookIdx > 0) {
          // Last verse of previous book
          const prevBookIdx = bookIdx - 1;
          const prevBook = bible[prevBookIdx];
          const prevChapterIdx = prevBook.chapters.length - 1;
          const prevChapter = prevBook.chapters[prevChapterIdx];
          const prevVerseIdx = prevChapter.length - 1;
          setProjectedVerse({
            text: prevChapter[prevVerseIdx],
            reference: `${prevBook.name} ${prevChapterIdx + 1}:${prevVerseIdx + 1}`,
            bookIdx: prevBookIdx,
            chapterIdx: prevChapterIdx,
            verseIdx: prevVerseIdx,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projectedVerse, bible]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !bible.length) return;

    setMode("search");
    const results = searchBible(bible, searchQuery);
    setSearchResults(results);
  };

  const handleShare = async (text: string, reference: string) => {
    const shareData = {
      title: reference,
      text: `"${text}" - ${reference} (${version.toUpperCase()})`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareData.text);
      alert("Texto copiado para a área de transferência!");
    }
  };

  const currentBook = bible[selectedBookIdx];
  const currentChapter = currentBook?.chapters[selectedChapterIdx] || [];

  const handlePrevChapter = () => {
    if (selectedChapterIdx > 0) {
      setSelectedChapterIdx(selectedChapterIdx - 1);
    } else if (selectedBookIdx > 0) {
      const prevBook = bible[selectedBookIdx - 1];
      setSelectedBookIdx(selectedBookIdx - 1);
      setSelectedChapterIdx(prevBook.chapters.length - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentBook && selectedChapterIdx < currentBook.chapters.length - 1) {
      setSelectedChapterIdx(selectedChapterIdx + 1);
    } else if (selectedBookIdx < bible.length - 1) {
      setSelectedBookIdx(selectedBookIdx + 1);
      setSelectedChapterIdx(0);
    }
  };

  if (projectedVerse) {
    let backgroundStyle: React.CSSProperties = {};
    if (projBgType === "color") {
      backgroundStyle = { backgroundColor: projBgColor };
    } else if (projBgType === "gradient") {
      backgroundStyle = { backgroundImage: projBgGradient };
    } else if (projBgType === "image" && projBgImage) {
      backgroundStyle = { 
        backgroundImage: `url(${projBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#000' // fallback
      };
    } else {
      backgroundStyle = { backgroundColor: "#07080C" };
    }

    return (
      <div 
        ref={projectionRef}
        className="fixed inset-0 text-white z-50 flex flex-col items-center justify-center p-8 md:p-16"
        style={backgroundStyle}
      >
        <div className="absolute top-6 right-6 flex gap-3 z-50">
          <button
            onClick={() => setShowProjMenu(!showProjMenu)}
            className="p-3 bg-black/30 hover:bg-black/50 border border-white/10 rounded-full transition-colors"
            title="Menu de Navegação"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-3 bg-black/30 hover:bg-black/50 border border-white/10 rounded-full transition-colors"
            title="Tela Cheia"
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              setProjectedVerse(null);
            }}
            className="p-3 bg-black/30 hover:bg-black/50 border border-white/10 rounded-full transition-colors"
            title="Fechar Projeção"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {showProjMenu && (
          <div className="absolute top-24 right-6 bg-[#11141D]/95 backdrop-blur-md p-5 rounded-xl border border-white/10 flex flex-col gap-5 z-50 shadow-2xl min-w-[280px] max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Navigation Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold">Navegação Rápida</h3>
              <select 
                value={projectedVerse.bookIdx} 
                onChange={e => {
                  const bIdx = Number(e.target.value);
                  setProjectedVerse({
                    text: bible[bIdx].chapters[0][0],
                    reference: `${bible[bIdx].name} 1:1`,
                    bookIdx: bIdx,
                    chapterIdx: 0,
                    verseIdx: 0
                  });
                }}
                className="bg-black/50 border border-white/20 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#D4AF37]"
              >
                {bible.map((b, i) => <option key={i} value={i}>{b.name}</option>)}
              </select>
              <div className="flex gap-2">
                <select 
                  value={projectedVerse.chapterIdx} 
                  onChange={e => {
                    const cIdx = Number(e.target.value);
                    setProjectedVerse({
                      text: bible[projectedVerse.bookIdx].chapters[cIdx][0],
                      reference: `${bible[projectedVerse.bookIdx].name} ${cIdx + 1}:1`,
                      bookIdx: projectedVerse.bookIdx,
                      chapterIdx: cIdx,
                      verseIdx: 0
                    });
                  }}
                  className="flex-1 bg-black/50 border border-white/20 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#D4AF37]"
                >
                  {bible[projectedVerse.bookIdx].chapters.map((_, i) => <option key={i} value={i}>Cap. {i + 1}</option>)}
                </select>
                <select 
                  value={projectedVerse.verseIdx} 
                  onChange={e => {
                    const vIdx = Number(e.target.value);
                    setProjectedVerse({
                      text: bible[projectedVerse.bookIdx].chapters[projectedVerse.chapterIdx][vIdx],
                      reference: `${bible[projectedVerse.bookIdx].name} ${projectedVerse.chapterIdx + 1}:${vIdx + 1}`,
                      bookIdx: projectedVerse.bookIdx,
                      chapterIdx: projectedVerse.chapterIdx,
                      verseIdx: vIdx
                    });
                  }}
                  className="flex-1 bg-black/50 border border-white/20 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#D4AF37]"
                >
                  {bible[projectedVerse.bookIdx].chapters[projectedVerse.chapterIdx].map((_, i) => <option key={i} value={i}>Ver. {i + 1}</option>)}
                </select>
              </div>
            </div>

            <div className="h-[1px] bg-white/10 w-full"></div>

            {/* Formatting Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold">Formatação</h3>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[#888B94]">Tamanho</span>
                <input 
                  type="range" 
                  min="2" max="10" step="0.5" 
                  value={projFontSize} 
                  onChange={e => setProjFontSize(Number(e.target.value))} 
                  className="w-24 accent-[#D4AF37]" 
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[#888B94]">Cor da Fonte</span>
                <input 
                  type="color" 
                  value={projFontColor} 
                  onChange={e => setProjFontColor(e.target.value)} 
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                />
              </div>
            </div>

            <div className="h-[1px] bg-white/10 w-full"></div>

            {/* Background Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold">Fundo</h3>
              <select 
                value={projBgType} 
                onChange={e => setProjBgType(e.target.value as any)} 
                className="w-full bg-black/50 border border-white/20 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#D4AF37]"
              >
                <option value="color">Cor Sólida</option>
                <option value="gradient">Degradê</option>
                <option value="image">Imagem</option>
              </select>

              {projBgType === "color" && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[#888B94]">Cor</span>
                  <input 
                    type="color" 
                    value={projBgColor} 
                    onChange={e => setProjBgColor(e.target.value)} 
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                  />
                </div>
              )}

              {projBgType === "gradient" && (
                <input 
                  type="text" 
                  value={projBgGradient} 
                  onChange={e => setProjBgGradient(e.target.value)} 
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm focus:border-[#D4AF37] outline-none" 
                  placeholder="ex: linear-gradient(to right, #000, #333)" 
                />
              )}

              {projBgType === "image" && (
                <div className="flex flex-col gap-2">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-[#888B94] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#D4AF37]/10 file:text-[#D4AF37] hover:file:bg-[#D4AF37]/20"
                  />
                  <span className="text-xs text-center text-[#888B94]">- ou URL -</span>
                  <input 
                    type="text" 
                    value={projBgImage} 
                    onChange={e => setProjBgImage(e.target.value)} 
                    className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm focus:border-[#D4AF37] outline-none" 
                    placeholder="https://..." 
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-6xl w-full flex flex-col items-center gap-8" style={{ textAlign: projTextAlign }}>
          <p 
            className="font-bold leading-[1.4] drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
            style={{ fontFamily: projFontFamily, fontSize: `${projFontSize}rem`, color: projFontColor }}
          >
            &quot;{projectedVerse.text}&quot;
          </p>
          <p className="text-xl md:text-2xl lg:text-3xl text-[#D4AF37] uppercase tracking-[4px] font-light mt-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {projectedVerse.reference} — {version.toUpperCase()}
          </p>
        </div>
        <div className="absolute bottom-8 text-white/50 text-sm flex gap-6 drop-shadow-md">
          <span>← Versículo Anterior</span>
          <span>ESC para Sair</span>
          <span>Próximo Versículo →</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080C] text-[#E0E0E0] flex flex-col font-sans">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#11141D] p-6 md:p-8 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#D4AF37]">Personalizar Projeção</h2>
              <button onClick={() => setShowSettings(false)} className="text-[#888B94] hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-[#888B94] mb-1.5">Fonte</label>
                <select 
                  value={projFontFamily} 
                  onChange={e => setProjFontFamily(e.target.value)} 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#D4AF37] outline-none"
                >
                  {FONTS.map(f => (
                    <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-[#888B94] mb-1.5">Tamanho ({projFontSize}rem)</label>
                  <input 
                    type="range" 
                    min="2" max="10" step="0.5" 
                    value={projFontSize} 
                    onChange={e => setProjFontSize(Number(e.target.value))} 
                    className="w-full accent-[#D4AF37]" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#888B94] mb-1.5">Cor da Fonte</label>
                  <input 
                    type="color" 
                    value={projFontColor} 
                    onChange={e => setProjFontColor(e.target.value)} 
                    className="w-12 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-[#888B94] mb-1.5">Alinhamento do Texto</label>
                <select 
                  value={projTextAlign} 
                  onChange={e => setProjTextAlign(e.target.value as any)} 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#D4AF37] outline-none"
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                  <option value="justify">Justificado</option>
                </select>
              </div>
              
              <div className="h-[1px] bg-white/10 w-full my-4"></div>

              <div>
                <label className="block text-sm text-[#888B94] mb-1.5">Tipo de Fundo</label>
                <select 
                  value={projBgType} 
                  onChange={e => setProjBgType(e.target.value as any)} 
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#D4AF37] outline-none"
                >
                  <option value="color">Cor Sólida</option>
                  <option value="gradient">Degradê</option>
                  <option value="image">Imagem</option>
                </select>
              </div>

              {projBgType === "color" && (
                <div>
                  <label className="block text-sm text-[#888B94] mb-1.5">Cor de Fundo</label>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="color" 
                      value={projBgColor} 
                      onChange={e => setProjBgColor(e.target.value)} 
                      className="w-12 h-10 rounded cursor-pointer bg-transparent border-0 p-0" 
                    />
                    <span className="text-sm text-white">{projBgColor}</span>
                  </div>
                </div>
              )}

              {projBgType === "gradient" && (
                <div>
                  <label className="block text-sm text-[#888B94] mb-1.5">Degradê (CSS)</label>
                  <input 
                    type="text" 
                    value={projBgGradient} 
                    onChange={e => setProjBgGradient(e.target.value)} 
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#D4AF37] outline-none" 
                    placeholder="ex: linear-gradient(to right, #000, #333)" 
                  />
                </div>
              )}
              
              {projBgType === "image" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-[#888B94] mb-1.5">Upload de Imagem (JPG/PNG)</label>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg"
                      onChange={handleImageUpload}
                      className="w-full text-sm text-[#888B94] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#D4AF37]/10 file:text-[#D4AF37] hover:file:bg-[#D4AF37]/20"
                    />
                  </div>
                  <div className="text-center text-xs text-[#888B94]">- ou URL -</div>
                  <div>
                    <input 
                      type="text" 
                      value={projBgImage} 
                      onChange={e => setProjBgImage(e.target.value)} 
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#D4AF37] outline-none" 
                      placeholder="https://exemplo.com/imagem.jpg" 
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-between items-center">
              <button 
                onClick={resetSettings} 
                className="text-sm text-[#888B94] hover:text-white underline transition-colors"
              >
                Repor Definições
              </button>
              <button 
                onClick={() => setShowSettings(false)} 
                className="px-6 py-2.5 bg-[#D4AF37] text-[#07080C] rounded-lg font-bold hover:bg-[#D4AF37]/90 transition-colors"
              >
                Salvar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#11141D] border-b border-white/5 sticky top-0 z-30 h-[70px] flex items-center">
        <div className="w-full px-[30px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-serif text-[24px] font-bold text-[#D4AF37] tracking-[1px]">
            <BookOpen className="w-6 h-6 text-[#D4AF37]" />
            <span className="hidden sm:inline">BÍBLIA DIGITAL</span>
          </div>

          <div className="flex-1 max-w-[400px] mx-10">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <input
                type="text"
                placeholder="Buscar por referência ou palavra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-[10px] bg-white/5 border border-white/10 rounded-[20px] text-white placeholder:text-[#888B94] focus:bg-white/10 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all outline-none text-[14px]"
              />
              <Search className="w-5 h-5 text-[#888B94] absolute left-3" />
              <button
                type="button"
                onClick={startVoiceCommand}
                className={cn(
                  "absolute right-3 p-1.5 rounded-full transition-colors",
                  isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "text-[#888B94] hover:text-[#D4AF37]"
                )}
                title="Comando de Voz"
              >
                <Mic className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value as BibleVersion)}
              className="bg-[#11141D] border border-white/20 text-[#888B94] text-[12px] font-semibold rounded-[15px] px-4 py-1.5 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] cursor-pointer hover:bg-white/5 transition-all uppercase"
            >
              {Object.entries(VERSION_NAMES).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-[#888B94] hover:text-[#D4AF37] hover:bg-white/5 rounded-full transition-colors"
              title="Personalizar Projeção"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col md:flex-row gap-[1px] bg-white/5 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#888B94] py-20 bg-[radial-gradient(circle_at_center,#161B29_0%,#07080C_100%)]">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#D4AF37]" />
            <p>Carregando Bíblia offline...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-400 py-20 gap-4 bg-[radial-gradient(circle_at_center,#161B29_0%,#07080C_100%)]">
            <p>{error}</p>
            <button
              onClick={() => setVersion(version)}
              className="px-4 py-2 bg-[#D4AF37] text-[#07080C] font-bold rounded-md hover:bg-[#D4AF37]/90 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : mode === "search" ? (
          <div className="flex-1 bg-[#07080C] p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[#E0E0E0]">
                Resultados para &quot;{searchQuery}&quot;
              </h2>
              <button
                onClick={() => setMode("read")}
                className="text-[#D4AF37] hover:underline font-medium"
              >
                Voltar à Leitura
              </button>
            </div>

            {searchResults.length === 0 ? (
              <p className="text-[#888B94]">Nenhum resultado encontrado.</p>
            ) : (
              <div className="space-y-4">
                {searchResults.map((res, idx) => {
                  const reference = `${res.bookName} ${res.chapter}:${res.verse}`;
                  return (
                    <div
                      key={idx}
                      className="bg-[#11141D] p-5 rounded-xl border border-white/5"
                    >
                      <p className="font-semibold text-[#D4AF37] mb-2 tracking-wide uppercase text-sm">
                        {reference}
                      </p>
                      <p className="text-lg leading-relaxed text-[#E0E0E0] font-serif">{res.text}</p>
                      <div className="flex gap-3 mt-5">
                        <button
                          onClick={() =>
                            setProjectedVerse({
                              text: res.text,
                              reference,
                              bookIdx: bible.findIndex(
                                (b) => b.abbrev === res.bookAbbrev,
                              ),
                              chapterIdx: res.chapter - 1,
                              verseIdx: res.verse - 1,
                            })
                          }
                          className="flex items-center gap-2 text-[13px] font-medium text-[#E0E0E0] hover:text-[#D4AF37] bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-[4px] transition-colors"
                        >
                          <MonitorPlay className="w-4 h-4" /> Projetar
                        </button>
                        <button
                          onClick={() => handleShare(res.text, reference)}
                          className="flex items-center gap-2 text-[13px] font-medium text-[#E0E0E0] hover:text-[#D4AF37] bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-[4px] transition-colors"
                        >
                          <Share2 className="w-4 h-4" /> Compartilhar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-[260px] flex-shrink-0 flex flex-col bg-[#07080C] p-5">
              <h3 className="text-[11px] uppercase tracking-[2px] text-[#888B94] mb-3 mt-2">Livros</h3>
              <div className="flex flex-col gap-2 max-h-[40vh] md:max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar pr-2">
                {bible.map((book, idx) => (
                  <button
                    key={book.abbrev}
                    onClick={() => {
                      setSelectedBookIdx(idx);
                      setSelectedChapterIdx(0);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-[6px] text-[14px] transition-colors",
                      selectedBookIdx === idx
                        ? "bg-[#D4AF37]/10 border-l-[3px] border-[#D4AF37] text-[#D4AF37]"
                        : "bg-white/5 text-[#E0E0E0] hover:bg-white/10 border-l-[3px] border-transparent",
                    )}
                  >
                    {book.name}
                  </button>
                ))}
              </div>
            </aside>

            {/* Reading Area */}
            <div className="flex-1 bg-[radial-gradient(circle_at_center,#161B29_0%,#07080C_100%)] p-8 md:p-12 overflow-y-auto">
              <div className="flex items-center justify-between mb-10">
                <button
                  onClick={handlePrevChapter}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors text-[#888B94] hover:text-[#E0E0E0]"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="text-center">
                  <h1 className="text-3xl font-serif font-bold text-white">
                    {currentBook?.name}
                  </h1>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-6 max-w-lg mx-auto">
                    {currentBook?.chapters.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedChapterIdx(idx)}
                        className={cn(
                          "w-10 h-10 rounded-md text-sm font-medium flex items-center justify-center transition-all",
                          selectedChapterIdx === idx
                            ? "bg-[#D4AF37] text-[#07080C] shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                            : "bg-white/5 text-[#888B94] border border-white/10 hover:bg-white/10 hover:text-[#E0E0E0]",
                        )}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleNextChapter}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors text-[#888B94] hover:text-[#E0E0E0]"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 max-w-3xl mx-auto">
                {currentChapter.map((verseText, vIdx) => {
                  const verseNum = vIdx + 1;
                  const reference = `${currentBook?.name} ${selectedChapterIdx + 1}:${verseNum}`;

                  return (
                    <div
                      key={vIdx}
                      className="group relative flex gap-4 p-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[#D4AF37] font-bold text-sm min-w-[1.5rem] pt-1.5 select-none">
                        {verseNum}
                      </span>
                      <p className="text-lg leading-[1.6] text-[#E0E0E0] flex-1 font-serif">
                        {verseText}
                      </p>

                      {/* Hover Actions */}
                      <div className="opacity-0 group-hover:opacity-100 absolute right-4 top-3 flex gap-2 bg-[#11141D] shadow-xl border border-white/10 rounded-md p-1.5 transition-opacity">
                        <button
                          onClick={() =>
                            setProjectedVerse({
                              text: verseText,
                              reference,
                              bookIdx: selectedBookIdx,
                              chapterIdx: selectedChapterIdx,
                              verseIdx: vIdx,
                            })
                          }
                          className="p-2 text-[#888B94] hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors"
                          title="Projetar Versículo"
                        >
                          <MonitorPlay className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShare(verseText, reference)}
                          className="p-2 text-[#888B94] hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors"
                          title="Compartilhar"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#11141D] border-t border-white/5 py-3 text-center text-[#888B94] text-[12px] tracking-wide">
        2026 &copy; A Midia da Igreja
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `,
        }}
      />
    </div>
  );
}
