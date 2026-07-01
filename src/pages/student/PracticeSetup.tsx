import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../../store/useUserStore";
import { ChevronRight, Play } from "lucide-react";
import { CustomDropdown } from "../../components/CustomDropdown";

export const PracticeSetup: React.FC = () => {
  const { academicTree } = useUserStore();
  const navigate = useNavigate();

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const [timeLimit, setTimeLimit] = useState<number>(0); // 0 means no limit

  // Derived state based on selections
  const availableSubjects = useMemo(() => {
    if (selectedClasses.length === 0) return [];
    return academicTree
      .filter((cls) => selectedClasses.includes(cls.id))
      .flatMap((cls) => cls.children || []);
  }, [academicTree, selectedClasses]);

  const availableChapters = useMemo(() => {
    if (selectedSubjects.length === 0) return [];
    return availableSubjects
      .filter((s) => selectedSubjects.includes(s.id))
      .flatMap((s) => s.children || []);
  }, [availableSubjects, selectedSubjects]);

  const availableTopics = useMemo(() => {
    if (selectedChapters.length === 0) return [];
    return availableChapters
      .filter((c) => selectedChapters.includes(c.id))
      .flatMap((c) => c.children || []);
  }, [availableChapters, selectedChapters]);

  const [sourceType, setSourceType] = useState<"All" | "PYQ" | "BookSet">(
    "All",
  );

  const [questionCount, setQuestionCount] = useState<number>(10); // default to 10

  const [questionOrder, setQuestionOrder] = useState<"sequential" | "random">(
    "sequential",
  );

  const handleStart = () => {
    // Generate filter object based on selection
    const filter = {
      classIds: selectedClasses,
      subjectIds: selectedSubjects,
      chapterIds: selectedChapters,
      topicIds: selectedTopics,
      timeLimit: timeLimit,
      sourceType: sourceType,
      sourceId: "",
      questionCount: questionCount,
      questionOrder: questionOrder,
    };

    // Store in local storage to pass to session
    localStorage.setItem("practice_config", JSON.stringify(filter));
    navigate("/practice/session");
  };

  const toggleSelection = (
    id: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (list.includes(id)) {
      setter(list.filter((item) => item !== id));
    } else {
      setter([...list, id]);
    }
  };

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors"
          >
            Dashboard
          </button>
          <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
            /
          </span>
          <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
            Topical Practice
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
          Setup Practice
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
            Select classes, subjects, or chapters to practice specific topics.
          </p>
        </div>

        <div className="space-y-4 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-4 md:p-6">
          {/* Classes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2">
              Classes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {academicTree.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() =>
                    toggleSelection(cls.id, selectedClasses, setSelectedClasses)
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    selectedClasses.includes(cls.id)
                      ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-400"
                      : "bg-geist-surface-light border-geist-border-light text-geist-text-secondary-light hover:bg-geist-border-light dark:bg-geist-surface-dark dark:border-geist-border-dark dark:text-geist-text-secondary-dark dark:hover:bg-geist-border-dark"
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subjects */}
          {availableSubjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2 mt-2">
                Subjects
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableSubjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() =>
                      toggleSelection(
                        s.id,
                        selectedSubjects,
                        setSelectedSubjects,
                      )
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      selectedSubjects.includes(s.id)
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400"
                        : "bg-geist-surface-light border-geist-border-light text-geist-text-secondary-light hover:bg-geist-border-light dark:bg-geist-surface-dark dark:border-geist-border-dark dark:text-geist-text-secondary-dark dark:hover:bg-geist-border-dark"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chapters */}
          {availableChapters.length > 0 && selectedSubjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2 mt-2">
                Chapters
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {availableChapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      toggleSelection(
                        c.id,
                        selectedChapters,
                        setSelectedChapters,
                      )
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      selectedChapters.includes(c.id)
                        ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/40 dark:border-purple-800 dark:text-purple-400"
                        : "bg-geist-surface-light border-geist-border-light text-geist-text-secondary-light hover:bg-geist-border-light dark:bg-geist-surface-dark dark:border-geist-border-dark dark:text-geist-text-secondary-dark dark:hover:bg-geist-border-dark"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {availableTopics.length > 0 && selectedChapters.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2 mt-2">
                Topics
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {availableTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      toggleSelection(
                        t.id,
                        selectedTopics,
                        setSelectedTopics,
                      )
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      selectedTopics.includes(t.id)
                        ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-400"
                        : "bg-geist-surface-light border-geist-border-light text-geist-text-secondary-light hover:bg-geist-border-light dark:bg-geist-surface-dark dark:border-geist-border-dark dark:text-geist-text-secondary-dark dark:hover:bg-geist-border-dark"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Source and Time Limit */}
          <div className="pt-4 mt-2 border-t border-geist-border-light dark:border-geist-border-dark flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2">
                Practice Source
              </label>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <button
                  onClick={() => setSourceType("All")}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${sourceType === "All" ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark border-transparent" : "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark"}`}
                >
                  All Questions
                </button>
                <button
                  onClick={() => setSourceType("PYQ")}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${sourceType === "PYQ" ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark border-transparent" : "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark"}`}
                >
                  All PYQs
                </button>
                <button
                  onClick={() => setSourceType("BookSet")}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${sourceType === "BookSet" ? "bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark border-transparent" : "bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark"}`}
                >
                  All Books & Sets
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:w-auto shrink-0">
              <div className="w-full">
                <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2">
                  No of Questions
                </label>
                <CustomDropdown
                  value={questionCount.toString()}
                  onChange={(val) => setQuestionCount(Number(val))}
                  options={[
                    { value: "10", label: "10 Questions" },
                    { value: "20", label: "20 Questions" },
                    { value: "30", label: "30 Questions" },
                    { value: "50", label: "50 Questions" },
                  ]}
                  placeholder="Select Count"
                  className="w-full"
                />
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2">
                  Order
                </label>
                <CustomDropdown
                  value={questionOrder}
                  onChange={(val) => setQuestionOrder(val as any)}
                  options={[
                    { value: "random", label: "Random" },
                    { value: "sequential", label: "Sequential (Resume)" },
                  ]}
                  placeholder="Select Order"
                  className="w-full"
                />
              </div>

              <div className="w-full col-span-2 md:col-span-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-2">
                  Time Limit
                </label>
                <CustomDropdown
                  value={timeLimit.toString()}
                  onChange={(val) => setTimeLimit(Number(val))}
                  options={[
                    { value: "0", label: "No Limit" },
                    { value: "900", label: "15 Minutes" },
                    { value: "1800", label: "30 Minutes" },
                    { value: "3600", label: "1 Hour" },
                    { value: "7200", label: "2 Hours" },
                  ]}
                  placeholder="Select Time Limit"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end items-center pt-4 gap-4">
            {selectedClasses.length === 0 && (
              <span className="text-xs text-geist-error-light dark:text-geist-error-dark">
                Please select at least one class to start practice.
              </span>
            )}
            <button
              onClick={handleStart}
              disabled={selectedClasses.length === 0}
              className="flex items-center justify-center gap-2 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-6 py-2 rounded-lg font-medium hover:opacity-80 transition-opacity w-full sm:w-auto min-h-[40px] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5" />
              Start Practice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
