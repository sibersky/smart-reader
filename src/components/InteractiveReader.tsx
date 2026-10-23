// src/components/InteractiveReader.tsx
import React, { useState, useMemo } from 'react';
import { WordAnnotation, AnalyzeResult } from '../pages/api/reader/analyze';
import { useTranslation } from '@/lib/i18n';

interface InteractiveReaderProps {
  data: AnalyzeResult;
  targetLevel: string;
  l1Language: string;
  onReset: () => void;
}

export const InteractiveReader: React.FC<InteractiveReaderProps> = ({
  data,
  targetLevel,
  l1Language,
  onReset,
}) => {
  const { t } = useTranslation();
  const [selectedWord, setSelectedWord] = useState<WordAnnotation | null>(null);
  const [revealedTranslations, setRevealedTranslations] = useState<Record<string, boolean>>({});
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const [copiedWord, setCopiedWord] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('serif');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [viewMode, setViewMode] = useState<'reader' | 'vocabList'>('reader');

  // Build a lookup map of tokens and lemmas
  const annotationMap = useMemo(() => {
    const map = new Map<string, WordAnnotation>();
    for (const item of data.annotations) {
      if (item.token) {
        map.set(item.token.toLowerCase().trim(), item);
      }
      if (item.lemma) {
        map.set(item.lemma.toLowerCase().trim(), item);
      }
    }
    return map;
  }, [data.annotations]);

  // Determine if a level is borderline (+1) or advanced (+2 or higher)
  const isBorderline = (wordLevel: string): boolean => {
    const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const userIdx = order.indexOf(targetLevel);
    const wordIdx = order.indexOf(wordLevel);
    return wordIdx === userIdx + 1;
  };

    const getSpeechLang = (lang?: string): string => {
    const l = (lang || data.detectedLanguage || "").toLowerCase();
    if (l.includes("spanish") || l.includes("es")) return "es-ES";
    if (l.includes("german") || l.includes("de")) return "de-DE";
    if (l.includes("french") || l.includes("fr")) return "fr-FR";
    if (l.includes("italian") || l.includes("it")) return "it-IT";
    if (l.includes("portuguese") || l.includes("pt")) return "pt-PT";
    if (l.includes("russian") || l.includes("ru")) return "ru-RU";
    return "en-US";
  };

  // Pronounce word using browser Web Speech API
  const handleSpeak = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getSpeechLang();
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle translation reveal
  const toggleReveal = (token: string) => {
    setRevealedTranslations((prev) => ({
      ...prev,
      [token]: !prev[token],
    }));
  };

  // Copy word as flashcard: "word — translation"
  const handleCopyFlashcard = async (item: WordAnnotation) => {
    const text = `${item.lemma || item.token} — ${item.translationL1} // ${(item.definition || item.definitionEn)} (${item.cefrLevel})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWord(item.token);
      setTimeout(() => setCopiedWord(null), 2500);
    } catch {
      console.warn('Could not copy to clipboard');
    }
  };

    // Save word to Poke-Me-On deck (PostgreSQL DB + localStorage cache)
  const handleSaveToPokeMeOn = async (item: WordAnnotation) => {
    const frontText = (item.lemma || item.token).trim();
    const def = (item.definition || item.definitionEn || "").trim();
    const backText = `${item.translationL1}\n(${def})`.trim();
    const contentLine = `${frontText} — ${item.translationL1} // [${item.cefrLevel}] ${def}`;

    try {
      // 1. Cache in browser localStorage
      const storageKey = "teacher_alex_saved_flashcards";
      const raw = localStorage.getItem(storageKey);
      const list = raw ? JSON.parse(raw) : [];
      list.push({
        front: frontText,
        back: backText,
        cefrLevel: item.cefrLevel,
        partOfSpeech: item.partOfSpeech,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(storageKey, JSON.stringify(list));

      // 2. Persist directly to Poke-Me-On API with credentials
      const res = await fetch("/poke_me_on/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          front: frontText,
          back: backText,
          content: contentLine,
          source: "Smart Reader",
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("Для сохранения слов в Poke-Me-On необходимо войти в аккаунт Teacher Alex.\n\nTo save cards to Poke-Me-On, please log in to Teacher Alex.");
          return;
        }
        const err = await res.json().catch(() => ({}));
        console.warn("Poke-Me-On sync response:", err);
      } else {
        console.log("Successfully saved to Poke-Me-On deck:", frontText);
      }

      setSavedWords((prev) => ({ ...prev, [item.token]: true }));
    } catch (e) {
      console.warn("Failed to save to Poke-Me-On", e);
    }
  };

  // Bulk save all annotations to Poke-Me-On deck
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const handleSyncAllToPokeMeOn = async () => {
    if (!data.annotations || data.annotations.length === 0) return;
    setIsSyncingAll(true);
    try {
      const items = data.annotations.map((item) => {
        const frontText = (item.lemma || item.token).trim();
        const def = (item.definition || item.definitionEn || "").trim();
        return {
          front: frontText,
          back: `${item.translationL1}\n(${def})`.trim(),
        };
      });

      const contentLines = data.annotations.map((item) => {
        const frontText = (item.lemma || item.token).trim();
        const def = (item.definition || item.definitionEn || "").trim();
        return `${frontText} — ${item.translationL1} // [${item.cefrLevel}] ${def}`;
      }).join("\n");

      const res = await fetch("/poke_me_on/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items,
          content: contentLines,
          source: "Smart Reader",
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("Для сохранения слов в Poke-Me-On войдите в аккаунт Teacher Alex.\n\nPlease log in to Teacher Alex to save words to your Poke-Me-On deck.");
          return;
        }
        alert("Could not sync with Poke-Me-On. Status: " + res.status);
      } else {
        const result = await res.json().catch(() => ({}));
        const count = result.count || items.length;
        alert(`Успешно добавлено в Poke-Me-On: ${count} слов!\nSuccessfully added ${count} words to Poke-Me-On!`);
        const newSaved: Record<string, boolean> = {};
        data.annotations.forEach(it => { newSaved[it.token] = true; });
        setSavedWords(prev => ({ ...prev, ...newSaved }));
      }
    } catch (e) {
      console.error("Bulk sync error:", e);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Export all vocabulary as .txt file
  const handleExportAll = () => {
    const lines = data.annotations.map(
      (item) => `${item.lemma || item.token} — ${item.translationL1} // [${item.cefrLevel} ${item.partOfSpeech}] ${(item.definition || item.definitionEn)}`
    );
    const content = `Smart Reader Vocabulary Export (${targetLevel} -> L1: ${l1Language})\nDate: ${new Date().toLocaleDateString()}\nTotal Words: ${data.totalWords} | Above Level: ${data.aboveLevelCount}\n\n` + lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-reader-vocabulary-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render annotated text with tokenized highlighted buttons
  const renderAnnotatedParagraph = (paragraph: string, pIdx: number) => {
    if (!paragraph.trim()) return <p key={pIdx} className="h-4" />;

    // Split paragraph by word boundaries while keeping words and punctuation separate
    const tokens = paragraph.split(/(\s+|[.,!?:;"'()—–]+)/g);

    return (
      <p key={pIdx} className="mb-5 leading-loose">
        {tokens.map((token, tIdx) => {
          const cleanToken = token.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
          const annotation = annotationMap.get(cleanToken);

          if (annotation) {
            const borderline = isBorderline(annotation.cefrLevel);
            const isSelected = selectedWord?.token === annotation.token;

            return (
              <button
                key={`${pIdx}-${tIdx}`}
                type="button"
                onClick={() => setSelectedWord(annotation)}
                className={`inline-block mx-0.5 px-1 py-0.5 rounded transition-all font-medium cursor-pointer ${
                  borderline
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-b-2 border-amber-400'
                    : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-b-2 border-rose-400'
                } ${isSelected ? 'ring-2 ring-brand-500 ring-offset-1 scale-105' : ''}`}
                title={`Click for definition (${annotation.cefrLevel})`}
              >
                {token}
                <span className="text-[10px] ml-0.5 font-bold uppercase opacity-75">
                  {annotation.cefrLevel}
                </span>
              </button>
            );
          }

          return <span key={`${pIdx}-${tIdx}`}>{token}</span>;
        })}
      </p>
    );
  };

  const paragraphs = useMemo(() => {
    return data.extractedText.split(/\n+/);
  }, [data.extractedText]);

  const readingTimeMin = Math.max(1, Math.ceil(data.totalWords / 200));

  return (
    <div className="w-full">
      {/* 1. Header Toolbar & Controls */}
      <div className="bg-white rounded-2xl border border-brand-200 p-4 sm:p-5 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-brand-200 text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
          >
            ← {t.reader.controls.newText}
          </button>

          {data.detectedLanguage && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold">
              🌍 {data.detectedLanguage} · {targetLevel}
            </span>
          )}

          <div className="flex rounded-lg border border-brand-200 p-0.5 bg-neutral-50 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('reader')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'reader'
                  ? 'bg-white text-brand-900 shadow-2xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              📖 Reader
            </button>
            <button
              type="button"
              onClick={() => setViewMode('vocabList')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'vocabList'
                  ? 'bg-white text-brand-900 shadow-2xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              📑 Vocab List ({data.annotations.length})
            </button>
          </div>
        </div>

        {/* Font styling and export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center rounded-lg border border-brand-200 p-0.5 bg-neutral-50 text-xs">
            <button
              type="button"
              onClick={() => setFontFamily('sans')}
              className={`px-2.5 py-1 rounded cursor-pointer ${
                fontFamily === 'sans' ? 'bg-white font-bold text-brand-900 shadow-2xs' : 'text-text-secondary'
              }`}
            >
              {t.reader.controls.fontSans}
            </button>
            <button
              type="button"
              onClick={() => setFontFamily('serif')}
              className={`px-2.5 py-1 rounded font-serif cursor-pointer ${
                fontFamily === 'serif' ? 'bg-white font-bold text-brand-900 shadow-2xs' : 'text-text-secondary'
              }`}
            >
              {t.reader.controls.fontSerif}
            </button>
          </div>

          <div className="flex items-center rounded-lg border border-brand-200 p-0.5 bg-neutral-50 text-xs">
            <button
              type="button"
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded cursor-pointer ${
                fontSize === 'normal' ? 'bg-white font-bold text-brand-900 shadow-2xs' : 'text-text-secondary'
              }`}
              title="Normal size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded text-sm cursor-pointer ${
                fontSize === 'large' ? 'bg-white font-bold text-brand-900 shadow-2xs' : 'text-text-secondary'
              }`}
              title="Large size"
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-1 rounded text-base cursor-pointer ${
                fontSize === 'xlarge' ? 'bg-white font-bold text-brand-900 shadow-2xs' : 'text-text-secondary'
              }`}
              title="Extra large size"
            >
              A++
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncAllToPokeMeOn}
            disabled={isSyncingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Save all highlighted words directly into your Poke-Me-On deck"
          >
            <span>🔔</span>
            <span>{isSyncingAll ? "Синхронизация..." : "+ Poke-Me-On (Все слова)"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-50 border border-brand-200 text-brand-800 hover:bg-brand-100 transition-colors cursor-pointer"
          >
            📥 {t.reader.controls.exportAll}
          </button>
        </div>
      </div>

      {/* 2. Reading Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-3.5 rounded-xl border border-brand-200 text-center shadow-2xs">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            {t.reader.statsBar.totalWords}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-brand-900 mt-0.5">
            {data.totalWords}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-brand-200 text-center shadow-2xs">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            {t.reader.statsBar.aboveLevel}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">
            {data.aboveLevelCount}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-brand-200 text-center shadow-2xs">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            {t.reader.statsBar.comprehension}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">
            {data.percentKnown}%
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-brand-200 text-center shadow-2xs">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            {t.reader.statsBar.readingTime}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-brand-900 mt-0.5">
            ~{readingTimeMin} {t.reader.statsBar.min}
          </p>
        </div>
      </div>

      {/* 3. Highlighting Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 bg-neutral-50/80 rounded-xl border border-brand-100 mb-6 text-xs text-text-secondary">
        <span className="font-semibold text-brand-900">Color Guide:</span>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400 inline-block" />
            <strong className="text-amber-950">{t.reader.legend.borderline}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-400 inline-block" />
            <strong className="text-rose-950">{t.reader.legend.advanced}</strong>
          </span>
          <span className="text-muted-foreground italic">
            Click any highlighted word to reveal definition & translation.
          </span>
        </div>
      </div>

      {/* 4. Reader Surface / View Mode */}
      {viewMode === 'reader' ? (
        <div className="relative">
          <div
            className={`bg-white rounded-2xl border border-brand-200 p-6 sm:p-10 shadow-sm transition-all ${
              fontFamily === 'serif' ? 'font-serif' : 'font-sans'
            } ${
              fontSize === 'normal'
                ? 'text-base sm:text-lg'
                : fontSize === 'large'
                ? 'text-lg sm:text-xl'
                : 'text-xl sm:text-2xl'
            } text-neutral-900`}
            style={{ maxWidth: '82ch', margin: '0 auto' }}
          >
            {paragraphs.map((para, idx) => renderAnnotatedParagraph(para, idx))}
          </div>
        </div>
      ) : (
        /* Vocab List View */
        <div className="bg-white rounded-2xl border border-brand-200 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-brand-100 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-brand-900">
              Vocabulary Detected Above Level {targetLevel} ({data.annotations.length} items)
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSyncAllToPokeMeOn}
                disabled={isSyncingAll}
                className="text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                🔔 {isSyncingAll ? "Синхронизация..." : "+ Poke-Me-On (Все)"}
              </button>
              <button
                type="button"
                onClick={handleExportAll}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 cursor-pointer"
              >
                📥 Download List (.txt)
              </button>
            </div>
          </div>
          <div className="divide-y divide-brand-100">
            {data.annotations.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 hover:bg-neutral-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-brand-900">
                      {item.lemma || item.token}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSpeak(item.lemma || item.token)}
                      className="text-sm opacity-70 hover:opacity-100 cursor-pointer"
                      title="Pronounce"
                    >
                      🔊
                    </button>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        isBorderline(item.cefrLevel)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.cefrLevel}
                    </span>
                    <span className="text-xs text-muted-foreground italic">
                      {item.partOfSpeech}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">
                    {(item.definition || item.definitionEn)}
                  </p>
                  <p className="text-xs font-semibold text-brand-700">
                    L1 ({l1Language}): {item.translationL1}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyFlashcard(item)}
                    className="px-3 py-1.5 rounded-lg border border-brand-200 text-xs font-medium text-brand-800 hover:bg-white cursor-pointer"
                  >
                    {copiedWord === item.token ? '✓ Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToPokeMeOn(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      savedWords[item.token]
                        ? 'bg-emerald-600 text-white'
                        : 'bg-brand-600 hover:bg-brand-700 text-white'
                    }`}
                  >
                    {savedWords[item.token] ? '✓ Saved' : '+ Poke-Me-On'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Interactive Word Modal / Gloss Popover Card */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl border border-brand-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-brand-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-brand-900">
                    {selectedWord.lemma || selectedWord.token}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleSpeak(selectedWord.lemma || selectedWord.token)}
                    className="text-base opacity-75 hover:opacity-100 cursor-pointer"
                    title="Pronounce word"
                  >
                    🔊
                  </button>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-md uppercase ${
                      isBorderline(selectedWord.cefrLevel)
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {selectedWord.cefrLevel}
                  </span>
                </div>
                <p className="text-xs text-text-secondary italic mt-0.5">
                  {selectedWord.partOfSpeech}
                  {selectedWord.token.toLowerCase() !== selectedWord.lemma.toLowerCase() && (
                    <span className="not-italic text-muted-foreground ml-1.5">
                      (in text: <q>{selectedWord.token}</q>)
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-sm font-bold cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* In-Context English Definition */}
            <div className="py-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
                  {t.reader.popover.definition} ({data.detectedLanguage || "Target Language"})
                </label>
                <p className="text-sm text-neutral-800 leading-relaxed bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                  {(selectedWord.definition || selectedWord.definitionEn)}
                </p>
              </div>

              {/* L1 Translation with Reveal / Hide Toggle */}
              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
                  Translation ({l1Language})
                </label>
                {revealedTranslations[selectedWord.token] ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-sm font-bold text-emerald-900">
                      {selectedWord.translationL1}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleReveal(selectedWord.token)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      {t.reader.popover.hideTranslation}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleReveal(selectedWord.token)}
                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-brand-300 bg-neutral-50 hover:bg-brand-50 text-xs font-bold text-brand-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>👁️</span> {t.reader.popover.revealTranslation}
                  </button>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-brand-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSaveToPokeMeOn(selectedWord)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  savedWords[selectedWord.token]
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                <span>➕</span>
                {savedWords[selectedWord.token]
                  ? t.reader.popover.addedToDeck
                  : t.reader.popover.addToPokeMeOn}
              </button>

              <button
                type="button"
                onClick={() => handleCopyFlashcard(selectedWord)}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium text-text-secondary hover:text-brand-900 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                {copiedWord === selectedWord.token
                  ? t.reader.popover.copied
                  : t.reader.popover.copyFlashcard}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
