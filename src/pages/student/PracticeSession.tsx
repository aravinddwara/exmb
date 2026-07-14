import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/useUserStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Bookmark,
  Menu,
  X,
  LayoutGrid,
  Circle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";
import { CustomDropdown } from "../../components/CustomDropdown";
import { AddToCustomListDropdown } from "../../components/AddToCustomListDropdown";

export const PracticeSession: React.FC = () => {
  const { questions, academicTree } = useUserStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [showGridMobile, setShowGridMobile] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>(
    {},
  );
  const [sessionName, setSessionName] = useState("Practice Session");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [questionStats, setQuestionStats] = useState<
    Record<string, { total: number; mistakes: number }>
  >({});
  const { attempts } = useUserStore();
  
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    try {
      const configStr = localStorage.getItem("practice_config");
      if (!configStr) {
        navigate("/dashboard");
        return;
      }

      const rawConfig = JSON.parse(configStr);

      // Validate config shape to prevent injection / prototype pollution
      const config = {
        chapterIds: Array.isArray(rawConfig.chapterIds) ? rawConfig.chapterIds.filter((id: any) => typeof id === 'string') : [],
        subjectIds: Array.isArray(rawConfig.subjectIds) ? rawConfig.subjectIds.filter((id: any) => typeof id === 'string') : [],
        classIds: Array.isArray(rawConfig.classIds) ? rawConfig.classIds.filter((id: any) => typeof id === 'string') : [],
        topicIds: Array.isArray(rawConfig.topicIds) ? rawConfig.topicIds.filter((id: any) => typeof id === 'string') : [],
        sourceType: typeof rawConfig.sourceType === 'string' ? rawConfig.sourceType : undefined,
        sourceId: typeof rawConfig.sourceId === 'string' ? rawConfig.sourceId : undefined,
        questionOrder: typeof rawConfig.questionOrder === 'string' ? rawConfig.questionOrder : 'random',
        questionCount: typeof rawConfig.questionCount === 'number' ? Math.min(Math.max(0, rawConfig.questionCount), 500) : 0,
        timeLimit: typeof rawConfig.timeLimit === 'number' ? Math.min(Math.max(0, rawConfig.timeLimit), 86400) : 0,
      };

      // Determine session name based on config
      let name = "Practice Session";
      if (config.chapterIds?.length === 1) {
        academicTree.forEach((cls) =>
          cls.children?.forEach((sub) =>
            sub.children?.forEach((chap) => {
              if (chap.id === config.chapterIds[0]) name = chap.name;
            }),
          ),
        );
      } else if (config.subjectIds?.length === 1) {
        academicTree.forEach((cls) =>
          cls.children?.forEach((sub) => {
            if (sub.id === config.subjectIds[0]) name = sub.name;
          }),
        );
      }
      setSessionName(name);

      // Filter questions locally based on topic_id, chapter_id, etc.
      let pool = questions;

      if (config.topicIds?.length > 0) {
        pool = pool.filter((q) => config.topicIds.includes(q.topic_id));
      } else if (config.chapterIds?.length > 0) {
        pool = pool.filter((q) => config.chapterIds.includes(q.chapter_id));
      } else if (config.subjectIds?.length > 0) {
        const targetChapterIds: string[] = [];
        academicTree.forEach((cls) => {
          cls.children?.forEach((sub) => {
            if (config.subjectIds.includes(sub.id)) {
              sub.children?.forEach((chap) => {
                targetChapterIds.push(chap.id);
              });
            }
          });
        });
        pool = pool.filter((q) => targetChapterIds.includes(q.chapter_id));
      } else if (config.classIds?.length > 0) {
        const targetChapterIds: string[] = [];
        academicTree.forEach((cls) => {
          if (config.classIds.includes(cls.id)) {
            cls.children?.forEach((sub) => {
              sub.children?.forEach((chap) => {
                targetChapterIds.push(chap.id);
              });
            });
          }
        });
        pool = pool.filter((q) => targetChapterIds.includes(q.chapter_id));
      }

      if (config.sourceType === "PYQ") {
        if (config.sourceId) {
          pool = pool.filter((q) => q.paper_id === config.sourceId);
        } else {
          pool = pool.filter((q) => q.paper_id && !q.book_set_id);
        }
      } else if (config.sourceType === "BookSet") {
        if (config.sourceId) {
          pool = pool.filter((q) => q.book_set_id === config.sourceId);
        } else {
          pool = pool.filter((q) => q.book_set_id);
        }
      }

      if (config.questionOrder === "random") {
        // Randomize array
        pool = pool.sort(() => 0.5 - Math.random());
      } else if (config.questionOrder === "sequential") {
        // Sort stably by created_at, fallback to ID
        pool = pool.sort(
          (a, b) => {
            const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (diff !== 0) return diff;
            return a.id.localeCompare(b.id);
          }
        );
      } else {
        pool = pool.sort(() => 0.5 - Math.random());
      }

      // Calculate question stats based on global attempts BEFORE slicing
      const qStats: Record<string, { total: number; mistakes: number }> = {};
      attempts.forEach((a) => {
        if (!qStats[a.question_id])
          qStats[a.question_id] = { total: 0, mistakes: 0 };
        qStats[a.question_id].total++;
        if (!a.is_correct) qStats[a.question_id].mistakes++;
      });
      setQuestionStats(qStats);

      if (config.questionOrder === "sequential" || !config.questionOrder) {
         let firstUnansweredIdx = pool.findIndex((q) => !qStats[q.id]);
         if (firstUnansweredIdx === -1) {
            firstUnansweredIdx = pool.findIndex((q) => qStats[q.id]?.mistakes > 0);
            if (firstUnansweredIdx === -1) firstUnansweredIdx = 0;
         }
         
         if (config.questionCount && config.questionCount > 0) {
            pool = pool.slice(firstUnansweredIdx, firstUnansweredIdx + config.questionCount);
         }
         setCurrentIdx(0);
      } else {
         if (config.questionCount && config.questionCount > 0) {
            pool = pool.slice(0, config.questionCount);
         }
         setCurrentIdx(0);
      }

      if (pool.length === 0) {
        alert("No questions found for the selected criteria.");
        navigate("/practice/setup");
        return;
      }

      setFilteredQuestions(pool);

      // Initialize question times
      const initialTimes: Record<string, number> = {};
      pool.forEach((q) => (initialTimes[q.id] = 0));
      setQuestionTimes(initialTimes);

      if (user) {
        supabase
          .from("bookmarks")
          .select("question_id")
          .eq("user_id", user.id)
          .then(({ data }) => {
            if (data) {
              const bms: Record<string, boolean> = {};
              data.forEach((b) => (bms[b.question_id] = true));
              setBookmarked(bms);
            }
          });

        const poolIds = pool.map(q => q.id);
        supabase.rpc("start_test_session", {
          p_paper_id: null,
          p_exam_type: "Practice",
          p_duration_minutes: config.timeLimit || 0,
          p_question_ids: poolIds
        }).then(({ data, error }) => {
          if (!error && data) {
            setSessionId(data);
          }
        });
      }

      if (config.timeLimit > 0) {
        setTimeRemaining(config.timeLimit);
      }
      isInitialized.current = true;
    } catch (e) {
      console.error(e);
      navigate("/dashboard");
    }
  }, [questions, academicTree, navigate, user]);

  const selectedAnswersRef = useRef(selectedAnswers);
  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  // Question specific timer
  useEffect(() => {
    if (showResults || filteredQuestions.length === 0) return;

    const timer = setInterval(() => {
      const currentQId = filteredQuestions[currentIdx]?.id;
      if (currentQId && selectedAnswersRef.current[currentQId] === undefined) {
        setQuestionTimes((prev) => ({
          ...prev,
          [currentQId]: (prev[currentQId] || 0) + 1,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIdx, showResults, filteredQuestions]);

  useEffect(() => {
    if (timeRemaining === null || showResults) return;

    if (timeRemaining <= 0) {
      finishPractice();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, showResults]);

  const handleSelectOption = async (idx: number) => {
    if (showResults) return;
    const currentQ = filteredQuestions[currentIdx];
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: idx,
    }));

    const { data, error } = await supabase.rpc("submit_question_attempt", {
      p_question_id: currentQ.id,
      p_selected_option: idx,
      p_exam_type: "Practice",
      p_time_taken_seconds: questionTimes[currentQ.id] || 0,
      p_attempt_id: questionResults[currentQ.id]?.attempt_id ?? null,
      p_session_id: sessionId,
    });
    if (!error && data) {
      setQuestionResults((prev) => ({ ...prev, [currentQ.id]: data }));
    }
  };

  const handleClearSelection = () => {
    if (showResults) return;
    const currentQ = filteredQuestions[currentIdx];
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  const toggleBookmark = async (id?: string) => {
    if (!user) return;
    const targetId = id || filteredQuestions[currentIdx]?.id;
    if (!targetId) return;
    const isBookmarked = bookmarked[targetId];

    try {
      if (isBookmarked) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("question_id", targetId);
        setBookmarked((prev) => ({ ...prev, [targetId]: false }));
      } else {
        await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, question_id: targetId });
        setBookmarked((prev) => ({ ...prev, [targetId]: true }));
      }
    } catch (e) {
      console.error("Failed to toggle bookmark", e);
    }
  };

  const [questionResults, setQuestionResults] = useState<Record<string, any>>({});

  const finishPractice = async () => {
    setShowResults(true);

    const attemptsToLog = filteredQuestions
      .filter((q) => !questionResults[q.id])
      .map((q) => ({
        question_id: q.id,
        selected_option: selectedAnswers[q.id] ?? null,
        time_taken_seconds: questionTimes[q.id] || 0
      }));

    if (user) {
      try {
        let finalResultsMap = { ...questionResults };
        let correct = 0;
        let incorrect = 0;
        const mistakesToLog: string[] = [];

        if (attemptsToLog.length > 0) {
          const { data, error } = await supabase.rpc("submit_mock_test_attempts", {
            p_attempts: attemptsToLog,
            p_exam_type: "Practice",
            p_session_id: sessionId,
          });

          if (error) {
            console.error("Failed to log practice attempts", error);
          } else {
            (data as any[]).forEach((res) => {
              finalResultsMap[res.question_id] = res;
            });
          }
        }

        filteredQuestions.forEach((q) => {
          const res = finalResultsMap[q.id];
          if (res && selectedAnswers[q.id] !== undefined) {
            if (res.is_correct) {
              correct++;
            } else {
              incorrect++;
              mistakesToLog.push(q.id);
            }
          }
        });

        setQuestionResults(finalResultsMap);
        setCorrectCount(correct);
        setIncorrectCount(incorrect);

        // Log mistakes
        for (const qId of mistakesToLog) {
          try {
            const { data: mistakeData } = await supabase
              .from("mistakes")
              .select("mistake_count")
              .eq("user_id", user.id)
              .eq("question_id", qId)
              .single();
            const count = mistakeData ? (mistakeData.mistake_count || 1) + 1 : 1;
            await supabase.from("mistakes").upsert(
              {
                user_id: user.id,
                question_id: qId,
                mistake_count: count,
              },
              { onConflict: "user_id,question_id" },
            );
          } catch (e) {
            console.error("Failed to log mistake", e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const [resultsFilter, setResultsFilter] = useState<
    "all" | "correct" | "incorrect" | "unattempted"
  >("all");
  const [resultsSubjectFilter, setResultsSubjectFilter] =
    useState<string>("all");
  const [resultsClassFilter, setResultsClassFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const getAcademicPath = (chapterId: string) => {
    for (const cls of academicTree) {
      for (const sub of cls.children || []) {
        for (const chap of sub.children || []) {
          if (chap.id === chapterId) {
            return {
              className: cls.name,
              subjectName: sub.name,
              chapterName: chap.name,
            };
          }
        }
      }
    }
    return {
      className: "Unknown",
      subjectName: "Unknown",
      chapterName: "Unknown",
    };
  };

  const filteredResultQuestions = useMemo(() => {
    return filteredQuestions.filter((q) => {
      // Basic status filter
      if (resultsFilter !== "all") {
        const ans = selectedAnswers[q.id];
        const correctOpt = questionResults[q.id]?.correct_option;
        if (resultsFilter === "unattempted" && ans !== undefined) return false;
        if (resultsFilter === "correct" && ans !== correctOpt)
          return false;
        if (
          resultsFilter === "incorrect" &&
          (ans === undefined || ans === correctOpt)
        )
          return false;
      }

      // Academic path filter
      if (resultsSubjectFilter !== "all" || resultsClassFilter !== "all") {
        const path = getAcademicPath(q.chapter_id);
        if (
          resultsSubjectFilter !== "all" &&
          path.subjectName !== resultsSubjectFilter
        )
          return false;
        if (
          resultsClassFilter !== "all" &&
          path.className !== resultsClassFilter
        )
          return false;
      }

      return true;
    });
  }, [
    filteredQuestions,
    selectedAnswers,
    resultsFilter,
    resultsSubjectFilter,
    resultsClassFilter,
    academicTree,
  ]);

  // Derived unique subjects and classes for the dropdowns
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    filteredQuestions.forEach((q) => {
      const path = getAcademicPath(q.chapter_id);
      if (path.className !== "Unknown") set.add(path.className);
    });
    return Array.from(set);
  }, [filteredQuestions, academicTree]);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    filteredQuestions.forEach((q) => {
      const path = getAcademicPath(q.chapter_id);
      if (
        resultsClassFilter === "all" ||
        path.className === resultsClassFilter
      ) {
        if (path.subjectName !== "Unknown") set.add(path.subjectName);
      }
    });
    return Array.from(set);
  }, [filteredQuestions, resultsClassFilter, academicTree]);

  if (filteredQuestions.length === 0)
    return <div className="p-8">Loading...</div>;

  const currentQ = filteredQuestions[currentIdx];

  return (
    <div className="flex flex-col min-h-screen bg-geist-bg-light dark:bg-geist-bg-dark font-sans text-geist-text-primary-light dark:text-geist-text-primary-dark">
      {/* Header */}
      <div className="bg-geist-surface-light/80 dark:bg-geist-surface-dark/80 backdrop-blur-md border-b border-geist-border-light dark:border-geist-border-dark px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/practice/setup")}
            className="text-geist-text-secondary-light hover:text-geist-text-primary-light dark:text-geist-text-secondary-dark dark:hover:text-geist-text-primary-dark transition-colors font-medium text-sm"
          >
            Exit
          </button>
          <div className="h-4 w-px bg-geist-border-light dark:bg-geist-border-dark" />
          <span className="font-semibold text-sm truncate max-w-[150px] sm:max-w-xs">
            {sessionName}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {timeRemaining !== null && !showResults && (
            <div
              className={`flex items-center gap-1.5 font-mono text-xs font-medium px-2 py-1 rounded bg-geist-bg-light dark:bg-geist-bg-dark border ${timeRemaining < 60 ? "text-geist-error-dark border-geist-error-dark/50" : "text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark"}`}
            >
              <Clock className="w-3.5 h-3.5" />
              {formatTime(timeRemaining)}
            </div>
          )}

          <button
            onClick={() => setShowTopBar(!showTopBar)}
            className="lg:hidden p-1.5 text-geist-text-secondary-light hover:text-geist-text-primary-light dark:text-geist-text-secondary-dark dark:hover:text-geist-text-primary-dark transition-colors"
            title="Toggle Top Bar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowGridMobile(!showGridMobile)}
            className="lg:hidden p-1.5 text-geist-text-secondary-light hover:text-geist-text-primary-light dark:text-geist-text-secondary-dark dark:hover:text-geist-text-primary-dark transition-colors"
          >
            {showGridMobile ? (
              <X className="w-5 h-5" />
            ) : (
              <LayoutGrid className="w-5 h-5" />
            )}
          </button>

          {!showResults && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="hidden sm:block bg-geist-error-light/10 text-geist-error-light hover:bg-geist-error-light/20 dark:bg-geist-error-dark/10 dark:text-geist-error-dark px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-geist-error-light/20 dark:border-geist-error-dark/20 min-h-[36px]"
            >
              End Early
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Strip for Mobile */}
      <AnimatePresence>
        {showTopBar && !showGridMobile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-b border-geist-border-light dark:border-geist-border-dark bg-geist-surface-light dark:bg-geist-surface-dark overflow-hidden sticky top-[53px] z-10"
          >
            <div className="flex overflow-x-auto p-2 gap-2 hide-scrollbar">
              {filteredQuestions.map((q, idx) => {
                const answered = selectedAnswers[q.id] !== undefined;
                const active = currentIdx === idx;

                let bg =
                  "bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark";
                if (active)
                  bg =
                    "bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark border-transparent";
                else if (answered)
                  bg =
                    "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-300";

                if (showResults) {
                  const ans = selectedAnswers[q.id];
                  const correctOpt = questionResults[q.id]?.correct_option;
                  if (ans === undefined)
                    bg =
                      "bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark opacity-50";
                  else if (ans === correctOpt)
                    bg =
                      "bg-geist-success/10 border-geist-success text-geist-success";
                  else
                    bg =
                      "bg-geist-error-light/10 border-geist-error-light text-geist-error-light dark:bg-geist-error-dark/10 dark:border-geist-error-dark dark:text-geist-error-dark";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-[11px] font-medium rounded-md border transition-all ${bg}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Slider Grid for Mobile */}
      <AnimatePresence>
        {showGridMobile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-b border-geist-border-light dark:border-geist-border-dark bg-geist-surface-light dark:bg-geist-surface-dark overflow-hidden sticky top-[53px] z-10"
          >
            <div className="p-4">
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 max-h-[40vh] overflow-y-auto">
                {filteredQuestions.map((q, idx) => {
                  const answered = selectedAnswers[q.id] !== undefined;
                  const active = currentIdx === idx;

                  let bg =
                    "bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark";
                  if (active)
                    bg =
                      "bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark border-transparent scale-105";
                  else if (answered)
                    bg =
                      "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-300";

                  if (showResults) {
                    const ans = selectedAnswers[q.id];
                    const correctOpt = questionResults[q.id]?.correct_option;
                    if (ans === undefined)
                      bg =
                        "bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark opacity-50";
                    else if (ans === correctOpt)
                      bg =
                        "bg-geist-success/10 border-geist-success text-geist-success";
                    else
                      bg =
                        "bg-geist-error-light/10 border-geist-error-light text-geist-error-light dark:bg-geist-error-dark/10 dark:border-geist-error-dark dark:text-geist-error-dark";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIdx(idx);
                        setShowGridMobile(false);
                      }}
                      className={`h-8 w-full flex flex-col items-center justify-center text-[11px] font-medium rounded border transition-all ${bg}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full px-4 md:px-6 py-4 flex flex-col lg:flex-row gap-6 lg:items-start max-w-[1920px] mx-auto min-h-[calc(100vh-65px)] relative">
        {/* Main Content Area */}
        <div className="flex-1 w-full order-2 lg:order-1 min-w-0 flex flex-col min-h-[calc(100vh-100px)]">
          {showResults ? (
            <div className="w-full max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl overflow-hidden mb-6"
              >
                <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark flex items-center justify-between">
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-geist-text-primary-light dark:text-geist-text-primary-dark">
                    Session Results
                  </h2>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    Done
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-geist-border-light dark:divide-geist-border-dark border-b border-geist-border-light dark:border-geist-border-dark">
                  <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                    <div className="text-2xl font-bold text-geist-success tracking-tight">
                      {correctCount}
                    </div>
                    <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                      Correct
                    </div>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                    <div className="text-2xl font-bold text-geist-error-light tracking-tight">
                      {incorrectCount}
                    </div>
                    <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                      Incorrect
                    </div>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                    <div className="text-2xl font-bold text-geist-text-primary-light dark:text-geist-text-primary-dark tracking-tight">
                      {filteredQuestions.length -
                        (correctCount + incorrectCount)}
                    </div>
                    <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                      Skipped
                    </div>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                    <div className="text-2xl font-bold text-blue-500 tracking-tight flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(
                        Object.values(questionTimes).reduce(
                          (a, b) => a + b,
                          0,
                        ) / (Object.keys(questionTimes).length || 1),
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                      Avg Time
                    </div>
                  </div>
                </div>

                {Object.keys(questionTimes).filter(
                  (qId) => questionTimes[qId] > 60,
                ).length > 0 && (
                  <div className="p-4 bg-geist-bg-light dark:bg-geist-bg-dark border-t border-geist-border-light dark:border-geist-border-dark">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light mb-3">
                      Slowest Questions (&gt; 1m)
                    </h3>
                    <div className="grid gap-2">
                      {filteredQuestions
                        .filter((q) => questionTimes[q.id] > 60)
                        .map((q, i) => (
                          <div
                            key={q.id}
                            className="text-xs flex items-center justify-between p-2 rounded-md bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-mono text-geist-text-secondary-light">
                                #{i + 1}
                              </span>
                              <span className="truncate text-geist-text-primary-light dark:text-geist-text-primary-dark">
                                {q.text?.substring(0, 40)}...
                              </span>
                            </div>
                            <span className="text-geist-error-light font-mono font-medium bg-geist-error-light/10 px-1.5 py-0.5 rounded">
                              {formatTime(questionTimes[q.id])}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-6 bg-geist-surface-light dark:bg-geist-surface-dark p-3 rounded-lg border border-geist-border-light dark:border-geist-border-dark">
                <CustomDropdown
                  value={resultsFilter}
                  onChange={(val) => {
                    setResultsFilter(val as any);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "correct", label: "Correct Only" },
                    { value: "incorrect", label: "Incorrect Only" },
                    { value: "unattempted", label: "Unattempted Only" },
                  ]}
                  placeholder="All Status"
                  className="w-40"
                />

                {availableClasses.length > 0 && (
                  <CustomDropdown
                    value={resultsClassFilter}
                    onChange={(val) => {
                      setResultsClassFilter(val);
                      setResultsSubjectFilter("all");
                      setCurrentPage(1);
                    }}
                    options={availableClasses}
                    placeholder="All Classes"
                    className="w-40"
                  />
                )}

                {availableSubjects.length > 0 && (
                  <CustomDropdown
                    value={resultsSubjectFilter}
                    onChange={(val) => {
                      setResultsSubjectFilter(val);
                      setCurrentPage(1);
                    }}
                    options={availableSubjects}
                    placeholder="All Subjects"
                    className="w-40"
                  />
                )}
              </div>

              {/* List */}
              <div className="space-y-4">
                {filteredResultQuestions
                  .slice((currentPage - 1) * 20, currentPage * 20)
                  .map((q, i) => {
                    const ans = selectedAnswers[q.id];
                    const correctOpt = questionResults[q.id]?.correct_option;
                    const isCorrect = ans === correctOpt;
                    const isUnattempted = ans === undefined;
                    const originalIndex = filteredQuestions.findIndex(
                      (fq) => fq.id === q.id,
                    );

                    return (
                      <div
                        key={q.id}
                        className="bg-geist-surface-light dark:bg-geist-surface-dark p-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-geist-border-light dark:border-geist-border-dark -mx-4 sm:mx-0"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              Q{originalIndex + 1}
                            </span>
                            {isCorrect ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-geist-success/10 text-geist-success uppercase">
                                Correct
                              </span>
                            ) : isUnattempted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light uppercase border border-geist-border-light dark:border-geist-border-dark">
                                Unattempted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-geist-error-light/10 text-geist-error-light uppercase">
                                Incorrect
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/20 uppercase">
                              {formatTime(questionTimes[q.id] || 0)}
                            </span>

                            {(() => {
                              const stats = questionStats[q.id];
                              if (stats && stats.total > 0) {
                                const correctCount =
                                  stats.total - stats.mistakes;
                                return (
                                  <div className="hidden sm:flex items-center gap-2 ml-2 px-2 py-0.5 bg-geist-bg-light dark:bg-geist-bg-dark rounded text-[10px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark border border-geist-border-light dark:border-geist-border-dark">
                                    <span>{stats.total} Attempts</span>
                                    <span className="w-1 h-1 rounded-full bg-geist-border-dark dark:bg-geist-border-light opacity-30" />
                                    <span
                                      className={
                                        stats.mistakes > 0
                                          ? "text-orange-500"
                                          : "text-geist-success"
                                      }
                                    >
                                      {correctCount}C / {stats.mistakes}M
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <AddToCustomListDropdown questionId={q.id} />
                            <button
                              onClick={() => toggleBookmark(q.id)}
                              className={`p-1.5 rounded-full transition-colors ${bookmarked[q.id] ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : "text-geist-text-secondary-light hover:bg-geist-surface-light dark:text-geist-text-secondary-dark dark:hover:bg-geist-surface-dark"}`}
                              title="Bookmark"
                            >
                              <Bookmark
                                className="w-4 h-4"
                                fill={
                                  bookmarked[q.id] ? "currentColor" : "none"
                                }
                              />
                            </button>
                          </div>
                        </div>
                        <MarkdownRenderer
                          content={q.text || ""}
                          className="text-sm mb-4"
                        />
                        {q.question_images && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {(() => {
                              let imgs = [];
                              try {
                                imgs =
                                  typeof q.question_images === "string"
                                    ? JSON.parse(q.question_images)
                                    : q.question_images;
                              } catch {
                                imgs = [q.question_images];
                              }
                              return (Array.isArray(imgs) ? imgs : []).map(
                                (img: string, idx: number) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt="Question figure"
                                    className="max-w-full max-h-48 object-contain rounded border border-geist-border-light dark:border-geist-border-dark"
                                  />
                                ),
                              );
                            })()}
                          </div>
                        )}
                        <div className="space-y-2">
                          {(() => {
                            let opts = [];
                            if (Array.isArray(q.options)) opts = q.options;
                            else if (typeof q.options === "string") {
                              try {
                                opts = JSON.parse(q.options);
                              } catch {
                                opts = [];
                              }
                            }
                            if (
                              !opts ||
                              opts.length === 0 ||
                              (opts.length === 1 && !opts[0])
                            ) {
                              opts = [
                                q.option_1 || "",
                                q.option_2 || "",
                                q.option_3 || "",
                                q.option_4 || "",
                              ];
                            }
                            return opts;
                          })().map((opt: string, idx: number) => {
                            const optionImageField =
                              `option_${idx + 1}_image` as keyof typeof q;
                            const optionImage = q[optionImageField] as
                              | string
                              | undefined;

                            let styles =
                              "bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light opacity-60";
                            let Icon = null;
                            const correctOpt = questionResults[q.id]?.correct_option;
                            if (correctOpt === idx) {
                              styles =
                                "bg-geist-success/10 border-geist-success text-geist-success font-medium opacity-100";
                              Icon = (
                                <CheckCircle className="w-4 h-4 text-geist-success shrink-0 mt-0.5" />
                              );
                            } else if (ans === idx) {
                              styles =
                                "bg-geist-error-light/10 border-geist-error-light text-geist-error-light font-medium opacity-100";
                              Icon = (
                                <XCircle className="w-4 h-4 text-geist-error-light shrink-0 mt-0.5" />
                              );
                            }

                            const prefix = String.fromCharCode(65 + idx);
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border border-transparent flex gap-3 text-sm ${styles}`}
                              >
                                {Icon || (
                                  <Circle className="w-4 h-4 shrink-0 mt-0.5 opacity-30" />
                                )}
                                <div className="flex-1 min-w-0 flex flex-col gap-2">
                                  {opt && (
                                    <MarkdownRenderer
                                      content={opt}
                                      className="text-sm"
                                    />
                                  )}
                                  {optionImage && (
                                    <img
                                      src={optionImage}
                                      alt={`Option ${prefix}`}
                                      className="max-w-full max-h-32 object-contain rounded border border-geist-border-light dark:border-geist-border-dark"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {(questionResults[q.id]?.explanation ||
                          (questionResults[q.id]?.explanation_images &&
                            questionResults[q.id]?.explanation_images.length > 0)) && (
                          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                            <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                              Explanation
                            </h4>
                            {questionResults[q.id]?.explanation && (
                              <MarkdownRenderer
                                content={questionResults[q.id].explanation}
                                className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed"
                              />
                            )}
                            {questionResults[q.id]?.explanation_images && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {(() => {
                                  let imgs = [];
                                  try {
                                    imgs =
                                      typeof questionResults[q.id].explanation_images === "string"
                                        ? JSON.parse(questionResults[q.id].explanation_images)
                                        : questionResults[q.id].explanation_images;
                                  } catch {
                                    imgs = [questionResults[q.id].explanation_images];
                                  }
                                  return (Array.isArray(imgs) ? imgs : []).map(
                                    (img: string, i: number) => (
                                      <img
                                        key={i}
                                        src={img}
                                        alt="Explanation figure"
                                        className="max-w-full max-h-64 object-contain rounded border border-blue-200 dark:border-blue-900/50"
                                      />
                                    ),
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Pagination Controls */}
              {filteredResultQuestions.length > 20 && (
                <div className="mt-8 flex items-center justify-between border-t border-geist-border-light dark:border-geist-border-dark pt-4">
                  <span className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                    Showing {(currentPage - 1) * 20 + 1} to{" "}
                    {Math.min(currentPage * 20, filteredResultQuestions.length)}{" "}
                    of {filteredResultQuestions.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-md border border-geist-border-light dark:border-geist-border-dark text-sm font-medium disabled:opacity-50 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage((p) =>
                          Math.min(
                            Math.ceil(filteredResultQuestions.length / 20),
                            p + 1,
                          ),
                        );
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={
                        currentPage ===
                        Math.ceil(filteredResultQuestions.length / 20)
                      }
                      className="px-3 py-1.5 rounded-md border border-geist-border-light dark:border-geist-border-dark text-sm font-medium disabled:opacity-50 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative mb-8">
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-geist-border-light dark:border-geist-border-dark">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-lg text-geist-text-primary-light dark:text-geist-text-primary-dark">
                      Question {currentIdx + 1}
                    </span>
                    <span className="px-2 py-0.5 bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-xs font-medium rounded border border-geist-border-light dark:border-geist-border-dark">
                      {currentQ.type}
                    </span>
                    <span className="px-2 py-0.5 bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-xs font-medium rounded border border-geist-border-light dark:border-geist-border-dark hidden sm:inline-block">
                      {currentQ.difficulty}
                    </span>
                    {questionStats[currentQ.id] &&
                      questionStats[currentQ.id].total > 0 && (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-semibold rounded border border-blue-200 dark:border-blue-900/50 uppercase">
                          Practiced {questionStats[currentQ.id].total}x{" "}
                          {questionStats[currentQ.id].mistakes > 0
                            ? `| ${questionStats[currentQ.id].mistakes} Mistakes`
                            : ""}
                        </span>
                      )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-2">
                      <AddToCustomListDropdown questionId={currentQ.id} />
                      <button
                        onClick={() => toggleBookmark(currentQ.id)}
                        className={`p-1.5 rounded-full transition-colors ${bookmarked[currentQ.id] ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : "text-geist-text-secondary-light hover:bg-geist-surface-light dark:text-geist-text-secondary-dark dark:hover:bg-geist-surface-dark"}`}
                        title="Bookmark"
                      >
                        <Bookmark
                          className="w-4 h-4"
                          fill={bookmarked[currentQ.id] ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-mono text-xs sm:text-sm bg-geist-surface-light dark:bg-geist-surface-dark px-2.5 py-1 rounded border border-geist-border-light dark:border-geist-border-dark">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {formatTime(questionTimes[currentQ.id] || 0)}
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MarkdownRenderer
                      content={currentQ.text || ""}
                      className="text-base sm:text-lg mb-8 leading-relaxed"
                    />
                    {currentQ.question_images && (
                      <div className="mb-8 flex flex-wrap gap-2">
                        {(() => {
                          let imgs = [];
                          try {
                            imgs =
                              typeof currentQ.question_images === "string"
                                ? JSON.parse(currentQ.question_images)
                                : currentQ.question_images;
                          } catch {
                            imgs = [currentQ.question_images];
                          }
                          return (Array.isArray(imgs) ? imgs : []).map(
                            (img: string, i: number) => (
                              <img
                                key={i}
                                src={img}
                                alt="Question figure"
                                className="max-w-full max-h-64 object-contain rounded border border-geist-border-light dark:border-geist-border-dark"
                              />
                            ),
                          );
                        })()}
                      </div>
                    )}

                    <div className="space-y-3">
                      {(() => {
                        let opts = [];
                        if (Array.isArray(currentQ.options))
                          opts = currentQ.options;
                        else if (typeof currentQ.options === "string") {
                          try {
                            opts = JSON.parse(currentQ.options);
                          } catch {
                            opts = [];
                          }
                        }
                        if (
                          !opts ||
                          opts.length === 0 ||
                          (opts.length === 1 && !opts[0])
                        ) {
                          opts = [
                            currentQ.option_1 || "",
                            currentQ.option_2 || "",
                            currentQ.option_3 || "",
                            currentQ.option_4 || "",
                          ];
                        }
                        return opts;
                      })().map((opt: string, idx: number) => {
                        const optionImageField =
                          `option_${idx + 1}_image` as keyof typeof currentQ;
                        const optionImage = currentQ[optionImageField] as
                          | string
                          | undefined;

                        const isSelected = selectedAnswers[currentQ.id] === idx;
                        const hasAnswered = selectedAnswers[currentQ.id] !== undefined;

                        let styles =
                          "bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-primary-light dark:text-geist-text-primary-dark border-geist-border-light dark:border-geist-border-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark focus:border-geist-text-primary-light";
                        let Icon = null;

                        if (hasAnswered && questionResults[currentQ.id]) {
                          if (questionResults[currentQ.id].correct_option === idx) {
                            styles = "bg-geist-success/10 border-geist-success text-geist-success font-medium opacity-100";
                            Icon = <CheckCircle className="w-4 h-4 text-geist-success shrink-0 mt-0.5" />;
                          } else if (isSelected) {
                            styles = "bg-geist-error-light/10 border-geist-error-light text-geist-error-light font-medium opacity-100";
                            Icon = <XCircle className="w-4 h-4 text-geist-error-light shrink-0 mt-0.5" />;
                          } else {
                            styles = "bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light opacity-60";
                          }
                        } else if (isSelected) {
                          styles =
                            "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300";
                        }

                        const prefix = String.fromCharCode(65 + idx);

                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectOption(idx)}
                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 text-base min-h-[56px] ${styles}`}
                          >
                            <span className="font-mono font-medium opacity-50 mt-0.5">
                              {prefix}.
                            </span>
                            <div className="flex-1 min-w-0 break-words flex flex-col gap-3">
                              {opt && (
                                <MarkdownRenderer
                                  content={opt}
                                  className="text-base"
                                />
                              )}
                              {optionImage && (
                                <img
                                  src={optionImage}
                                  alt={`Option ${prefix}`}
                                  className="max-w-full max-h-48 object-contain rounded border border-geist-border-light dark:border-geist-border-dark"
                                />
                              )}
                            </div>
                            {Icon && (
                              <div className="mt-0.5 shrink-0">{Icon}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {selectedAnswers[currentQ.id] !== undefined && questionResults[currentQ.id] && (questionResults[currentQ.id].explanation || (questionResults[currentQ.id].explanation_images && questionResults[currentQ.id].explanation_images.length > 0)) && (
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                        <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                          Explanation
                        </h4>
                        {questionResults[currentQ.id].explanation && (
                          <MarkdownRenderer
                            content={questionResults[currentQ.id].explanation}
                            className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed"
                          />
                        )}
                        {questionResults[currentQ.id].explanation_images && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(() => {
                              let imgs = [];
                              try {
                                imgs =
                                  typeof questionResults[currentQ.id].explanation_images === "string"
                                    ? JSON.parse(questionResults[currentQ.id].explanation_images)
                                    : questionResults[currentQ.id].explanation_images;
                              } catch {
                                imgs = [questionResults[currentQ.id].explanation_images];
                              }
                              return (Array.isArray(imgs) ? imgs : []).map(
                                (img: string, i: number) => (
                                  <img
                                    key={i}
                                    src={img}
                                    alt="Explanation figure"
                                    className="max-w-full max-h-64 object-contain rounded border border-blue-200 dark:border-blue-900/50"
                                  />
                                ),
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}

          {/* Desktop Navigation */}
          {!showResults && (
            <div className="hidden lg:flex mt-auto pt-4 pb-4 sticky bottom-0 bg-geist-bg-light/90 dark:bg-geist-bg-dark/90 backdrop-blur-md z-10 border-t border-geist-border-light dark:border-geist-border-dark justify-between items-center w-full">
              <button
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-5 py-2.5 border border-geist-border-light dark:border-geist-border-dark rounded-lg text-sm font-medium hover:bg-geist-border-light dark:hover:bg-geist-border-dark disabled:opacity-50 disabled:pointer-events-none text-geist-text-primary-light dark:text-geist-text-primary-dark transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleClearSelection}
                  disabled={selectedAnswers[currentQ.id] === undefined}
                  className="flex items-center gap-2 px-5 py-2.5 border border-geist-border-light dark:border-geist-border-dark rounded-lg text-sm font-medium hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark disabled:opacity-50 text-geist-text-secondary-light dark:text-geist-text-secondary-dark transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Clear
                </button>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-5 py-2.5 bg-geist-error-light/10 dark:bg-geist-error-dark/10 text-geist-error-light dark:text-geist-error-dark border border-geist-error-light/20 dark:border-geist-error-dark/20 rounded-lg text-sm font-medium hover:bg-geist-error-light/20 dark:hover:bg-geist-error-dark/20 transition-colors"
                >
                  End Early
                </button>

                {currentIdx < filteredQuestions.length - 1 ? (
                  <button
                    onClick={() =>
                      setCurrentIdx((p) =>
                        Math.min(filteredQuestions.length - 1, p + 1),
                      )
                    }
                    className="flex items-center gap-2 px-5 py-2.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-geist-success text-white rounded-lg text-sm font-medium hover:bg-geist-success/90 transition-colors"
                  >
                    Submit
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Question Map (Desktop) */}

        {!showResults && (
          <div className="hidden lg:flex flex-col w-full lg:w-72 order-1 lg:order-2 sticky top-[80px] max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar pb-8">
            <div className="flex flex-col">
              <h3 className="text-xs font-semibold text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider mb-4 shrink-0">
                Question Map
              </h3>
              <div className="grid grid-cols-6 gap-1 content-start">
                {filteredQuestions.map((q, idx) => {
                  const answered = selectedAnswers[q.id] !== undefined;
                  const active = currentIdx === idx;

                  let baseStyle =
                    "h-7 flex items-center justify-center text-[10px] font-medium rounded border transition-all cursor-pointer";

                  if (active) {
                    baseStyle +=
                      " border-transparent bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark shadow-md scale-105 transform";
                  } else if (answered) {
                    baseStyle +=
                      " border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400";
                  } else {
                    baseStyle +=
                      " border-geist-border-light dark:border-geist-border-dark bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:border-geist-text-secondary-light";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={baseStyle}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-geist-border-light dark:border-geist-border-dark text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-50 border border-blue-500"></div>{" "}
                  Answered
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark"></div>{" "}
                  Unanswered
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Fixed Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-geist-surface-light dark:bg-geist-surface-dark border-t border-geist-border-light dark:border-geist-border-dark px-4 py-3 flex items-center justify-between z-20 pb-safe">
        <button
          onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
          disabled={currentIdx === 0}
          className="flex items-center justify-center w-12 h-10 border border-geist-border-light dark:border-geist-border-dark rounded-lg text-geist-text-primary-light dark:text-geist-text-primary-dark disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {!showResults && (
          <div className="flex-1 mx-3 flex gap-2">
            <button
              onClick={handleClearSelection}
              disabled={selectedAnswers[currentQ.id] === undefined}
              className="flex-1 h-10 border rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-bg-light dark:hover:bg-geist-bg-dark disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Clear</span>
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 h-10 bg-geist-error-light/10 text-geist-error-light dark:bg-geist-error-dark/10 dark:text-geist-error-dark border border-geist-error-light/20 dark:border-geist-error-dark/20 rounded-lg text-sm font-medium flex items-center justify-center transition-colors hover:bg-geist-error-light/20 dark:hover:bg-geist-error-dark/20"
            >
              End Early
            </button>
          </div>
        )}

        {currentIdx < filteredQuestions.length - 1 ? (
          <button
            onClick={() =>
              setCurrentIdx((p) =>
                Math.min(filteredQuestions.length - 1, p + 1),
              )
            }
            className="flex items-center justify-center gap-1.5 px-4 h-10 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-lg text-sm font-medium"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={showResults}
            className="flex items-center justify-center gap-1.5 px-4 h-10 bg-geist-success text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark p-6 rounded-xl shadow-lg max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2 text-geist-text-primary-light dark:text-geist-text-primary-dark">
                Submit Session
              </h3>
              <p className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-6">
                Are you sure you want to end this practice session?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    finishPractice();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-geist-success text-white hover:bg-geist-success/90 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
