import { Accessibility, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-primary text-white p-3 rounded-l-xl shadow-lg hover:bg-primary-dark transition-colors z-50 group"
        aria-label="Accessibility Options"
      >
        <Accessibility className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 p-6 border-l border-border overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-text-primary flex items-center">
                  <Accessibility className="w-5 h-5 mr-2 text-primary" />
                  Accessibility
                </h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Text Size */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">Text Size</label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button className="flex-1 py-2 text-sm font-medium rounded hover:bg-white hover:shadow-sm">A</button>
                    <button className="flex-1 py-2 text-base font-medium rounded hover:bg-white hover:shadow-sm">A+</button>
                    <button className="flex-1 py-2 text-lg font-bold rounded hover:bg-white hover:shadow-sm">A++</button>
                  </div>
                </div>

                {/* Contrast */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">Contrast</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 px-4 border border-primary bg-white text-primary rounded-lg font-medium text-sm">Normal</button>
                    <button className="py-3 px-4 bg-black text-yellow-400 rounded-lg font-bold text-sm border border-white">High Contrast</button>
                    <button className="py-3 px-4 bg-gray-100 text-gray-900 rounded-lg font-medium text-sm">Grayscale</button>
                    <button className="py-3 px-4 bg-yellow-100 text-black rounded-lg font-medium text-sm">Dyslexia Friendly</button>
                  </div>
                </div>

                {/* Other Toggles */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">Screen Reader</span>
                    <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 left-0.5"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">Big Cursor</span>
                    <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 left-0.5"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">Stop Animations</span>
                    <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 right-0.5"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
