import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Minimize, Settings2, Clock as ClockIcon, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlannerStore } from '../../store/usePlannerStore';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  autoSwitch: boolean;
}

export const PomodoroTimer: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, addPomodoroSession, fetchTasks } = usePlannerStore();
  
  const [settings, setSettings] = useState<TimerSettings>({
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    autoSwitch: true
  });

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(settings.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showClock, setShowClock] = useState(false);
  const [is24Hour, setIs24Hour] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchTasks();
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  }, [fetchTasks]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const MODES = {
    pomodoro: { label: 'Focus', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    shortBreak: { label: 'Short Break', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    longBreak: { label: 'Long Break', color: 'text-blue-500', bg: 'bg-blue-500/10' }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = async () => {
    if (!isMuted && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    setIsActive(false);

    // Save to database
    await addPomodoroSession({
      study_plan_id: selectedTaskId || undefined,
      duration_seconds: settings[mode] * 60,
      session_type: mode,
      completed: true
    });

    if (settings.autoSwitch) {
      const nextMode = mode === 'pomodoro' ? 'shortBreak' : 'pomodoro';
      switchMode(nextMode);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[mode] * 60);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(settings[newMode] * 60);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const updateSetting = (key: keyof TimerSettings, val: number | boolean) => {
    const newSettings = { ...settings, [key]: val };
    setSettings(newSettings);
    if (key === mode && !isActive) {
      setTimeLeft((val as number) * 60);
    }
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="min-h-[100dvh] bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-primary-light dark:text-geist-text-primary-dark font-sans flex flex-col relative overflow-hidden transition-colors duration-500">
      
      {/* Background glow */}
      <div className={`absolute inset-0 opacity-20 blur-[100px] transition-colors duration-1000 ${MODES[mode].bg} -z-10`} />

      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 md:p-6 z-10 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors px-3 py-2 rounded-lg hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => setShowClock(!showClock)}
            className={`p-3 transition-colors rounded-full hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark ${showClock ? 'text-geist-text-primary-light dark:text-geist-text-primary-dark bg-geist-surface-light dark:bg-geist-surface-dark' : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark'}`}
            title="Toggle Clock Mode"
          >
            <ClockIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors rounded-full hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors rounded-full hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-3 hidden sm:block text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors rounded-full hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 sm:px-6 z-10">
        <AnimatePresence mode="wait">
          {showClock ? (
            <motion.div
              key="clock"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center relative group"
            >
              <div className="text-[6rem] sm:text-[10rem] md:text-[14rem] font-mono tracking-tighter tabular-nums leading-none text-geist-text-primary-light dark:text-geist-text-primary-dark font-light select-none relative cursor-pointer" onClick={() => setIs24Hour(!is24Hour)} title="Click to toggle 12/24h format">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24Hour })}
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-4 font-medium tracking-wide">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                Click time to switch format
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center w-full"
            >
              {/* Task Selector */}
              <div className="relative mb-8 w-full max-w-sm">
                <button
                  onClick={() => setShowTaskSelector(!showTaskSelector)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-geist-surface-light/50 dark:bg-geist-surface-dark/50 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl backdrop-blur-md transition-colors text-sm font-medium"
                >
                  {selectedTask ? (
                    <span className="truncate flex-1 text-center">{selectedTask.title}</span>
                  ) : (
                    <span className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Select a task to focus on...</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
                </button>

                <AnimatePresence>
                  {showTaskSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto"
                    >
                      <button
                        onClick={() => { setSelectedTaskId(''); setShowTaskSelector(false); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-b border-geist-border-light dark:border-geist-border-dark"
                      >
                        No task selected
                      </button>
                      {tasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => { setSelectedTaskId(task.id); setShowTaskSelector(false); }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark border-b border-geist-border-light dark:border-geist-border-dark last:border-0"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-medium truncate text-left">{task.title}</p>
                          </div>
                          {selectedTaskId === task.id && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mode Selector */}
              <div className="flex gap-1.5 sm:gap-2 p-1.5 mb-8 sm:mb-12 bg-geist-surface-light dark:bg-geist-surface-dark rounded-full border border-geist-border-light dark:border-geist-border-dark backdrop-blur-md">
                {(Object.keys(MODES) as TimerMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                      mode === m 
                        ? `bg-geist-bg-light dark:bg-geist-bg-dark shadow-sm ${MODES[m].color}`
                        : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark'
                    }`}
                  >
                    {MODES[m].label}
                  </button>
                ))}
              </div>

              {/* Timer Display */}
              <div className="relative mb-12 sm:mb-16 flex items-center justify-center">
                <motion.div
                  key={mode}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`text-[5rem] sm:text-[8rem] md:text-[10rem] font-mono tracking-tighter tabular-nums leading-none ${MODES[mode].color} font-light select-none`}
                >
                  {formatTime(timeLeft)}
                </motion.div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 sm:gap-6">
                <button
                  onClick={resetTimer}
                  className="p-3 sm:p-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors rounded-full hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark group"
                >
                  <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-rotate-90 transition-transform duration-300" />
                </button>
                
                <button
                  onClick={toggleTimer}
                  className={`w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105 active:scale-95 ${
                    isActive ? 'bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark' : 'bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark'
                  }`}
                >
                  {isActive ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current translate-x-0.5" />
                  )}
                </button>
                
                <div className="w-[44px] sm:w-[56px]" /> {/* Spacer to center the play button */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Real-time Clock Footer */}
      {!showClock && (
        <div className="p-6 shrink-0 flex justify-center items-center opacity-50 hover:opacity-100 transition-opacity text-geist-text-secondary-light dark:text-geist-text-secondary-dark cursor-pointer" onClick={() => setIs24Hour(!is24Hour)} title="Toggle 12/24h format">
          <div className="flex items-center gap-2 font-mono text-sm">
            <ClockIcon className="w-4 h-4" />
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24Hour })}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Settings2 className="w-5 h-5" /> Timer Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Focus duration (min)</label>
                  <input 
                    type="number" min="1" max="90" 
                    value={settings.pomodoro}
                    onChange={(e) => updateSetting('pomodoro', parseInt(e.target.value) || 25)}
                    className="w-20 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-1.5 text-sm text-center outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Short break (min)</label>
                  <input 
                    type="number" min="1" max="30" 
                    value={settings.shortBreak}
                    onChange={(e) => updateSetting('shortBreak', parseInt(e.target.value) || 5)}
                    className="w-20 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-1.5 text-sm text-center outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Long break (min)</label>
                  <input 
                    type="number" min="1" max="60" 
                    value={settings.longBreak}
                    onChange={(e) => updateSetting('longBreak', parseInt(e.target.value) || 15)}
                    className="w-20 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-1.5 text-sm text-center outline-none"
                  />
                </div>
                <div className="pt-4 border-t border-geist-border-light dark:border-geist-border-dark flex items-center justify-between">
                  <label className="text-sm font-medium">Auto-start next session</label>
                  <button 
                    onClick={() => updateSetting('autoSwitch', !settings.autoSwitch)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoSwitch ? 'bg-geist-text-primary-light dark:bg-geist-text-primary-dark' : 'bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-geist-bg-light dark:bg-geist-bg-dark w-4 h-4 rounded-full transition-transform ${settings.autoSwitch ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full py-2.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-xl text-sm font-medium"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
