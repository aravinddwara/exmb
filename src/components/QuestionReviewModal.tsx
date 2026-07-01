import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, CheckCircle, XCircle, Circle } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { supabase } from '../lib/supabase';

interface QuestionReviewModalProps {
  questions: any[];
  initialIndex: number;
  onClose: () => void;
  title?: string;
}

export const QuestionReviewModal: React.FC<QuestionReviewModalProps> = ({ questions, initialIndex, onClose, title = "Review Questions" }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [detailsCache, setDetailsCache] = useState<Record<string, { correct_option?: number, explanation?: string, explanation_images?: any }>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions.length, onClose]);

  const currentQ = questions[currentIndex];

  useEffect(() => {
    if (!currentQ) return;
    if (currentQ.correct_option === undefined && !detailsCache[currentQ.id]) {
       const fetchDetails = async () => {
          const { data, error } = await supabase.rpc('get_question_review', {
            p_question_id: currentQ.id,
          });
          if (!error && data) {
             setDetailsCache(prev => ({ ...prev, [currentQ.id]: data }));
          }
       };
       fetchDetails();
    }
  }, [currentQ, detailsCache]);

  if (questions.length === 0) return null;

  const correctOption = detailsCache[currentQ.id]?.correct_option ?? currentQ.correct_option;
  const explanation = detailsCache[currentQ.id]?.explanation ?? currentQ.explanation;
  const explanationImages = detailsCache[currentQ.id]?.explanation_images ?? currentQ.explanation_images;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-geist-border-light dark:border-geist-border-dark">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">{title}</h2>
              <span className="text-[10px] bg-geist-surface-light dark:bg-geist-surface-dark px-2 py-1 rounded-full text-geist-text-secondary-light font-medium tracking-wide">
                {currentIndex + 1} OF {questions.length}
              </span>
            </div>
            <button onClick={onClose} className="text-geist-text-secondary-light hover:text-geist-text-primary-light transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
             <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] font-medium bg-geist-surface-light dark:bg-geist-surface-dark px-2 py-1 rounded border border-geist-border-light dark:border-geist-border-dark uppercase tracking-wider text-geist-text-secondary-light">
                   {currentQ.type}
                </span>
                {currentQ.path && (
                  <span className="text-[10px] font-medium text-geist-text-secondary-light bg-geist-surface-light dark:bg-geist-surface-dark px-2 py-1 rounded border border-geist-border-light dark:border-geist-border-dark">
                    {currentQ.path.className} • {currentQ.path.subjectName} • {currentQ.path.chapterName}
                  </span>
                )}
             </div>
             
             <MarkdownRenderer content={currentQ.text || ''} className="text-base text-geist-text-primary-light dark:text-geist-text-primary-dark mb-8 leading-relaxed" />
             
             {currentQ.question_images && (
               <div className="mb-6 flex flex-wrap gap-2">
                 {(() => {
                   let imgs = [];
                   try { imgs = typeof currentQ.question_images === 'string' ? JSON.parse(currentQ.question_images) : currentQ.question_images; } 
                   catch { imgs = [currentQ.question_images]; }
                   return (Array.isArray(imgs) ? imgs : []).map((img: string, i: number) => (
                     <img key={i} src={img} alt="Question figure" className="max-w-full max-h-64 object-contain rounded border border-geist-border-light dark:border-geist-border-dark" />
                   ));
                 })()}
               </div>
             )}

             <div className="space-y-3">
                {(() => {
                  let opts = [];
                  if (Array.isArray(currentQ.options)) opts = currentQ.options;
                  else if (typeof currentQ.options === 'string') {
                    try { opts = JSON.parse(currentQ.options); } catch { opts = []; }
                  }
                  if (!opts || opts.length === 0 || (opts.length === 1 && !opts[0])) {
                    opts = [currentQ.option_1 || '', currentQ.option_2 || '', currentQ.option_3 || '', currentQ.option_4 || ''];
                  }
                  return opts;
                })().map((opt: string, i: number) => {
                   const optionImageField = `option_${i + 1}_image` as keyof typeof currentQ;
                   const optionImage = currentQ[optionImageField] as string | undefined;

                   return (
                   <div 
                      key={i} 
                      className={`p-4 rounded-xl border flex items-start gap-3 transition-colors
                        ${correctOption === i 
                          ? 'bg-geist-success/5 border-geist-success text-geist-success font-medium' 
                          : 'bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark'
                        }`}
                    >
                      <div className="mt-0.5">
                         {correctOption === i ? <CheckCircle className="w-4 h-4 fill-current opacity-20" /> : <Circle className="w-4 h-4 opacity-50" />}
                      </div>
                      <div className="flex-1 min-w-0 break-words flex flex-col gap-2">
                         {opt && <MarkdownRenderer content={opt} className="text-sm leading-snug" />}
                         {optionImage && (
                           <img src={optionImage} alt={`Option ${i+1}`} className="max-w-full max-h-48 object-contain rounded border border-geist-border-light dark:border-geist-border-dark" />
                         )}
                      </div>
                   </div>
                )})}
             </div>
             
             {(explanation || (explanationImages && explanationImages.length > 0)) && (
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                   <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Explanation</h4>
                   {explanation && <MarkdownRenderer content={explanation} className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed" />}
                   {explanationImages && (
                     <div className="mt-4 flex flex-wrap gap-2">
                       {(() => {
                         let imgs = [];
                         try { imgs = typeof explanationImages === 'string' ? JSON.parse(explanationImages) : explanationImages; } 
                         catch { imgs = [explanationImages]; }
                         return (Array.isArray(imgs) ? imgs : []).map((img: string, i: number) => (
                           <img key={i} src={img} alt="Explanation figure" className="max-w-full max-h-64 object-contain rounded border border-blue-200 dark:border-blue-900/50" />
                         ));
                       })()}
                     </div>
                   )}
                </div>
             )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-geist-border-light dark:border-geist-border-dark flex items-center justify-between bg-geist-surface-light dark:bg-geist-surface-dark">
             <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark disabled:opacity-30 transition-opacity hover:bg-geist-border-light dark:hover:bg-geist-border-dark"
             >
                <ChevronLeft className="w-4 h-4" /> Previous
             </button>
             
             <button 
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark disabled:opacity-30 transition-opacity hover:bg-geist-border-light dark:hover:bg-geist-border-dark"
             >
                Next <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
