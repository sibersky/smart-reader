/* eslint-disable @next/next/no-img-element */
// src/components/ReaderInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';

interface ReaderInputProps {
  onAnalyze: (payload: {
    text?: string;
    imageBase64?: string;
    imageMimeType?: string;
    targetLanguage?: string;
    targetLevel: string;
    l1Language: string;
  }) => void;
  isLoading: boolean;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

export const TARGET_LANGUAGES = [
  { code: 'auto', name: 'auto', label: '✨ Auto-detect (Автоопределение)' },
  { code: 'es', name: 'Spanish', label: '🇪🇸 Español (Spanish)' },
  { code: 'en', name: 'English', label: '🇬🇧 English (English)' },
  { code: 'de', name: 'German', label: '🇩🇪 Deutsch (German)' },
  { code: 'fr', name: 'French', label: '🇫🇷 Français (French)' },
  { code: 'it', name: 'Italian', label: '🇮🇹 Italiano (Italian)' },
  { code: 'pt', name: 'Portuguese', label: '🇵🇹 Português (Portuguese)' },
];

export const L1_LANGUAGES = [
  { code: 'ru', name: 'Russian', label: 'Русский (Russian)' },
  { code: 'es', name: 'Spanish', label: 'Español (Spanish)' },
  { code: 'en', name: 'English', label: 'English (English)' },
  { code: 'de', name: 'German', label: 'Deutsch (German)' },
  { code: 'fr', name: 'French', label: 'Français (French)' },
  { code: 'it', name: 'Italian', label: 'Italiano (Italian)' },
  { code: 'tr', name: 'Turkish', label: 'Türkçe (Turkish)' },
  { code: 'zh', name: 'Chinese', label: '中文 (Chinese)' },
  { code: 'pt', name: 'Portuguese', label: 'Português (Portuguese)' },
];

const SAMPLE_TEXT_EN = `The relentless pace of technological advancement has created an ubiquitous reliance on automated algorithms. While proponents herald unprecedented efficiency, skeptics question the erosion of cognitive autonomy and the subtle ramifications of surveillance capitalism. Navigating this labyrinthine digital landscape demands profound intellectual discernment.`;

const SAMPLE_TEXT_ES = `Tita no estaba conforme. Una gran cantidad de dudas salían a su mente. Por ejemplo, le agradaría saber si alguien consideró que en un perfecto plan para amparar a una figura familiar se debía pagar un precio tan alto. ¿Si Tita no podía casarse ni tener hijos al llegar a la senectud, quién se encargaría de atenderla? Tras el fallecimiento de su madre, ¿valía la pena continuar con aquella tradición opresiva?`;

export const ReaderInput: React.FC<ReaderInputProps> = ({ onAnalyze, isLoading }) => {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('auto');
  const [targetLevel, setTargetLevel] = useState<string>('B1');
  const [l1Language, setL1Language] = useState<string>('Russian');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default L1 based on UI locale
  useEffect(() => {
    if (locale === 'es') setL1Language('Spanish');
    else if (locale === 'en') setL1Language('Russian');
    else setL1Language('Russian');
  }, [locale]);

  // Support paste screenshot from clipboard anywhere on the tab
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'image') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      alert('File size exceeds 12 MB limit.');
      return;
    }

    setImageMimeType(file.type);
    setImageFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'text') {
      if (!text.trim()) return;
      onAnalyze({
        text: text.trim(),
        targetLanguage,
        targetLevel,
        l1Language,
      });
    } else {
      if (!imageBase64) return;
      onAnalyze({
        imageBase64,
        imageMimeType,
        targetLanguage,
        targetLevel,
        l1Language,
      });
    }
  };

  const canSubmit = !isLoading && (activeTab === 'text' ? text.trim().length > 10 : !!imageBase64);

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-brand-200 shadow-sm p-6 sm:p-8">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-brand-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'text'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          📝 {t.reader.tabText}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'image'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          📸 {t.reader.tabImage}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 1: Text Input */}
        {activeTab === 'text' && (
          <div>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <label htmlFor="text-input" className="block text-xs font-semibold text-text-secondary">
                {t.reader.tabText}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Sample texts:</span>
                <button
                  type="button"
                  onClick={() => {
                    setText(SAMPLE_TEXT_ES);
                    setTargetLanguage('Spanish');
                  }}
                  className="text-xs text-brand-600 hover:text-brand-800 underline cursor-pointer font-medium"
                >
                  🇪🇸 Spanish (B1)
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setText(SAMPLE_TEXT_EN);
                    setTargetLanguage('English');
                  }}
                  className="text-xs text-brand-600 hover:text-brand-800 underline cursor-pointer font-medium"
                >
                  🇬🇧 English (B1)
                </button>
              </div>
            </div>
            <textarea
              id="text-input"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.reader.textPlaceholder}
              className="w-full p-4 border border-brand-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
              required
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {text.length} characters
            </p>
          </div>
        )}

        {/* Tab 2: Image / Screenshot Upload */}
        {activeTab === 'image' && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />

            {!imageBase64 ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-brand-200 hover:border-brand-400 bg-neutral-50/50'
                }`}
              >
                <div className="text-4xl mb-3 select-none">📸</div>
                <h3 className="text-sm font-bold text-brand-900 mb-1">
                  {t.reader.dropImagePrompt}
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  {t.reader.dropImageSub}
                </p>
                <span className="inline-block px-4 py-1.5 rounded-lg bg-white border border-brand-200 text-xs font-medium text-brand-700 shadow-2xs">
                  Tip: Supports screenshots in <strong>Spanish, English, German, French, Italian</strong> and more! Press <kbd className="font-mono bg-neutral-100 px-1 rounded">Ctrl+V</kbd> to paste directly.
                </span>
              </div>
            ) : (
              <div className="border border-brand-200 rounded-xl p-4 bg-neutral-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-brand-200 bg-white shrink-0">
                    <img
                      src={imageBase64}
                      alt="Uploaded screenshot"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {imageFileName}
                    </p>
                    <p className="text-xs text-green-700 font-medium mt-0.5">
                      ✓ Ready for Multilingual OCR reading
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageBase64(null);
                    setImageFileName(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer font-medium"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {/* Target Language, Level & L1 Settings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-brand-100">
          {/* 1. Language of the text */}
          <div>
            <label htmlFor="target-lang-select" className="block text-xs font-semibold text-text-secondary mb-1.5">
              Language of Text:
            </label>
            <select
              id="target-lang-select"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full p-2.5 border border-brand-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-text-primary"
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Select or leave on Auto-detect
            </p>
          </div>

          {/* 2. CEFR Level */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              {t.reader.levelLabel}
            </label>
            <div className="grid grid-cols-5 gap-1">
              {CEFR_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setTargetLevel(lvl)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer text-center ${
                    targetLevel === lvl
                      ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                      : 'bg-white text-text-primary border-brand-200 hover:bg-brand-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t.reader.levelHint}
            </p>
          </div>

          {/* 3. L1 Native Language for translation */}
          <div>
            <label htmlFor="l1-select" className="block text-xs font-semibold text-text-secondary mb-1.5">
              {t.reader.l1Label}
            </label>
            <select
              id="l1-select"
              value={l1Language}
              onChange={(e) => setL1Language(e.target.value)}
              className="w-full p-2.5 border border-brand-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-text-primary"
            >
              {L1_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Translations rendered in this language
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white transition-all shadow-md cursor-pointer ${
              !canSubmit || isLoading
                ? 'bg-neutral-400 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t.reader.analyzingButton}
              </span>
            ) : (
              t.reader.analyzeButton
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
