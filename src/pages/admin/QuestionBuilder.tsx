import React, { useState, useEffect } from 'react';
import { Save, Minimize2, Maximize2, Image as ImageIcon } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Dropdown } from '../../components/Dropdown';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';

export const QuestionBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const { addQuestion, updateQuestion, questions, classes, subjects, chapters, topics, exams, papers, questionTypes, booksSets, fetchAllQuestions } = useAdminStore();
  const navigate = useNavigate();

  const currentIndex = questions.findIndex(q => q.id === id);
  const prevQuestionId = currentIndex > 0 ? questions[currentIndex - 1].id : null;
  const nextQuestionId = currentIndex !== -1 && currentIndex < questions.length - 1 ? questions[currentIndex + 1].id : null;

  const [questionText, setQuestionText] = useState('');
  const [questionImages, setQuestionImages] = useState<string>('');
  
  const [options, setOptions] = useState(['', '', '', '']);
  const [optionImages, setOptionImages] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  
  const [examId, setExamId] = useState('');
  const [paperId, setPaperId] = useState('');
  
  const [questionTypeId, setQuestionTypeId] = useState('');
  const [bookSetId, setBookSetId] = useState('');
  
  const [difficulty, setDifficulty] = useState('Medium');
  const [positiveMarks, setPositiveMarks] = useState('4');
  const [negativeMarks, setNegativeMarks] = useState('-1');
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (questions.length === 0) {
      fetchAllQuestions();
    }
  }, [fetchAllQuestions, questions.length]);

  useEffect(() => {
    if (isEditing && id) {
      const q = questions.find(q => q.id === id);
      if (q) {
        setQuestionText(q.text || '');
        setQuestionImages(q.question_images ? (typeof q.question_images === 'string' ? q.question_images : JSON.stringify(q.question_images)) : '');
        setOptions([
          q.option_1 || q.options?.[0] || '',
          q.option_2 || q.options?.[1] || '',
          q.option_3 || q.options?.[2] || '',
          q.option_4 || q.options?.[3] || ''
        ]);
        setOptionImages([
          q.option_1_image || '',
          q.option_2_image || '',
          q.option_3_image || '',
          q.option_4_image || ''
        ]);
        setCorrectOption(q.correct_option ?? 0);
        setDifficulty(q.difficulty || 'Medium');
        setPositiveMarks(q.positive_marks?.toString() || '4');
        setNegativeMarks(q.negative_marks?.toString() || '-1');
        
        setQuestionTypeId(q.question_type_id || '');
        setBookSetId(q.book_set_id || '');
        
        if (q.chapter_id) {
           setChapterId(q.chapter_id);
           if (q.topic_id) {
             setTopicId(q.topic_id);
           }
           const chap = chapters.find(c => c.id === q.chapter_id);
           if (chap) {
             setSubjectId(chap.subject_id);
             const subj = subjects.find(s => s.id === chap.subject_id);
             if (subj) setClassId(subj.class_id);
           }
        }
        
        if (q.paper_id) {
           setPaperId(q.paper_id);
           const pap = papers.find(p => p.id === q.paper_id);
           if (pap) setExamId(pap.exam_id);
        }
      }
    }
  }, [isEditing, id, questions, chapters, subjects, papers]);

  const filteredSubjects = subjects.filter(s => s.class_id === classId);
  const filteredChapters = chapters.filter(c => c.subject_id === subjectId);
  const filteredTopics = topics.filter(t => t.chapter_id === chapterId);
  const filteredPapers = papers.filter(p => p.exam_id === examId);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleOptionImageChange = (index: number, value: string) => {
    const newOptionImages = [...optionImages];
    newOptionImages[index] = value;
    setOptionImages(newOptionImages);
  };

  const handleClear = () => {
    setQuestionText('');
    setQuestionImages('');
    setOptions(['', '', '', '']);
    setOptionImages(['', '', '', '']);
    setCorrectOption(0);
  };

  const handleSave = async () => {
    if (!chapterId) {
      alert("A Chapter is strictly required to save a question.");
      return;
    }

    let parsedImages = [];
    if (questionImages) {
      try {
        parsedImages = JSON.parse(questionImages);
      } catch {
        parsedImages = [questionImages];
      }
    }

    const qData: any = {
      text: questionText,
      question_images: parsedImages,
      option_1: options[0],
      option_1_image: optionImages[0],
      option_2: options[1],
      option_2_image: optionImages[1],
      option_3: options[2],
      option_3_image: optionImages[2],
      option_4: options[3],
      option_4_image: optionImages[3],
      options, // Keep fallback for compatibility
      correct_option: correctOption,
      type: 'SINGLE_CHOICE',
      difficulty,
      positive_marks: parseInt(positiveMarks),
      negative_marks: parseInt(negativeMarks),
      chapter_id: chapterId,
      topic_id: topicId || null,
      paper_id: paperId || null,
      status: 'Published'
    };
    
    try {
       if (isEditing && id) {
         await updateQuestion(id, qData);
       } else {
         await addQuestion({
           ...qData,
           id: uuidv4(),
         });
       }
       navigate('/admin/questions', { state: { message: isEditing ? 'Question updated successfully!' : 'Question created successfully!' } });
    } catch (err: any) {
       console.error("Failed to save:", err);
       alert("Failed to save: " + err.message);
    }
  };

  return (
    <div className="h-full flex flex-col font-sans overflow-hidden bg-geist-bg-light dark:bg-geist-bg-dark">
      {/* Header bar */}
      <div className="shrink-0 border-b border-geist-border-light dark:border-geist-border-dark flex items-center justify-between bg-geist-surface-light dark:bg-geist-surface-dark px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-semibold uppercase tracking-wider text-geist-text-primary-light dark:text-geist-text-primary-dark">
            {isEditing ? 'Edit Question' : 'Question Builder'}
          </h1>
          {isEditing && (
             <div className="flex items-center ml-2 border border-geist-border-light dark:border-geist-border-dark rounded overflow-hidden">
                <button 
                  disabled={!prevQuestionId}
                  onClick={() => navigate(`/admin/questions/edit/${prevQuestionId}`)}
                  className="px-2 py-1 text-[10px] font-medium bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark disabled:opacity-50 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark border-r border-geist-border-light dark:border-geist-border-dark transition-colors"
                >
                  Prev
                </button>
                <button 
                  disabled={!nextQuestionId}
                  onClick={() => navigate(`/admin/questions/edit/${nextQuestionId}`)}
                  className="px-2 py-1 text-[10px] font-medium bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark disabled:opacity-50 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors"
                >
                  Next
                </button>
             </div>
          )}
          <button onClick={() => setIsCompact(!isCompact)} className="flex items-center gap-1.5 text-[10px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors border border-geist-border-light dark:border-geist-border-dark px-2 py-1 rounded bg-geist-bg-light dark:bg-geist-bg-dark">
             {isCompact ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
             {isCompact ? 'Expand Meta' : 'Collapse Meta'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleClear} className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark px-2.5 py-1 rounded text-[10px] font-medium hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">
            Clear
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded font-medium hover:opacity-90 transition-colors text-xs">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Main Authoring Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Editor Pane */}
        <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-geist-border-light dark:border-geist-border-dark min-h-0 shrink-0">
          
          {/* Metadata Block (Collapsible) */}
          {!isCompact && (
            <div className="flex flex-col border-b border-geist-border-light dark:border-geist-border-dark bg-geist-surface-light dark:bg-geist-surface-dark shrink-0">
               <div className="flex p-2 gap-2 flex-wrap">
                 <Dropdown
                   value={classId}
                   onChange={val => {setClassId(val); setSubjectId(''); setChapterId('');}}
                   options={classes.map(c => ({value: c.id, label: c.name}))}
                   placeholder="Select Class (Required)"
                 />
                 <Dropdown 
                   value={subjectId} 
                   onChange={val => {setSubjectId(val); setChapterId('');}}
                   disabled={!classId}
                   options={filteredSubjects.map(s => ({value: s.id, label: s.name}))}
                   placeholder="Select Subject (Required)"
                 />
                 <Dropdown
                   value={chapterId}
                   onChange={val => {setChapterId(val); setTopicId('');}}
                   disabled={!subjectId}
                   options={filteredChapters.map(c => ({value: c.id, label: c.name}))}
                   placeholder="Select Chapter (Required)"
                 />
                 <Dropdown
                   value={topicId}
                   onChange={setTopicId}
                   disabled={!chapterId}
                   options={filteredTopics.map(t => ({value: t.id, label: t.name}))}
                   placeholder="Select Topic (Optional)"
                 />
               </div>
               <div className="flex p-2 gap-2 flex-wrap border-t border-geist-border-light dark:border-geist-border-dark">
                 <Dropdown
                   value={examId}
                   onChange={val => {setExamId(val); setPaperId('');}}
                   options={exams.map(e => ({value: e.id, label: e.name}))}
                   placeholder="Filter Papers by Exam (Optional)"
                 />
                 <Dropdown
                   value={paperId}
                   onChange={setPaperId}
                   disabled={!examId}
                   options={[{value: '', label: 'No Paper (Topical Only)'}, ...filteredPapers.map(p => ({value: p.id, label: p.name}))]}
                   placeholder="Assign to Paper (Optional)"
                 />
               </div>
               <div className="flex p-2 gap-2 flex-wrap border-t border-geist-border-light dark:border-geist-border-dark">
                  <Dropdown
                     value={questionTypeId}
                     onChange={setQuestionTypeId}
                     options={[{value: '', label: 'Default Type'}, ...questionTypes.map(qt => ({value: qt.id, label: qt.name}))]}
                     placeholder="Question Type"
                  />
                  <Dropdown
                     value={bookSetId}
                     onChange={setBookSetId}
                     options={[{value: '', label: 'No Book/Set'}, ...booksSets.map(bs => ({value: bs.id, label: bs.name}))]}
                     placeholder="Book / Set"
                  />
               </div>
               <div className="flex p-2 gap-2 flex-wrap border-t border-geist-border-light dark:border-geist-border-dark">
                  <Dropdown
                     value={difficulty}
                     onChange={setDifficulty}
                     options={[{value: 'Easy', label: 'Easy'}, {value: 'Medium', label: 'Medium'}, {value: 'Hard', label: 'Hard'}]}
                  />
                  <label className="flex items-center gap-1.5 text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-medium uppercase tracking-wider">
                     +Marks
                     <input type="number" value={positiveMarks} onChange={e => setPositiveMarks(e.target.value)} className="w-10 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded px-1.5 py-1 outline-none text-geist-text-primary-light dark:text-geist-text-primary-dark font-sans normal-case tracking-normal" />
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-medium uppercase tracking-wider">
                     -Marks
                     <input type="number" value={negativeMarks} onChange={e => setNegativeMarks(e.target.value)} className="w-10 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded px-1.5 py-1 outline-none text-geist-text-primary-light dark:text-geist-text-primary-dark font-sans normal-case tracking-normal" />
                  </label>
               </div>
            </div>
          )}

          {/* Editors */}
          <div className="flex-1 overflow-y-auto bg-geist-surface-light/30 dark:bg-geist-surface-dark/30 p-3 space-y-3">
            <div className="bg-geist-bg-light dark:bg-geist-bg-dark rounded border border-geist-border-light dark:border-geist-border-dark shadow-sm overflow-hidden flex flex-col">
              <div className="bg-geist-surface-light dark:bg-geist-surface-dark border-b border-geist-border-light dark:border-geist-border-dark px-3 py-1.5 text-[10px] font-semibold text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider flex justify-between items-center">
                 Question Content (LaTeX)
              </div>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full bg-transparent p-3 text-xs font-mono text-geist-text-primary-light dark:text-geist-text-primary-dark focus:outline-none resize-y min-h-[100px] leading-relaxed"
                placeholder="Enter mathematical representation using $...$ for inline, and $$...$$ for block equations."
              />
              <div className="border-t border-geist-border-light dark:border-geist-border-dark px-3 py-2 flex items-center gap-2 bg-geist-surface-light/50 dark:bg-geist-surface-dark/50">
                 <ImageIcon className="w-3.5 h-3.5 text-geist-text-secondary-light" />
                 <input
                    type="text"
                    value={questionImages}
                    onChange={(e) => setQuestionImages(e.target.value)}
                    placeholder="Question Images (JSON array or URL)"
                    className="flex-1 bg-transparent text-[10px] outline-none text-geist-text-primary-light dark:text-geist-text-primary-dark font-mono"
                 />
              </div>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className={`bg-geist-bg-light dark:bg-geist-bg-dark rounded border shadow-sm overflow-hidden flex flex-col transition-colors ${correctOption === index ? 'border-geist-success/50 ring-1 ring-geist-success/20' : 'border-geist-border-light dark:border-geist-border-dark'}`}>
                  <div className="flex">
                    <button 
                      onClick={() => setCorrectOption(index)}
                      className={`w-10 shrink-0 flex items-center justify-center border-r border-geist-border-light dark:border-geist-border-dark transition-colors ${correctOption === index ? 'bg-geist-success/10 text-geist-success' : 'bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light hover:bg-geist-border-light dark:hover:bg-geist-border-dark'}`}
                      title={correctOption === index ? 'Correct Answer' : 'Mark as Correct'}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${correctOption === index ? 'border-geist-success bg-geist-success text-white' : 'border-geist-text-secondary-light/30'}`}>
                         {correctOption === index ? '✓' : String.fromCharCode(65 + index)}
                      </div>
                    </button>
                    <textarea
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 bg-transparent p-2 text-xs font-mono text-geist-text-primary-light dark:text-geist-text-primary-dark focus:outline-none resize-none h-[48px]"
                      placeholder={`Option ${index + 1} (LaTeX supported)`}
                    />
                  </div>
                  <div className="border-t border-geist-border-light dark:border-geist-border-dark px-2 py-1.5 flex items-center gap-2 bg-geist-surface-light/30 dark:bg-geist-surface-dark/30 ml-10">
                     <ImageIcon className="w-3 h-3 text-geist-text-secondary-light" />
                     <input
                        type="text"
                        value={optionImages[index]}
                        onChange={(e) => handleOptionImageChange(index, e.target.value)}
                        placeholder="Option Image URL"
                        className="flex-1 bg-transparent text-[10px] outline-none text-geist-text-primary-light dark:text-geist-text-primary-dark font-mono"
                     />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="w-full md:w-1/2 relative bg-geist-surface-light/50 dark:bg-geist-surface-dark/50 overflow-y-auto">
          <div className="sticky top-0 bg-geist-bg-light/90 dark:bg-geist-bg-dark/90 backdrop-blur border-b border-geist-border-light dark:border-geist-border-dark p-2 px-3 z-10 flex items-center justify-between">
             <span className="text-[10px] font-bold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Live Preview</span>
             <span className="text-[9px] font-medium px-1.5 py-0.5 bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-primary-light dark:text-geist-text-primary-dark rounded border border-geist-border-light dark:border-geist-border-dark">NTA Simulator</span>
          </div>
          
          <div className="p-4 md:p-6">
            <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-md p-4 shadow-sm font-serif">
                <div className="flex justify-between items-center border-b border-geist-border-light dark:border-geist-border-dark pb-2 mb-4 font-sans">
                   <div className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Exam Mode View</div>
                   <div className="text-[10px] font-medium flex gap-1.5">
                     <span className="text-geist-success bg-geist-success/10 px-1 py-0.5 rounded border border-geist-success/20">+{positiveMarks}</span>
                     <span className="text-geist-error-light dark:text-geist-error-dark bg-geist-error-light/10 dark:bg-geist-error-dark/10 px-1 py-0.5 rounded border border-geist-error-light/20 dark:border-geist-error-dark/20">{negativeMarks}</span>
                   </div>
                </div>

                <div className="text-[14px] leading-relaxed mb-6 text-geist-text-primary-light dark:text-geist-text-primary-dark">
                   {questionText ? (
                     <MarkdownRenderer content={questionText} className="text-sm" />
                   ) : (
                     <div className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark italic text-xs">Question will appear here...</div>
                   )}
                   {questionImages && (
                      <div className="mt-4 flex flex-wrap gap-2">
                         {(() => {
                            let imgs = [];
                            try { imgs = JSON.parse(questionImages); } catch { imgs = [questionImages]; }
                            return imgs.map((img: string, i: number) => (
                               <img key={i} src={img} alt="Question figure" className="max-w-full max-h-48 object-contain border border-geist-border-light dark:border-geist-border-dark rounded" />
                            ));
                         })()}
                      </div>
                   )}
                </div>

                <div className="space-y-3 text-[13px]">
                   {options.map((option, index) => (
                      <div key={index} className="flex flex-row items-start gap-3">
                         <div className="shrink-0 w-5 h-5 rounded-full border border-geist-text-primary-light dark:border-geist-text-primary-dark flex items-center justify-center font-sans text-[10px] mt-0.5 text-geist-text-primary-light dark:text-geist-text-primary-dark">
                            {index + 1}
                         </div>
                         <div className="flex-1 text-geist-text-primary-light dark:text-geist-text-primary-dark pt-0.5 whitespace-pre-wrap">
                            {option ? <MarkdownRenderer content={option} className="text-sm inline-block" /> : <span className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark italic text-xs">...</span>}
                            {optionImages[index] && (
                               <div className="mt-2">
                                  <img src={optionImages[index]} alt={`Option ${index+1}`} className="max-w-full max-h-32 object-contain border border-geist-border-light dark:border-geist-border-dark rounded" />
                               </div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
