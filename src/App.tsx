import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { QuestionBuilder } from './pages/admin/QuestionBuilder';
import { QuestionsManager } from './pages/admin/QuestionsManager';
import { BulkImport } from './pages/admin/BulkImport';
import { AcademicManager } from './pages/admin/AcademicManager';
import { ExamManager } from './pages/admin/ExamManager';
import { PaperManager } from './pages/admin/PaperManager';
import { QuestionTypesManager } from './pages/admin/QuestionTypesManager';
import { BooksSetsManager } from './pages/admin/BooksSetsManager';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { useAdminStore } from './store/useAdminStore';

import { PracticeSetup } from './pages/student/PracticeSetup';
import { PracticeSession } from './pages/student/PracticeSession';
import { MockTestSetup } from './pages/student/MockTestSetup';
import { MockTestSession } from './pages/student/MockTestSession';
import { ExamsPage } from './pages/student/ExamsPage';
import { SubjectsPage } from './pages/student/SubjectsPage';
import { BookmarksPage } from './pages/student/BookmarksPage';
import { MistakesPage } from './pages/student/MistakesPage';
import { HistoryPage } from './pages/student/HistoryPage';
import { CustomListsPage } from './pages/student/CustomListsPage';
import { PomodoroTimer } from './pages/student/PomodoroTimer';
import { StudyPlanner } from './pages/student/StudyPlanner';

import { useUserStore } from './store/useUserStore';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading: authLoading, isAdmin } = useAuthStore();
  const { fetchData, isLoading: userLoading, isInitialized } = useUserStore();
  
  useEffect(() => {
    if (user && !isInitialized && !userLoading) {
      fetchData();
    }
  }, [user, isInitialized, userLoading, fetchData]);

  if (authLoading || (user && (userLoading || !isInitialized))) {
    return <div className="min-h-screen bg-geist-bg-light dark:bg-geist-bg-dark flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-sans">Loading data...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Route Wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isLoading } = useAuthStore();
  const { fetchCoreData, fetchAllQuestions } = useAdminStore();
  
  useEffect(() => {
    if (isAdmin) {
      fetchCoreData();
      fetchAllQuestions();
    }
  }, [isAdmin, fetchCoreData, fetchAllQuestions]);

  if (isLoading) {
    return <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-zinc-500 font-sans">Loading...</div>;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user && window.opener) {
        window.close();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user && window.opener) {
        window.close();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="bookmarks" element={<BookmarksPage />} />
              <Route path="mistakes" element={<MistakesPage />} />
              <Route path="custom-lists" element={<CustomListsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="planner" element={<StudyPlanner />} />
              <Route path="practice/setup" element={<PracticeSetup />} />
              <Route path="mock-test/setup" element={<MockTestSetup />} />
              <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="admin/questions" element={<AdminRoute><QuestionsManager /></AdminRoute>} />
              <Route path="admin/questions/new" element={<AdminRoute><QuestionBuilder /></AdminRoute>} />
              <Route path="admin/questions/edit/:id" element={<AdminRoute><QuestionBuilder /></AdminRoute>} />
              <Route path="admin/import" element={<AdminRoute><BulkImport /></AdminRoute>} />
              <Route path="admin/academic" element={<AdminRoute><AcademicManager /></AdminRoute>} />
              <Route path="admin/question-types" element={<AdminRoute><QuestionTypesManager /></AdminRoute>} />
              <Route path="admin/books-sets" element={<AdminRoute><BooksSetsManager /></AdminRoute>} />
              <Route path="admin/exams" element={<AdminRoute><ExamManager /></AdminRoute>} />
              <Route path="admin/papers" element={<AdminRoute><PaperManager /></AdminRoute>} />
            </Route>

            <Route path="/practice/session" element={<ProtectedRoute><PracticeSession /></ProtectedRoute>} />
            <Route path="/mock-test/session" element={<ProtectedRoute><MockTestSession /></ProtectedRoute>} />
            <Route path="/timer" element={<ProtectedRoute><PomodoroTimer /></ProtectedRoute>} />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
