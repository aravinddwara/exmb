import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/useAuthStore";
import { useUserStore } from "../../store/useUserStore";
import {
  Clock,
  Target,
  CalendarDays,
  Activity,
  ChevronLeft,
  CheckCircle,
  Bookmark,
  Circle,
} from "lucide-react";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";
import { CustomDropdown } from "../../components/CustomDropdown";
import { AddToCustomListDropdown } from "../../components/AddToCustomListDropdown";

export const HistoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const { questions, papers, academicTree } = useUserStore();
  const [history, setHistory] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const [resultsFilter, setResultsFilter] = useState<
    "all" | "correct" | "incorrect" | "unattempted"
  >("all");
  const [resultsSubjectFilter, setResultsSubjectFilter] =
    useState<string>("all");
  const [resultsClassFilter, setResultsClassFilter] = useState<string>("all");
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const [questionDetails, setQuestionDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedSession) {
      const qIds = selectedSession.attempts.map((a: any) => a.question_id);
      if (qIds.length > 0) {
        Promise.all(
          qIds.map((id: string) => 
            supabase.rpc('get_question_review', { p_question_id: id })
              .then(res => ({ id, ...res.data }))
          )
        ).then((data) => {
          if (data) {
            const detailsMap: Record<string, any> = {};
            data.forEach(d => {
              if (d.correct_option !== undefined) {
                detailsMap[d.id] = d;
              }
            });
            setQuestionDetails(detailsMap);
          }
        });
      }
    }
  }, [selectedSession]);

  useEffect(() => {
    if (user && questions.length > 0) {
      supabase
        .from("question_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3000)
        .then(({ data }) => {
          if (data) {
            const grouped: Record<string, any> = {};
            data.forEach((attempt) => {
              const dateObj = new Date(attempt.created_at);
              const exactKey = attempt.created_at; // use raw created_at string as unique session ID since bulk inserted

              if (!grouped[exactKey]) {
                grouped[exactKey] = {
                  key: exactKey,
                  dateObj,
                  date: dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  timeString: dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  monthYear: dateObj.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  }),
                  timestamp: dateObj.getTime(),
                  type: attempt.exam_type,
                  total: 0,
                  correct: 0,
                  time: 0,
                  score: 0,
                  maxScore: 0,
                  attempts: [],
                  title:
                    attempt.exam_type === "MockTest"
                      ? "Mock Test"
                      : "Practice Session",
                };
              }

              const q = questions.find((q) => q.id === attempt.question_id);
              if (q) {
                grouped[exactKey].maxScore += q.positive_marks || 0;
                if (attempt.is_correct) {
                  grouped[exactKey].score += q.positive_marks || 0;
                } else if (attempt.exam_type === "MockTest") {
                  grouped[exactKey].score -= q.negative_marks || 0;
                }

                if (
                  attempt.exam_type === "MockTest" &&
                  grouped[exactKey].title === "Mock Test"
                ) {
                  const paper = papers.find((p) => p.id === q.paper_id);
                  if (paper) grouped[exactKey].title = paper.name;
                } else if (
                  attempt.exam_type === "Practice" &&
                  grouped[exactKey].title === "Practice Session"
                ) {
                  // find chapter
                  let chapName = "Unknown Chapter";
                  for (const cls of academicTree) {
                    for (const sub of cls.children || []) {
                      for (const chap of sub.children || []) {
                        if (chap.id === q.chapter_id) {
                          chapName = chap.name;
                        }
                      }
                    }
                  }
                  grouped[exactKey].title = chapName;
                }
              }

              grouped[exactKey].total++;
              if (attempt.is_correct) grouped[exactKey].correct++;
              grouped[exactKey].time += attempt.time_taken_seconds || 0;
              grouped[exactKey].attempts.push({ ...attempt, question: q });
            });

            const sortedHistory = Object.values(grouped).sort(
              (a, b) => b.timestamp - a.timestamp,
            );
            setHistory(sortedHistory);
          }
        });
    }
  }, [user, questions, papers, academicTree]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (selectedSession) {
    const accuracy = Math.round(
      (selectedSession.correct / selectedSession.total) * 100,
    );

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

    const firstAttempt = selectedSession.attempts[0];
    let sessionQuestions = [];
    if (
      selectedSession.type === "Mock Test" &&
      firstAttempt?.question?.paper_id
    ) {
      sessionQuestions = questions.filter(
        (q) => q.paper_id === firstAttempt.question.paper_id,
      );
    } else if (firstAttempt?.question?.chapter_id) {
      sessionQuestions = questions.filter(
        (q) => q.chapter_id === firstAttempt.question.chapter_id,
      );
    }

    if (sessionQuestions.length === 0) {
      sessionQuestions = selectedSession.attempts
        .map((a: any) => a.question)
        .filter(Boolean);
    }

    const attemptMap = selectedSession.attempts.reduce((acc: any, att: any) => {
      if (att.question) acc[att.question.id] = att;
      return acc;
    }, {});

    const availableClasses = Array.from(
      new Set(
        sessionQuestions
          .map((q) => getAcademicPath(q.chapter_id).className)
          .filter((c) => c !== "Unknown"),
      ),
    ) as string[];

    const availableSubjects = Array.from(
      new Set(
        sessionQuestions
          .map((q) => {
            const path = getAcademicPath(q.chapter_id);
            if (
              resultsClassFilter !== "all" &&
              path.className !== resultsClassFilter
            )
              return "Unknown";
            return path.subjectName;
          })
          .filter((s) => s !== "Unknown"),
      ),
    ) as string[];

    const filteredQuestions = sessionQuestions.filter((q) => {
      const att = attemptMap[q.id];
      const isAttempted = !!att;
      const isCorrect = att ? att.is_correct : false;

      if (resultsFilter === "correct" && !isCorrect) return false;
      if (resultsFilter === "incorrect" && (isCorrect || !isAttempted))
        return false;
      if (resultsFilter === "unattempted" && isAttempted) return false;

      const path = getAcademicPath(q.chapter_id);
      if (
        resultsSubjectFilter !== "all" &&
        path.subjectName !== resultsSubjectFilter
      )
        return false;
      if (resultsClassFilter !== "all" && path.className !== resultsClassFilter)
        return false;
      return true;
    });

    const toggleBookmark = (id: string) => {
      setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
      <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
            <button
              onClick={() => window.history.back()}
              className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors"
            >
              Dashboard
            </button>
            <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
              /
            </span>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors"
            >
              History
            </button>
            <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
              /
            </span>
            <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
              Session Result
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
            Session Details
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          <button
            onClick={() => setSelectedSession(null)}
            className="flex items-center gap-1 text-sm font-medium text-geist-text-secondary-light hover:text-geist-text-primary-light dark:text-geist-text-secondary-dark dark:hover:text-geist-text-primary-dark transition-colors mb-6 self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to History
          </button>

          <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl overflow-hidden mb-8">
            <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-geist-text-primary-light dark:text-geist-text-primary-dark">
                Session Details
              </h2>
            </div>
            <div className="p-6 text-center border-b border-geist-border-light dark:border-geist-border-dark flex flex-col items-center">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${selectedSession.type === "MockTest" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}
              >
                {selectedSession.type === "MockTest" ? "Mock Test" : "Practice"}
              </span>
              <h3 className="text-xl font-bold mb-1">
                {selectedSession.title}
              </h3>
              <p className="text-xs text-geist-text-secondary-light">
                {selectedSession.date} at {selectedSession.timeString}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-geist-border-light dark:divide-geist-border-dark">
              <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                <div className="text-2xl font-bold text-blue-600 tracking-tight">
                  {Math.round(selectedSession.score)}
                </div>
                <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                  Marks
                </div>
              </div>
              <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                <div className="text-xl font-bold tracking-tight text-geist-text-primary-light dark:text-geist-text-primary-dark">
                  {accuracy}%
                </div>
                <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                  Accuracy
                </div>
              </div>
              <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                <div className="text-xl font-bold text-geist-success tracking-tight">
                  {selectedSession.correct}
                </div>
                <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                  Correct
                </div>
              </div>
              <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                <div className="text-xl font-bold text-geist-error-light tracking-tight">
                  {selectedSession.total - selectedSession.correct}
                </div>
                <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                  Incorrect
                </div>
              </div>
              <div className="p-4 flex flex-col items-center justify-center bg-geist-bg-light dark:bg-geist-bg-dark">
                <div className="text-xl font-bold tracking-tight text-geist-text-primary-light flex items-center gap-1">
                  {formatTime(selectedSession.time)}
                </div>
                <div className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider mt-1">
                  Time taken
                </div>
              </div>
            </div>
          </div>

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
            {filteredQuestions
              .slice((currentPage - 1) * 20, currentPage * 20)
              .map((q: any, i: number) => {
                const att = attemptMap[q.id];
                const isAttempted = !!att;
                const isCorrect = isAttempted ? att.is_correct : false;
                const originalIndex = sessionQuestions.findIndex(
                  (sq: any) => sq.id === q.id,
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
                        ) : !isAttempted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light uppercase border border-geist-border-light dark:border-geist-border-dark">
                            Unattempted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-geist-error-light/10 text-geist-error-light uppercase">
                            Incorrect
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/20 uppercase">
                          {formatTime(att?.time_taken_seconds || 0)}
                        </span>

                        {(() => {
                          const allAttempts = history
                            .flatMap((h) => h.attempts)
                            .filter((a) => a.question_id === q.id);
                          const total = allAttempts.length;
                          const correct = allAttempts.filter(
                            (a) => a.is_correct,
                          ).length;
                          const mistakes = total - correct;
                          const totalTime = allAttempts.reduce(
                            (sum, a) => sum + (a.time_taken_seconds || 0),
                            0,
                          );
                          const avgTime =
                            total > 0 ? Math.round(totalTime / total) : 0;

                          if (total > 0) {
                            return (
                              <div className="hidden sm:flex items-center gap-2 ml-2 px-2 py-0.5 bg-geist-surface-light dark:bg-geist-surface-dark rounded text-[10px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark border border-geist-border-light dark:border-geist-border-dark">
                                <span>{total} Attempts</span>
                                <span className="w-1 h-1 rounded-full bg-geist-border-dark dark:bg-geist-border-light opacity-30" />
                                <span
                                  className={
                                    mistakes > 0
                                      ? "text-orange-500"
                                      : "text-geist-success"
                                  }
                                >
                                  {correct}C / {mistakes}M
                                </span>
                                <span className="w-1 h-1 rounded-full bg-geist-border-dark dark:bg-geist-border-light opacity-30" />
                                <span>Avg: {formatTime(avgTime)}</span>
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
                            fill={bookmarked[q.id] ? "currentColor" : "none"}
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
                        const correctOpt = questionDetails[q.id]?.correct_option;
                        
                        if (correctOpt === idx) {
                          styles =
                            "bg-geist-success/10 border-geist-success text-geist-success font-medium opacity-100";
                          Icon = (
                            <CheckCircle className="w-4 h-4 text-geist-success shrink-0 mt-0.5" />
                          );
                        } else if (
                          isAttempted &&
                          !isCorrect &&
                          idx !== correctOpt
                        ) {
                          // Dim incorrect option
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
                  </div>
                );
              })}
          </div>

          {/* Pagination Controls */}
          {filteredQuestions.length > 20 && (
            <div className="mt-8 flex items-center justify-between border-t border-geist-border-light dark:border-geist-border-dark pt-4">
              <span className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                Showing {(currentPage - 1) * 20 + 1} to{" "}
                {Math.min(currentPage * 20, filteredQuestions.length)} of{" "}
                {filteredQuestions.length}
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
                      Math.min(Math.ceil(filteredQuestions.length / 20), p + 1),
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={
                    currentPage === Math.ceil(filteredQuestions.length / 20)
                  }
                  className="px-3 py-1.5 rounded-md border border-geist-border-light dark:border-geist-border-dark text-sm font-medium disabled:opacity-50 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group by month
  const groupedByMonth = history.reduce(
    (acc, session) => {
      if (!acc[session.monthYear]) acc[session.monthYear] = [];
      acc[session.monthYear].push(session);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
          <button
            onClick={() => window.history.back()}
            className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors"
          >
            Dashboard
          </button>
          <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
            /
          </span>
          <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
            History
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
          Activity History
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
              Your past sessions and performance over time.
            </p>
          </div>
          <div className="p-3 bg-geist-surface-light dark:bg-geist-surface-dark rounded-full hidden sm:block">
            <Activity className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        <div className="grid gap-6">
          {Object.keys(groupedByMonth).length === 0 ? (
            <div className="text-center py-20 bg-geist-surface-light/50 dark:bg-geist-surface-dark/50 rounded-2xl border border-dashed border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
              No history found. Start practicing!
            </div>
          ) : (
            Object.keys(groupedByMonth).map((month) => (
              <div key={month} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider ml-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {month}
                </div>

                <div className="space-y-3">
                  {groupedByMonth[month].map((h, i) => {
                    const isMock = h.type === "MockTest";
                    const accuracy = Math.round((h.correct / h.total) * 100);

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedSession(h)}
                        className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark p-4 rounded-2xl shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-geist-text-secondary-light transition-colors group"
                      >
                        {/* Left Accent Bar */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${isMock ? "bg-purple-500" : "bg-blue-500"}`}
                        />

                        <div className="pl-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isMock ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}
                            >
                              {isMock ? "Mock Test" : "Practice"}
                            </span>
                            <span className="text-xs text-geist-text-secondary-light font-medium">
                              {h.date}
                            </span>
                            <span className="text-[10px] text-geist-text-secondary-light">
                              • {h.timeString}
                            </span>
                          </div>
                          <div className="text-sm font-medium mt-1 group-hover:text-blue-500 transition-colors">
                            {h.title}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-2 sm:pl-0 sm:justify-end">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-geist-surface-light dark:bg-geist-surface-dark rounded-lg border border-geist-border-light dark:border-geist-border-dark">
                            <Target
                              className={`w-3.5 h-3.5 ${accuracy >= 80 ? "text-geist-success" : accuracy >= 50 ? "text-yellow-500" : "text-geist-error-light"}`}
                            />
                            <span className="text-xs font-semibold">
                              {accuracy}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-geist-surface-light dark:bg-geist-surface-dark rounded-lg border border-geist-border-light dark:border-geist-border-dark">
                            <Clock className="w-3.5 h-3.5 text-geist-text-secondary-light" />
                            <span className="text-xs font-semibold">
                              {formatTime(h.time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
