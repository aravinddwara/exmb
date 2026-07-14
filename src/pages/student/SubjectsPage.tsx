import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/useUserStore";
import {
  ChevronRight,
  Play,
  BookOpen,
  Search,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const SubjectsPage: React.FC = () => {
  const { academicTree } = useUserStore();
  const navigate = useNavigate();

  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedChapterForPractice, setSelectedChapterForPractice] =
    useState<any>(null);
  const { papers, questions, attempts, booksSets } = useUserStore();
  const [selectedSourceType, setSelectedSourceType] = useState<
    "All" | "PYQ" | "BookSet"
  >("All");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  const availableSourcesForChapter = useMemo(() => {
    if (!selectedChapterForPractice) return { pyqs: [], bookSets: [] };

    const chapterQuestions = questions.filter(
      (q) => q.chapter_id === selectedChapterForPractice.id,
    );

    const pyqIds = new Set(
      chapterQuestions.filter((q) => q.paper_id).map((q) => q.paper_id),
    );
    const pyqs = papers.filter((p) => pyqIds.has(p.id));

    const bookSetIds = new Set(
      chapterQuestions.filter((q) => q.book_set_id).map((q) => q.book_set_id),
    );
    const availableBookSets = booksSets.filter((bs) => bookSetIds.has(bs.id));

    return {
      pyqs,
      hasBookSets: bookSetIds.size > 0,
      bookSets: availableBookSets,
    };
  }, [selectedChapterForPractice, questions, papers, booksSets]);

  // Do not set default class automatically
  useEffect(() => {
    // Intentionally empty
  }, []);

  const activeClass = useMemo(
    () => academicTree.find((c) => c.id === activeClassId),
    [academicTree, activeClassId],
  );

  // Set default subject for desktop
  useEffect(() => {
    // Only auto-select on desktop (we can infer from window width, but simpler is to let responsive classes handle visibility)
    // Actually, let's not auto-select to keep mobile drill-down clean, or only auto-select if we want dual pane
    // We will use CSS to show/hide panes.
  }, [activeClass]);

  const activeSubject = useMemo(
    () => activeClass?.children?.find((s) => s.id === activeSubjectId),
    [activeClass, activeSubjectId],
  );

  const startPractice = () => {
    if (!selectedChapterForPractice) return;

    const filter = {
      classIds: activeClassId ? [activeClassId] : [],
      subjectIds: activeSubjectId ? [activeSubjectId] : [],
      chapterIds: [selectedChapterForPractice.id],
      sourceType: selectedSourceType,
      sourceId: selectedSourceId,
      timeLimit: 0,
    };
    localStorage.setItem("practice_config", JSON.stringify(filter));
    navigate("/practice/session");
  };

  const getChapterStats = (chapterId: string) => {
    let total = 0;
    academicTree.forEach((cls) =>
      cls.children?.forEach((sub) =>
        sub.children?.forEach((chap) => {
          if (chap.id === chapterId) total = chap.questionCount || 0;
        })
      )
    );
    if (total === 0) return { progress: 0, total: 0 };
    return {
      progress: 0,
      total
    };
  };

  const filteredSubjects = useMemo(() => {
    let subjects: any[] = [];
    if (activeClassId && activeClass?.children) {
      subjects = activeClass.children.map((s) => ({
        ...s,
        _className: activeClass.name,
        _classId: activeClass.id,
      }));
    } else {
      subjects = academicTree.flatMap((cls) =>
        (cls.children || []).map((sub) => ({
          ...sub,
          _className: cls.name,
          _classId: cls.id,
        })),
      );
    }
    return subjects.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [academicTree, activeClassId, activeClass, searchQuery]);

  const filteredChapters = useMemo(() => {
    if (!activeSubject?.children) return [];
    return activeSubject.children.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [activeSubject, searchQuery]);

  if (academicTree.length === 0) {
    return (
      <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark">
        <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark">
          <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">
            Topic Practice
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center py-16">
            <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
              No academic data available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark">
      {/* Mobile Header (Hidden on Desktop when subject is selected) */}
      <div
        className={`px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md ${activeSubjectId ? "hidden md:block" : "block"}`}
      >
        <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors"
          >
            Dashboard
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
            Subjects & Chapters
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
          Topic Practice
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Pane: Subjects (Hidden on mobile if subject is selected) */}
        <div
          className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark transition-all duration-300 ${activeSubjectId ? "hidden md:flex" : "flex"}`}
        >
          {/* Class Selector */}
          <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0">
            <div className="flex overflow-x-auto no-scrollbar gap-2">
              {academicTree.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setActiveClassId(cls.id);
                    setActiveSubjectId(null);
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 outline-none border ${
                    activeClassId === cls.id
                      ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark border-transparent"
                      : "bg-transparent text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark"
                  }`}
                >
                  <GraduationCap
                    className={`w-4 h-4 ${activeClassId === cls.id ? "opacity-100" : "opacity-70"}`}
                  />
                  {cls.name}
                </button>
              ))}
            </div>

            <div className="mt-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl pl-9 pr-4 py-2.5 text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none focus:border-geist-text-primary-light dark:focus:border-geist-text-primary-dark transition-colors"
              />
            </div>
          </div>

          {/* Subjects List */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3">
            <div className="space-y-1.5">
              {filteredSubjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubjectId(sub.id);
                    if (!activeClassId) {
                      setActiveClassId(sub._classId);
                    }
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all outline-none border ${
                    activeSubjectId === sub.id
                      ? "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark shadow-sm"
                      : "bg-transparent border-transparent hover:bg-geist-surface-light/50 dark:hover:bg-geist-surface-dark/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeSubjectId === sub.id ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark" : "bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark"}`}
                    >
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span
                        className={`text-sm font-medium truncate ${activeSubjectId === sub.id ? "text-geist-text-primary-light dark:text-geist-text-primary-dark" : "text-geist-text-primary-light dark:text-geist-text-primary-dark"}`}
                      >
                        {sub.name}
                      </span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark truncate">
                        {sub._className}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${activeSubjectId === sub.id ? "text-geist-text-primary-light dark:text-geist-text-primary-dark translate-x-1" : "text-geist-text-secondary-light dark:text-geist-text-secondary-dark"}`}
                  />
                </button>
              ))}
              {filteredSubjects.length === 0 && !activeClassId && (
                <div className="text-center py-8 text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                  No subjects found.
                </div>
              )}
              {filteredSubjects.length === 0 && activeClassId && (
                <div className="text-center py-8 text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                  No subjects found for this class.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Chapters (Hidden on mobile if no subject is selected) */}
        <div
          className={`flex-1 flex-col bg-geist-surface-light/30 dark:bg-geist-surface-dark/30 z-20 md:flex ${activeSubjectId ? "flex" : "hidden md:flex"}`}
        >
          {activeSubject ? (
            <>
              <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md sticky top-0 z-10 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSubjectId(null)}
                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark line-clamp-1">
                    {activeSubject.name}
                  </h2>
                </div>
                <div className="relative md:hidden">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                  <input
                    type="text"
                    placeholder="Search chapters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl pl-9 pr-4 py-2 text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none focus:border-geist-text-primary-light dark:focus:border-geist-text-primary-dark transition-colors"
                  />
                </div>
                <div className="hidden md:flex relative max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                  <input
                    type="text"
                    placeholder="Search chapters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg pl-9 pr-4 py-2 text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none focus:border-geist-text-primary-light dark:focus:border-geist-text-primary-dark transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  <AnimatePresence>
                    {filteredChapters.map((chapter) => {
                      const stats = getChapterStats(chapter.id);
                      return (
                      <motion.div
                        key={chapter.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark hover:border-geist-text-primary-light dark:hover:border-geist-text-primary-dark transition-all shadow-sm hover:shadow-md gap-3"
                      >
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <h3
                            className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark truncate"
                            title={chapter.name}
                          >
                            {chapter.name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border border-geist-border-light dark:border-geist-border-dark whitespace-nowrap">
                              {stats.total} Qs
                            </span>
                            <div className="flex flex-col gap-1 w-24 hidden sm:flex">
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[10px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">
                                  {stats.progress}%
                                </span>
                              </div>
                              <div className="w-full bg-geist-surface-light dark:bg-geist-surface-dark h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-geist-success h-full transition-all"
                                  style={{
                                    width: `${stats.progress}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedChapterForPractice(chapter);
                              setSelectedSourceType("All");
                              setSelectedSourceId("");
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark hover:opacity-90 transition-opacity ml-2 shrink-0"
                          >
                            <Play className="w-4 h-4 ml-0.5" />
                          </button>
                        </div>
                      </motion.div>
                    )})}
                  </AnimatePresence>
                </div>
                {filteredChapters.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
                      No chapters found.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-geist-surface-light dark:bg-geist-surface-dark rounded-2xl flex items-center justify-center mx-auto mb-4 border border-geist-border-light dark:border-geist-border-dark">
                  <BookOpen className="w-8 h-8 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                </div>
                <h3 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-2">
                  Select a Subject
                </h3>
                <p className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                  Choose a subject from the left panel to view its chapters and
                  start practicing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Practice Options Modal */}
      {selectedChapterForPractice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark flex justify-between items-center bg-geist-surface-light/50 dark:bg-geist-surface-dark/50">
              <h3 className="font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">
                Practice Options
              </h3>
              <button
                onClick={() => setSelectedChapterForPractice(null)}
                className="text-geist-text-secondary-light hover:text-geist-text-primary-light"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mb-2">
                  Practice Source
                </label>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedSourceType("All");
                      setSelectedSourceId("");
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${selectedSourceType === "All" ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark border-transparent" : "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark"}`}
                  >
                    All Questions
                  </button>
                  <button
                    disabled={availableSourcesForChapter.pyqs.length === 0}
                    onClick={() => {
                      setSelectedSourceType("PYQ");
                      setSelectedSourceId("");
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedSourceType === "PYQ" ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark border-transparent" : "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark"}`}
                  >
                    PYQs
                  </button>
                  <button
                    disabled={!availableSourcesForChapter.hasBookSets}
                    onClick={() => {
                      setSelectedSourceType("BookSet");
                      setSelectedSourceId("");
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedSourceType === "BookSet" ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark border-transparent" : "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark"}`}
                  >
                    Books & Sets
                  </button>
                </div>
              </div>

              {selectedSourceType === "PYQ" && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[11px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mb-2">
                    Select Specific Paper
                  </label>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
                    <button
                      onClick={() => setSelectedSourceId("")}
                      className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${selectedSourceId === "" ? "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-text-primary-light dark:border-geist-text-primary-dark text-geist-text-primary-light dark:text-geist-text-primary-dark" : "bg-transparent border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"}`}
                    >
                      Any PYQ
                    </button>
                    {availableSourcesForChapter.pyqs.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedSourceId(p.id)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex justify-between items-center ${selectedSourceId === p.id ? "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-text-primary-light dark:border-geist-text-primary-dark text-geist-text-primary-light dark:text-geist-text-primary-dark" : "bg-transparent border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"}`}
                      >
                        <span className="truncate">{p.name}</span>
                        {p.year && (
                          <span className="text-[10px] ml-2 shrink-0 bg-geist-bg-light dark:bg-geist-bg-dark px-1.5 py-0.5 rounded border border-geist-border-light dark:border-geist-border-dark">
                            {p.year}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedSourceType === "BookSet" && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[11px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mb-2">
                    Select Specific Book / Set
                  </label>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
                    <button
                      onClick={() => setSelectedSourceId("")}
                      className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${selectedSourceId === "" ? "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-text-primary-light dark:border-geist-text-primary-dark text-geist-text-primary-light dark:text-geist-text-primary-dark" : "bg-transparent border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"}`}
                    >
                      Any Book / Set
                    </button>
                    {availableSourcesForChapter.bookSets.map((bs) => (
                      <button
                        key={bs.id}
                        onClick={() => setSelectedSourceId(bs.id)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${selectedSourceId === bs.id ? "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-text-primary-light dark:border-geist-text-primary-dark text-geist-text-primary-light dark:text-geist-text-primary-dark" : "bg-transparent border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"}`}
                      >
                        {bs.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-geist-text-secondary-light mt-2">
                    If 'Any Book / Set' is selected, includes all Book/Set
                    questions for this chapter.
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-geist-border-light dark:border-geist-border-dark flex justify-end gap-3 bg-geist-surface-light/50 dark:bg-geist-surface-dark/50">
              <button
                onClick={() => setSelectedChapterForPractice(null)}
                className="px-4 py-2 text-sm text-geist-text-secondary-light font-medium"
              >
                Cancel
              </button>
              <button
                onClick={startPractice}
                className="px-4 py-2 text-sm bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-lg font-medium hover:opacity-90"
              >
                Start Practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
