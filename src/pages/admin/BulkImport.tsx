import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, AlertTriangle, CheckCircle, ArrowRight, Settings2, Table } from 'lucide-react';
import { useAdminStore, QuestionData } from '../../store/useAdminStore';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { Dropdown } from '../../components/Dropdown';

const EditableCell = React.memo(({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [localVal, setLocalVal] = useState(value);
  
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <input
       type="text"
       value={localVal}
       onChange={(e) => setLocalVal(e.target.value)}
       onBlur={() => { if (localVal !== value) onChange(localVal); }}
       className="w-full h-full px-3 py-1.5 bg-transparent border-none outline-none text-xs text-geist-text-primary-light dark:text-geist-text-primary-dark"
    />
  );
});

export const BulkImport: React.FC = () => {
  const { addQuestionsBulk, chapters, papers, fetchCoreData } = useAdminStore();
  
  useEffect(() => {
    fetchCoreData();
  }, []);

  const [status, setStatus] = useState<'idle' | 'mapping' | 'uploading' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [rowRangeInput, setRowRangeInput] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 50;
  
  // Mappings state: DB Field -> CSV Column Name
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  // Default values
  const [defaultChapter, setDefaultChapter] = useState<string>('');
  const [defaultPaper, setDefaultPaper] = useState<string>('');
  
  const [presets, setPresets] = useState<any[]>([]);
  const [presetName, setPresetName] = useState<string>('');
  const [searchPresetQuery, setSearchPresetQuery] = useState<string>('');
  const [showPresetModal, setShowPresetModal] = useState<boolean>(false);

  useEffect(() => {
    const loaded = localStorage.getItem('bulkImportPresetsList');
    if (loaded) {
      try { setPresets(JSON.parse(loaded)); } catch {}
    }
  }, []);
  
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSVFile = (file: File) => {
    setErrorMsg(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      worker: true,
      complete: (results: any) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setErrorMsg(`CSV Parse Error: ${results.errors[0].message}`);
          return;
        }
        if (results.data.length === 0) {
          setErrorMsg("CSV file is empty.");
          return;
        }
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);
        setSelectedRows(new Set(results.data.map((_, i) => i)));
        
        // Auto-map based on common names
        const autoMappings: Record<string, string> = {};
        const getMatch = (possible: string[]) => headers.find(h => possible.includes(h.toLowerCase().trim()));
        
        autoMappings['id'] = getMatch(['id', 'question_id']) || '';
        autoMappings['text'] = getMatch(['text', 'question', 'question_text', 'q']) || '';
        autoMappings['options'] = getMatch(['options', 'choices', 'answers']) || '';
        autoMappings['option_1'] = getMatch(['option_1', 'option_a', 'option 1', 'option a']) || '';
        autoMappings['option_2'] = getMatch(['option_2', 'option_b', 'option 2', 'option b']) || '';
        autoMappings['option_3'] = getMatch(['option_3', 'option_c', 'option 3', 'option c']) || '';
        autoMappings['option_4'] = getMatch(['option_4', 'option_d', 'option 4', 'option d']) || '';
        autoMappings['correct_option'] = getMatch(['correct_option', 'correct', 'answer', 'correct_answer', 'correct_options']) || '';
        autoMappings['chapter_id'] = getMatch(['chapter_id', 'chapter']) || '';
        autoMappings['difficulty'] = getMatch(['difficulty', 'level']) || '';
        autoMappings['positive_marks'] = getMatch(['positive_marks', 'marks', 'score']) || '';
        autoMappings['negative_marks'] = getMatch(['negative_marks', 'penalty']) || '';
        autoMappings['type'] = getMatch(['type', 'question_type']) || '';
        autoMappings['question_images'] = getMatch(['question_images', 'question_image_urls']) || '';
        autoMappings['option_1_image'] = getMatch(['option_1_image', 'option_a_images', 'option_a_image_url']) || '';
        autoMappings['option_2_image'] = getMatch(['option_2_image', 'option_b_images', 'option_b_image_url']) || '';
        autoMappings['option_3_image'] = getMatch(['option_3_image', 'option_c_images', 'option_c_image_url']) || '';
        autoMappings['option_4_image'] = getMatch(['option_4_image', 'option_d_images', 'option_d_image_url']) || '';
        autoMappings['explanation'] = getMatch(['explanation', 'text_solution', 'solution']) || '';
        autoMappings['explanation_images'] = getMatch(['explanation_images', 'text_solution_image_urls', 'solution_images']) || '';
        
        setMappings(autoMappings);
        setStatus('mapping');
      },
      error: (error) => {
        setErrorMsg(`CSV Parse Error: ${error.message}`);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processCSVFile(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name.');
      return;
    }
    const newPreset = { id: Date.now(), name: presetName, mappings, defaultChapter, defaultPaper };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('bulkImportPresetsList', JSON.stringify(updatedPresets));
    setPresetName('');
    alert('Preset saved successfully.');
  };

  const handleLoadPreset = (preset: any) => {
    if (preset.mappings) setMappings(preset.mappings);
    if (preset.defaultChapter) setDefaultChapter(preset.defaultChapter);
    if (preset.defaultPaper) setDefaultPaper(preset.defaultPaper);
    setShowPresetModal(false);
  };

  const handleApplyRowRange = () => {
    if (!rowRangeInput.trim()) return;
    const newSelection = new Set<number>();
    const parts = rowRangeInput.split(',');
    parts.forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i > 0 && i <= csvData.length) newSelection.add(i - 1);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num > 0 && num <= csvData.length) {
          newSelection.add(num - 1);
        }
      }
    });
    setSelectedRows(newSelection);
  };

  const handleImport = async () => {
    if (!mappings['text']) {
      setErrorMsg("Question text mapping is required.");
      return;
    }
    
    if (!mappings['chapter_id'] && !defaultChapter) {
      setErrorMsg("You must map a chapter_id column or select a default chapter.");
      return;
    }

    setIsUploading(true);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg(null);

    try {
      const questionsToInsert: QuestionData[] = [];
      const validUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      
      const rowsToProcess = csvData.filter((_, i) => selectedRows.has(i));

      for (let i = 0; i < rowsToProcess.length; i++) {
        if (i > 0 && i % 250 === 0) {
           setProgress(Math.round((i / rowsToProcess.length) * 50));
           await new Promise(resolve => setTimeout(resolve, 0));
        }

        const row = rowsToProcess[i];
        
        // Text validation
        let textVal = mappings['text'] ? row[mappings['text']]?.trim() : '';
        if (!textVal) continue; // Skip empty rows

        let explanationVal = mappings['explanation'] ? row[mappings['explanation']]?.trim() : '';

        // Options parsing
        let optionsStr = mappings['options'] ? row[mappings['options']] : '';
        let opt1 = mappings['option_1'] ? row[mappings['option_1']] : '';
        let opt2 = mappings['option_2'] ? row[mappings['option_2']] : '';
        let opt3 = mappings['option_3'] ? row[mappings['option_3']] : '';
        let opt4 = mappings['option_4'] ? row[mappings['option_4']] : '';

        let optionsArray = ["Option A", "Option B", "Option C", "Option D"]; // fallback
        if (optionsStr) {
          try {
            optionsArray = JSON.parse(optionsStr);
          } catch (e) {
            optionsArray = optionsStr.split('||').map((s: string) => s.trim());
          }
        } else if (opt1 || opt2 || opt3 || opt4) {
          optionsArray = [opt1, opt2, opt3, opt4];
        }
        
        // Correct Option
        let correctOptRaw = mappings['correct_option'] ? row[mappings['correct_option']]?.toString().trim() : '0';
        let correctOpt = parseInt(correctOptRaw, 10);
        if (isNaN(correctOpt)) {
            const firstChar = correctOptRaw.toUpperCase().charAt(0);
            if (firstChar === 'A') correctOpt = 0;
            else if (firstChar === 'B') correctOpt = 1;
            else if (firstChar === 'C') correctOpt = 2;
            else if (firstChar === 'D') correctOpt = 3;
            else correctOpt = 0;
        }
        
        // Chapter ID validation
        let cIdRaw = mappings['chapter_id'] ? row[mappings['chapter_id']] : '';
        let cId = validUuidRegex.test(cIdRaw) ? cIdRaw : '';
        
        if (!cId) {
            // Try to match by chapter name if it's not a UUID
            if (cIdRaw) {
                const normalizedRaw = cIdRaw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                const matchedChapter = chapters.find(c => c.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === normalizedRaw);
                if (matchedChapter) cId = matchedChapter.id;
            }
        }
        
        if (!cId || !validUuidRegex.test(cId)) {
           // Skip row or use default
           if (defaultChapter && validUuidRegex.test(defaultChapter)) {
              cId = defaultChapter;
           } else {
              continue; // skip invalid row
           }
        }

        // Paper ID validation
        let pIdRaw = mappings['paper_id'] ? row[mappings['paper_id']] : '';
        let pId = validUuidRegex.test(pIdRaw) ? pIdRaw : defaultPaper;
        if (!pId || !validUuidRegex.test(pId)) pId = null;

        let qImagesStr = mappings['question_images'] ? row[mappings['question_images']] : '';
        let qImagesArray = [];
        if (qImagesStr) {
           try { qImagesArray = JSON.parse(qImagesStr); }
           catch { 
             qImagesArray = qImagesStr.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
           }
        }

        let qIdRaw = mappings['id'] ? row[mappings['id']] : '';
        let finalId = qIdRaw ? qIdRaw.toString().trim() : uuidv4();

        let expImagesStr = mappings['explanation_images'] ? row[mappings['explanation_images']] : '';
        let expImagesArray = [];
        if (expImagesStr) {
           try { expImagesArray = JSON.parse(expImagesStr); }
           catch { 
             expImagesArray = expImagesStr.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
           }
        }

        let parsedType = mappings['type'] ? row[mappings['type']]?.toString().toUpperCase().trim() : '';
        let dbType = 'SINGLE_CHOICE';
        if (parsedType) {
           if (parsedType.includes('MULTI') || parsedType.includes('MAQ')) dbType = 'MULTIPLE_CHOICE';
           else if (parsedType.includes('NUM') || parsedType.includes('SUBJ')) dbType = 'NUMERICAL';
           else if (parsedType.includes('INT')) dbType = 'INTEGER';
           else if (parsedType.includes('MATRIX') || parsedType.includes('MATCH')) dbType = 'MATRIX_MATCH';
           else dbType = 'SINGLE_CHOICE'; // fallback for 'MCQ' or others
        }

        questionsToInsert.push({
          id: finalId,
          chapter_id: cId,
          paper_id: pId,
          text: textVal,
          question_images: qImagesArray,
          option_1: opt1,
          option_1_image: mappings['option_1_image'] ? row[mappings['option_1_image']] : '',
          option_2: opt2,
          option_2_image: mappings['option_2_image'] ? row[mappings['option_2_image']] : '',
          option_3: opt3,
          option_3_image: mappings['option_3_image'] ? row[mappings['option_3_image']] : '',
          option_4: opt4,
          option_4_image: mappings['option_4_image'] ? row[mappings['option_4_image']] : '',
          options: optionsArray,
          correct_option: correctOpt,
          explanation: explanationVal,
          explanation_images: expImagesArray,
          type: dbType,
          difficulty: (mappings['difficulty'] ? row[mappings['difficulty']] : 'Medium') || 'Medium',
          positive_marks: parseFloat((mappings['positive_marks'] ? row[mappings['positive_marks']] : '4') || '4'),
          negative_marks: parseFloat((mappings['negative_marks'] ? row[mappings['negative_marks']] : '-1') || '-1'),
          status: 'Published'
        });
      }

      if (questionsToInsert.length > 0) {
        setProgress(75);
        await addQuestionsBulk(questionsToInsert);
        setSuccessCount(questionsToInsert.length);
        setProgress(100);
        setStatus('success');
        setTimeout(() => { setStatus('idle'); setCsvData([]); setCsvHeaders([]); }, 4000);
      } else {
        throw new Error("No valid rows found to import (check chapter assignments).");
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process import.');
      setStatus('mapping');
    } finally {
      setIsUploading(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const renderMappingRow = (label: string, field: string, required: boolean = false) => (
    <div className="flex items-center justify-between py-3 border-b border-geist-border-light dark:border-geist-border-dark last:border-0">
      <div className="w-1/3">
        <span className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">{label} {required && <span className="text-geist-error-light">*</span>}</span>
      </div>
      <div className="w-2/3 max-w-xs">
        <select 
          className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark text-geist-text-primary-light dark:text-geist-text-primary-dark rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          value={mappings[field] || ''}
          onChange={(e) => setMappings({ ...mappings, [field]: e.target.value })}
        >
          <option value="">-- Ignore / Use Default --</option>
          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full h-full flex flex-col font-sans">
      <h1 className="text-2xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-1">Bulk Content Ingestion</h1>
      <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-6 text-sm font-light">Upload CSV, map columns to database fields, and import directly.</p>

      {errorMsg && (
        <div className="mb-6 bg-geist-error-light/10 dark:bg-geist-error-dark/10 border border-geist-error-light/20 dark:border-geist-error-dark/50 text-geist-error-light dark:text-geist-error-dark p-3 rounded-md flex items-center gap-2 text-xs min-h-[36px]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {status === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="col-span-1 lg:col-span-2">
              <div 
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center h-[240px] md:h-[300px] transition-colors cursor-pointer group border-geist-border-light dark:border-geist-border-dark bg-geist-surface-light dark:bg-geist-surface-dark hover:bg-geist-border-light dark:hover:bg-geist-border-dark"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                <div className="w-12 h-12 md:w-16 md:h-16 bg-geist-bg-light dark:bg-geist-bg-dark rounded-full shadow-sm border border-geist-border-light dark:border-geist-border-dark flex items-center justify-center mb-3 md:mb-4 group-hover:-translate-y-1 transition-transform">
                  <UploadCloud className="w-6 h-6 md:w-8 md:h-8 text-geist-text-primary-light dark:text-geist-text-primary-dark" />
                </div>
                <h3 className="text-sm md:text-base font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-1 md:mb-2">Drag and drop CSV file here</h3>
                <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-[10px] md:text-xs max-w-sm mb-4 md:mb-6">Upload an export to map into the datastore.</p>
                
                <div className="flex gap-3">
                  <button className="bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-4 py-2 md:px-6 md:py-2.5 rounded-md text-[10px] md:text-xs font-medium hover:opacity-80 transition-opacity pointer-events-none min-h-[32px] md:min-h-[40px]">
                    Browse Local Files
                  </button>
                  <a href="/sample_questions.csv" download onClick={(e) => e.stopPropagation()} className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark text-geist-text-primary-light dark:text-geist-text-primary-dark px-4 py-2 md:px-6 md:py-2.5 rounded-md text-[10px] md:text-xs font-medium hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors flex items-center justify-center min-h-[32px] md:min-h-[40px]">
                    Download Template
                  </a>
                </div>
              </div>
          </div>
          <div className="col-span-1 flex flex-col gap-3 md:gap-4">
            {/* Info panel */}
            <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-4 md:p-5">
                <h4 className="text-xs md:text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> CSV Guidelines</h4>
                <ul className="text-[10px] md:text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark space-y-1.5 list-disc list-inside">
                  <li>First row must contain column headers.</li>
                  <li>Options should be JSON array or separated by `||`.</li>
                  <li>Correct option should be index (0, 1, 2, 3).</li>
                </ul>
            </div>
          </div>
        </div>
      )}

      {status === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-6">
            <h3 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Column Mapping
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setShowPresetModal(true)} className="text-xs px-3 py-1.5 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark rounded-md hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors">
                  Load Preset
                </button>
                <div className="flex border border-geist-border-light dark:border-geist-border-dark rounded-md overflow-hidden bg-geist-surface-light dark:bg-geist-surface-dark">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name"
                    className="text-xs px-3 py-1.5 bg-transparent border-none outline-none text-geist-text-primary-light dark:text-geist-text-primary-dark"
                  />
                  <button onClick={handleSavePreset} className="text-xs px-3 py-1.5 border-l border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors">
                    Save Preset
                  </button>
                </div>
              </div>
            </h3>
            <div className="bg-geist-bg-light dark:bg-geist-bg-dark rounded-lg border border-geist-border-light dark:border-geist-border-dark px-4">
              {renderMappingRow('Question ID (optional)', 'id')}
              {renderMappingRow('Question Text', 'text', true)}
              {renderMappingRow('Question Images (JSON array or URL)', 'question_images')}
              {renderMappingRow('Option 1 Text', 'option_1')}
              {renderMappingRow('Option 1 Image', 'option_1_image')}
              {renderMappingRow('Option 2 Text', 'option_2')}
              {renderMappingRow('Option 2 Image', 'option_2_image')}
              {renderMappingRow('Option 3 Text', 'option_3')}
              {renderMappingRow('Option 3 Image', 'option_3_image')}
              {renderMappingRow('Option 4 Text', 'option_4')}
              {renderMappingRow('Option 4 Image', 'option_4_image')}
              {renderMappingRow('Options Array (Fallback)', 'options')}
              {renderMappingRow('Correct Option Index (0-3)', 'correct_option')}
              {renderMappingRow('Explanation Text', 'explanation')}
              {renderMappingRow('Explanation Images', 'explanation_images')}
              {renderMappingRow('Chapter ID (UUID)', 'chapter_id')}
              {renderMappingRow('Paper ID (UUID)', 'paper_id')}
              {renderMappingRow('Difficulty', 'difficulty')}
              {renderMappingRow('Type (SINGLE_CHOICE, etc)', 'type')}
              {renderMappingRow('Positive Marks', 'positive_marks')}
              {renderMappingRow('Negative Marks', 'negative_marks')}
            </div>
            
            <div className="mt-6 border-t border-geist-border-light dark:border-geist-border-dark pt-6">
               <h4 className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">Fallback Settings</h4>
               <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark max-w-sm">
                       If a row is missing a Chapter ID or has an invalid format, assign it to this default chapter:
                    </span>
                    <select 
                       className="w-full max-w-xs bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark text-geist-text-primary-light dark:text-geist-text-primary-dark rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                       value={defaultChapter}
                       onChange={(e) => setDefaultChapter(e.target.value)}
                    >
                       <option value="">-- Do not import row --</option>
                       {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark max-w-sm">
                       If a row is missing a Paper ID, optionally assign it to this paper:
                    </span>
                    <select 
                       className="w-full max-w-xs bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark text-geist-text-primary-light dark:text-geist-text-primary-dark rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                       value={defaultPaper}
                       onChange={(e) => setDefaultPaper(e.target.value)}
                    >
                       <option value="">-- No Paper --</option>
                       {papers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
               </div>
            </div>
          </div>

          <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-6 overflow-hidden flex flex-col">
            <h3 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5" />
                Sheets Editor ({csvData.length} rows)
              </div>
              <div className="flex border border-geist-border-light dark:border-geist-border-dark rounded-md overflow-hidden bg-geist-bg-light dark:bg-geist-bg-dark">
                 <input 
                    type="text" 
                    placeholder="Row range (e.g. 1-51, 54, 65)" 
                    className="text-xs px-3 py-1.5 bg-transparent border-none outline-none text-geist-text-primary-light dark:text-geist-text-primary-dark w-[180px]"
                    value={rowRangeInput}
                    onChange={(e) => setRowRangeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyRowRange(); }}
                 />
                 <button onClick={handleApplyRowRange} className="text-xs px-3 py-1.5 border-l border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">
                    Select Range
                 </button>
              </div>
            </h3>
            <div className="overflow-x-auto border border-geist-border-light dark:border-geist-border-dark rounded-lg bg-geist-bg-light dark:bg-geist-bg-dark max-h-96">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-geist-surface-light dark:bg-geist-surface-dark border-b border-geist-border-light dark:border-geist-border-dark sticky top-0 z-10">
                  <tr>
                    <th className="w-10 px-3 py-2 text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark whitespace-nowrap border-r border-geist-border-light dark:border-geist-border-dark text-center">
                      <input 
                         type="checkbox" 
                         checked={selectedRows.size === csvData.length && csvData.length > 0} 
                         onChange={(e) => {
                            if (e.target.checked) {
                               const newSet = new Set<number>();
                               for(let j = 0; j < csvData.length; j++) newSet.add(j);
                               setSelectedRows(newSet);
                            } else {
                               setSelectedRows(new Set());
                            }
                         }} 
                      />
                    </th>
                    <th className="w-10 px-3 py-2 text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark whitespace-nowrap border-r border-geist-border-light dark:border-geist-border-dark text-center">#</th>
                    {csvHeaders.map(h => (
                      <th key={h} className="px-3 py-2 text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark whitespace-nowrap border-r border-geist-border-light dark:border-geist-border-dark last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-geist-border-light dark:divide-geist-border-dark">
                  {csvData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row, rowIndex) => {
                    const i = (currentPage - 1) * rowsPerPage + rowIndex;
                    return (
                    <tr key={i} className="hover:bg-geist-surface-light/50 dark:hover:bg-geist-surface-dark/50">
                      <td className="px-3 py-1.5 text-center border-r border-geist-border-light dark:border-geist-border-dark w-10 bg-geist-surface-light/30 dark:bg-geist-surface-dark/30">
                         <input 
                            type="checkbox" 
                            checked={selectedRows.has(i)}
                            onChange={(e) => {
                               const newSet = new Set(selectedRows);
                               if (e.target.checked) newSet.add(i);
                               else newSet.delete(i);
                               setSelectedRows(newSet);
                            }}
                         />
                      </td>
                      <td className="px-3 py-1.5 text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark bg-geist-surface-light/30 dark:bg-geist-surface-dark/30 border-r border-geist-border-light dark:border-geist-border-dark text-center w-10">{i + 1}</td>
                      {csvHeaders.map(h => (
                        <td key={h} className="p-0 border-r border-geist-border-light dark:border-geist-border-dark last:border-0 min-w-[150px]">
                           <EditableCell
                              value={row[h] || ''}
                              onChange={(val) => {
                                 setCsvData(prev => {
                                   const newData = [...prev];
                                   newData[i] = { ...newData[i], [h]: val };
                                   return newData;
                                 });
                              }}
                           />
                        </td>
                      ))}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            {csvData.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                <span>Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, csvData.length)} of {csvData.length} entries</span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="px-2 py-1 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span>Page {currentPage} of {Math.ceil(csvData.length / rowsPerPage)}</span>
                  <button 
                    disabled={currentPage === Math.ceil(csvData.length / rowsPerPage)} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-2 py-1 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-3 shrink-0">
               <button onClick={() => { setStatus('idle'); setCsvData([]); }} className="px-4 py-2 border border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light rounded-md text-sm font-medium hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">
                 Cancel
               </button>
               <button onClick={handleImport} className="flex items-center gap-2 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-6 py-2 rounded-md text-sm font-medium hover:opacity-80 transition-opacity">
                 Begin Import <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-full max-w-md">
            <h3 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-6">Processing Records...</h3>
            <div className="flex justify-between text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2">
              <span>Importing to database</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-geist-border-light dark:bg-geist-border-dark rounded-full h-2 overflow-hidden mb-4">
              <div className="bg-blue-500 h-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-geist-success/5 border border-geist-success/20 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 bg-geist-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-geist-success" />
          </div>
          <h3 className="text-xl font-medium text-geist-success mb-2">Import Successful</h3>
          <p className="text-geist-success/80 text-sm">Successfully processed and imported {successCount} questions.</p>
        </div>
      )}

      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-geist-bg-light dark:bg-geist-bg-dark rounded-xl border border-geist-border-light dark:border-geist-border-dark p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-4">Saved Presets</h3>
            <input 
              type="text"
              placeholder="Search presets..."
              className="w-full bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark text-geist-text-primary-light dark:text-geist-text-primary-dark rounded-md px-3 py-2 text-sm mb-4 outline-none"
              value={searchPresetQuery}
              onChange={(e) => setSearchPresetQuery(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {presets.filter(p => p.name.toLowerCase().includes(searchPresetQuery.toLowerCase())).map(preset => (
                <div key={preset.id} className="flex items-center justify-between p-3 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-md">
                  <span className="text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark font-medium">{preset.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleLoadPreset(preset)} className="text-xs bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded-md hover:opacity-80">
                      Load
                    </button>
                    <button onClick={() => {
                      const newPresets = presets.filter(p => p.id !== preset.id);
                      setPresets(newPresets);
                      localStorage.setItem('bulkImportPresetsList', JSON.stringify(newPresets));
                    }} className="text-xs bg-geist-error-light/10 text-geist-error-light px-3 py-1.5 rounded-md hover:bg-geist-error-light/20">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {presets.length === 0 && (
                <div className="text-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm py-4">No presets found.</div>
              )}
            </div>
            <div className="flex justify-end">
               <button onClick={() => setShowPresetModal(false)} className="px-4 py-2 border border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light rounded-md text-sm font-medium hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

