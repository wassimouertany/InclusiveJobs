import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Accessibility,
  X,
  Type,
  MousePointer2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Sun,
  Contrast,
  CircleDashed,
  Minus,
  RectangleHorizontal,
  ImageOff,
  Highlighter,
  PlaySquare,
  Link2,
  RotateCcw,
  MinusCircle,
  PlusCircle
} from 'lucide-react';

const FONT_SIZE_LEVELS = ['Small', 'Default', 'Large', 'X-Large'];
const FONT_SCALE_VALUES = [0.875, 1, 1.125, 1.25];
const LINE_HEIGHT_LEVELS = ['Compact', 'Default', 'Relaxed', 'Double'];
const LINE_HEIGHT_VALUES = [1.2, 1.5, 1.75, 2];
const LETTER_SPACING_LEVELS = ['Tight', 'Default', 'Wide', 'X-Wide'];
const LETTER_SPACING_VALUES = ['-0.02em', 'normal', '0.05em', '0.12em'];
const ALIGN_OPTIONS = ['Left', 'Center', 'Right', 'Justify'];
const ALIGN_VALUES = ['left', 'center', 'right', 'justify'];
const ALIGN_ICONS = [AlignLeft, AlignCenter, AlignRight, AlignJustify];
const FONT_WEIGHT_OPTIONS = ['Light', 'Normal', 'Bold', 'Bolder'];
const FONT_WEIGHT_VALUES = ['300', '400', '700', '900'];

const STYLE_IDS = {
  bodyVars: 'a11y-body-vars',
  readableFont: 'a11y-readable-font',
  bigCursor: 'a11y-big-cursor',
  lightContrast: 'a11y-light',
  highContrast: 'a11y-high',
  monochrome: 'a11y-mono',
  hideImages: 'a11y-hide-images',
  highlightContent: 'a11y-highlight-content',
  stopAnimations: 'a11y-stop-animations',
  highlightLinks: 'a11y-highlight-links',
};

function getOrCreateStyle(id: string) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

function removeStyle(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Large arrow cursor SVG as data URI
const BIG_CURSOR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="%23000" stroke="%23fff" stroke-width="1.5" d="M6 2v20l6-5 4 7 2-1.5-4-6.5 10-.5z"/></svg>';
const BIG_CURSOR_DATA_URI = 'data:image/svg+xml,' + encodeURIComponent(BIG_CURSOR_SVG);

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(1);
  const [lineHeightLevel, setLineHeightLevel] = useState(1);
  const [letterSpacingLevel, setLetterSpacingLevel] = useState(1);
  const [alignIndex, setAlignIndex] = useState(0);
  const [fontWeightIndex, setFontWeightIndex] = useState(1);
  const [readableFont, setReadableFont] = useState(false);
  const [bigCursor, setBigCursor] = useState(false);
  const [lightContrast, setLightContrast] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  const [readingLine, setReadingLine] = useState(false);
  const [readingMask, setReadingMask] = useState(false);
  const [hideImages, setHideImages] = useState(false);
  const [highlightContent, setHighlightContent] = useState(false);
  const [stopAnimations, setStopAnimations] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);
  const [mouseY, setMouseY] = useState(0);

  // Persistent style: body uses CSS variables for font-scale and line-height
  useEffect(() => {
    const el = getOrCreateStyle(STYLE_IDS.bodyVars);
    el.textContent = 'body { font-size: calc(1rem * var(--a11y-font-scale, 1)) !important; line-height: var(--a11y-line-height, 1.5) !important; }';
    return () => { removeStyle(STYLE_IDS.bodyVars); };
  }, []);

  // CSS variables and body styles (letter-spacing, text-align, font-weight, font-family)
  useEffect(() => {
    document.body.style.setProperty('--a11y-font-scale', String(FONT_SCALE_VALUES[fontSizeLevel]));
    document.body.style.setProperty('--a11y-line-height', String(LINE_HEIGHT_VALUES[lineHeightLevel]));
    document.body.style.setProperty('letter-spacing', LETTER_SPACING_VALUES[letterSpacingLevel]);
    document.body.style.setProperty('text-align', ALIGN_VALUES[alignIndex]);
    document.body.style.setProperty('font-weight', FONT_WEIGHT_VALUES[fontWeightIndex]);
    document.body.style.fontFamily = readableFont ? 'Georgia, serif' : '';
  }, [fontSizeLevel, lineHeightLevel, letterSpacingLevel, alignIndex, fontWeightIndex, readableFont]);

  // Big Cursor
  useEffect(() => {
    if (!bigCursor) {
      removeStyle(STYLE_IDS.bigCursor);
      return;
    }
    const el = getOrCreateStyle(STYLE_IDS.bigCursor);
    el.textContent = '* { cursor: url("' + BIG_CURSOR_DATA_URI + '") 16 0, auto !important; }';
  }, [bigCursor]);

  // Color modules (exclusive: only one active at a time)
  useEffect(() => {
    removeStyle(STYLE_IDS.lightContrast);
    removeStyle(STYLE_IDS.highContrast);
    removeStyle(STYLE_IDS.monochrome);
    if (lightContrast) {
      const el = getOrCreateStyle(STYLE_IDS.lightContrast);
      el.textContent = 'body { filter: brightness(1.3) contrast(0.85); }';
    }
    if (highContrast) {
      const el = getOrCreateStyle(STYLE_IDS.highContrast);
      el.textContent = 'body { background: #000 !important; color: #fff !important; } a { color: #ff0 !important; } button, input { background: #111 !important; border: 2px solid #fff !important; }';
    }
    if (monochrome) {
      const el = getOrCreateStyle(STYLE_IDS.monochrome);
      el.textContent = 'html { filter: grayscale(100%) !important; }';
    }
  }, [lightContrast, highContrast, monochrome]);

  // Orientation: Hide Images
  useEffect(() => {
    if (!hideImages) {
      removeStyle(STYLE_IDS.hideImages);
      return;
    }
    const el = getOrCreateStyle(STYLE_IDS.hideImages);
    el.textContent = 'img, picture, figure, svg, video { visibility: hidden !important; }';
  }, [hideImages]);

  // Highlight Content (hover)
  useEffect(() => {
    if (!highlightContent) {
      removeStyle(STYLE_IDS.highlightContent);
      return;
    }
    const el = getOrCreateStyle(STYLE_IDS.highlightContent);
    el.textContent = 'p:hover, li:hover, div:hover, h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover { outline: 2px solid #4F46E5 !important; background: rgba(79,70,229,0.08) !important; }';
  }, [highlightContent]);

  // Stop Animations
  useEffect(() => {
    if (!stopAnimations) {
      removeStyle(STYLE_IDS.stopAnimations);
      return;
    }
    const el = getOrCreateStyle(STYLE_IDS.stopAnimations);
    el.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
  }, [stopAnimations]);

  // Highlight Links
  useEffect(() => {
    if (!highlightLinks) {
      removeStyle(STYLE_IDS.highlightLinks);
      return;
    }
    const el = getOrCreateStyle(STYLE_IDS.highlightLinks);
    el.textContent = 'a, button { outline: 2px solid #fef08a !important; background: rgba(254, 240, 138, 0.2) !important; }';
  }, [highlightLinks]);

  // Mouse Y for Reading Line / Reading Mask
  useEffect(() => {
    if (!readingLine && !readingMask) return;
    function onMove(e: MouseEvent) {
      setMouseY(e.clientY);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [readingLine, readingMask]);

  function cycle(arr: any[], idx: number, setter: React.Dispatch<React.SetStateAction<number>>) {
    setter((idx + 1) % arr.length);
  }

  function toggleColorMode(mode: 'light' | 'high' | 'mono') {
    if (mode === 'light') {
      if (lightContrast) {
        setLightContrast(false);
      } else {
        setLightContrast(true);
        setHighContrast(false);
        setMonochrome(false);
      }
    } else if (mode === 'high') {
      if (highContrast) {
        setHighContrast(false);
      } else {
        setLightContrast(false);
        setHighContrast(true);
        setMonochrome(false);
      }
    } else if (mode === 'mono') {
      if (monochrome) {
        setMonochrome(false);
      } else {
        setLightContrast(false);
        setHighContrast(false);
        setMonochrome(true);
      }
    }
  }

  function resetAll() {
    Object.keys(STYLE_IDS).forEach((k) => removeStyle((STYLE_IDS as any)[k]));
    document.body.style.removeProperty('--a11y-font-scale');
    document.body.style.removeProperty('--a11y-line-height');
    document.body.style.removeProperty('letter-spacing');
    document.body.style.removeProperty('text-align');
    document.body.style.removeProperty('font-weight');
    document.body.style.removeProperty('font-family');
    setFontSizeLevel(1);
    setLineHeightLevel(1);
    setLetterSpacingLevel(1);
    setAlignIndex(0);
    setFontWeightIndex(1);
    setReadableFont(false);
    setBigCursor(false);
    setLightContrast(false);
    setHighContrast(false);
    setMonochrome(false);
    setReadingLine(false);
    setReadingMask(false);
    setHideImages(false);
    setHighlightContent(false);
    setStopAnimations(false);
    setHighlightLinks(false);
    // Re-inject body vars style after reset
    const el = getOrCreateStyle(STYLE_IDS.bodyVars);
    el.textContent = 'body { font-size: calc(1rem * var(--a11y-font-scale, 1)) !important; line-height: var(--a11y-line-height, 1.5) !important; }';
    document.body.style.setProperty('--a11y-font-scale', '1');
    document.body.style.setProperty('--a11y-line-height', '1.5');
  }

  const AlignIcon = ALIGN_ICONS[alignIndex];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Toggle accessibility menu"
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-[9998] w-12 h-12 flex items-center justify-center rounded-l-xl bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-300 ${open ? 'translate-x-full' : 'translate-x-0'}`}
      >
        <Accessibility className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-label="Accessibility options"
            className="fixed top-0 right-0 w-80 h-[100dvh] bg-white shadow-2xl z-[9999] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-indigo-600">
                <Accessibility className="w-5 h-5" />
                <strong className="text-lg font-semibold text-gray-900">Accessibility</strong>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* Text Adjustments */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Text Adjustments</h3>
                <div className="space-y-3">
                  {/* Font Size */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="text-sm text-gray-600 mb-2 font-medium">Font Size</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setFontSizeLevel((n) => Math.max(0, n - 1))} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                        <MinusCircle className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-20 text-center">{FONT_SIZE_LEVELS[fontSizeLevel]}</span>
                      <button onClick={() => setFontSizeLevel((n) => Math.min(3, n + 1))} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Line Height */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="text-sm text-gray-600 mb-2 font-medium">Line Height</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setLineHeightLevel((n) => Math.max(0, n - 1))} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                        <MinusCircle className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-20 text-center">{LINE_HEIGHT_LEVELS[lineHeightLevel]}</span>
                      <button onClick={() => setLineHeightLevel((n) => Math.min(3, n + 1))} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Letter Spacing */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="text-sm text-gray-600 mb-2 font-medium">Letter Spacing</div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setLetterSpacingLevel((n) => Math.max(0, n - 1))} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                        <MinusCircle className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-20 text-center">{LETTER_SPACING_LEVELS[letterSpacingLevel]}</span>
                      <button onClick={() => setLetterSpacingLevel((n) => Math.min(3, n + 1))} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setReadableFont(!readableFont)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${readableFont ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Type className="w-5 h-5" />
                      <span className="text-xs font-medium">Readable Font</span>
                    </button>
                    <button
                      onClick={() => cycle(ALIGN_OPTIONS, alignIndex, setAlignIndex)}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <AlignIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">Align: {ALIGN_OPTIONS[alignIndex]}</span>
                    </button>
                    <button
                      onClick={() => cycle(FONT_WEIGHT_OPTIONS, fontWeightIndex, setFontWeightIndex)}
                      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <Bold className="w-5 h-5" />
                      <span className="text-xs font-medium">Weight: {FONT_WEIGHT_OPTIONS[fontWeightIndex]}</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Visual Adjustments */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Visual Adjustments</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBigCursor(!bigCursor)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${bigCursor ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <MousePointer2 className="w-5 h-5" />
                    <span className="text-xs font-medium">Big Cursor</span>
                  </button>
                  <button
                    onClick={() => toggleColorMode('light')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${lightContrast ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-xs font-medium">Light Contrast</span>
                  </button>
                  <button
                    onClick={() => toggleColorMode('high')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${highContrast ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Contrast className="w-5 h-5" />
                    <span className="text-xs font-medium">High Contrast</span>
                  </button>
                  <button
                    onClick={() => toggleColorMode('mono')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${monochrome ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <CircleDashed className="w-5 h-5" />
                    <span className="text-xs font-medium">Monochrome</span>
                  </button>
                </div>
              </section>

              {/* Reading Aids */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Reading Aids</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReadingLine(!readingLine)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${readingLine ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Minus className="w-5 h-5" />
                    <span className="text-xs font-medium">Reading Line</span>
                  </button>
                  <button
                    onClick={() => setReadingMask(!readingMask)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${readingMask ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <RectangleHorizontal className="w-5 h-5" />
                    <span className="text-xs font-medium">Reading Mask</span>
                  </button>
                  <button
                    onClick={() => setHideImages(!hideImages)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${hideImages ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <ImageOff className="w-5 h-5" />
                    <span className="text-xs font-medium">Hide Images</span>
                  </button>
                  <button
                    onClick={() => setHighlightContent(!highlightContent)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${highlightContent ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Highlighter className="w-5 h-5" />
                    <span className="text-xs font-medium">Highlight</span>
                  </button>
                  <button
                    onClick={() => setStopAnimations(!stopAnimations)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${stopAnimations ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <PlaySquare className="w-5 h-5" />
                    <span className="text-xs font-medium">Stop Anim.</span>
                  </button>
                  <button
                    onClick={() => setHighlightLinks(!highlightLinks)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${highlightLinks ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Link2 className="w-5 h-5" />
                    <span className="text-xs font-medium">Highlight Links</span>
                  </button>
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={resetAll}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading Line overlay */}
      {readingLine && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            top: mouseY - 12,
            height: 24,
            background: 'rgba(79, 70, 229, 0.25)',
            pointerEvents: 'none',
            zIndex: 9997,
            borderTop: '2px solid rgba(79, 70, 229, 0.6)',
            borderBottom: '2px solid rgba(79, 70, 229, 0.6)',
          }}
        />
      )}

      {/* Reading Mask overlay */}
      {readingMask && (
        <>
          <div
            aria-hidden
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              top: 0,
              height: Math.max(0, mouseY - 80),
              background: 'rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              zIndex: 9997,
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              top: mouseY + 80,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              zIndex: 9997,
            }}
          />
        </>
      )}
    </>
  );
}

