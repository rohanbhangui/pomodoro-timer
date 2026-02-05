'use client';

import { useState, useEffect, useRef } from 'react';
import TimerPill from '@/components/TimerPill';
import TimeDisplay from '@/components/TimeDisplay';
import SwipeIndicator from '@/components/SwipeIndicator';

type TimerState = 'initial' | 'running' | 'mid' | 'paused' | 'done';

export default function Home() {
  const [timerState, setTimerState] = useState<TimerState>('initial');
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [swipeProgress, setSwipeProgress] = useState(0); // 0 to 1, tracks swipe position
  const [isSwipingUp, setIsSwipingUp] = useState(false);
  const [isAtTop, setIsAtTop] = useState(false); // Indicates if pill is at top and ready to start
  const [shouldWobble, setShouldWobble] = useState(false); // Trigger wobble when pulling at 0:00
  const [doneFadedToGrey, setDoneFadedToGrey] = useState(false); // Track if done state has faded to grey
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const doneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justStartedTimer = useRef(false); // Track if we just started the timer to prevent immediate pause
  const [isMobile, setIsMobile] = useState(false);

  // Detect if we're on mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Format time as M:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle time edit for minutes (0-99, increments of 5)
  const handleMinutesEdit = (e: React.MouseEvent) => {
    if (timerState === 'done') {
      setTimerState('initial');
      setProgress(0);
      setRemainingSeconds(0);
    }
    if (timerState !== 'initial' && timerState !== 'done') return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const currentMinutes = Math.floor(totalSeconds / 60);
    const currentSecondsRemainder = totalSeconds % 60;
    const nextMinutes = currentMinutes >= 99 ? 99 : Math.min(99, currentMinutes + 5); // Lock at 99
    
    setTotalSeconds(nextMinutes * 60 + currentSecondsRemainder);
    
    // Reset swipe state
    setSwipeProgress(0);
    setIsSwipingUp(false);
    touchStartY.current = null;
    mouseStartY.current = null;
  };

  // Handle time edit for seconds (0, 15, 30, 45)
  const handleSecondsEdit = (e: React.MouseEvent) => {
    if (timerState === 'done') {
      setTimerState('initial');
      setProgress(0);
      setRemainingSeconds(0);
    }
    if (timerState !== 'initial' && timerState !== 'done') return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const currentMinutes = Math.floor(totalSeconds / 60);
    const currentSeconds = totalSeconds % 60;
    const secondsOptions = [0, 15, 30, 45];
    let currentIndex = secondsOptions.indexOf(currentSeconds);
    // If current seconds not in array, find the next higher value or start at 0
    if (currentIndex === -1) {
      currentIndex = secondsOptions.findIndex(s => s > currentSeconds);
      if (currentIndex === -1) currentIndex = 0;
    } else {
      currentIndex = (currentIndex + 1) % secondsOptions.length;
    }
    const nextSeconds = secondsOptions[currentIndex];
    
    // If wrapping from 45 to 0, increment minutes by 1
    let nextMinutes = currentMinutes;
    if (currentSeconds === 45 && nextSeconds === 0) {
      nextMinutes = Math.min(99, currentMinutes + 1); // Cap at 99
    }
    
    // If minutes are at 99, lock seconds at 45 max
    if (currentMinutes === 99 && currentSeconds === 45) {
      nextMinutes = 99;
      setTotalSeconds(nextMinutes * 60 + 45);
    } else {
      setTotalSeconds(nextMinutes * 60 + nextSeconds);
    }
    
    // Reset swipe state
    setSwipeProgress(0);
    setIsSwipingUp(false);
    touchStartY.current = null;
    mouseStartY.current = null;
  };

  // Handle touch/swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (timerState === 'initial') {
      e.preventDefault();
      touchStartY.current = e.touches[0].clientY;
      setIsSwipingUp(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    e.preventDefault();
    
    if (isSwipingUp) {
      const currentY = e.touches[0].clientY;
      const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
      
      // Calculate progress based on actual position (0 at bottom, 1 at top)
      const bottomPosition = containerHeight * 0.8;
      const topPosition = containerHeight * 0.1;
      const range = bottomPosition - topPosition;
      let progress = Math.max(0, Math.min(1, (bottomPosition - currentY) / range));
      
      // Add resistance if timer is at 0:00 - reduce progress dramatically
      if (totalSeconds === 0) {
        progress = progress * 0.2; // Only allow 20% of normal movement
      }
      
      setSwipeProgress(progress);
      setIsAtTop(progress >= 0.95);
      
      // If dragging down past starting position, reduce time
      if (currentY > touchStartY.current && totalSeconds > 0) {
        const dragDownDistance = currentY - touchStartY.current;
        const secondsToReduce = Math.floor(dragDownDistance / 20) * 15;
        const newSeconds = Math.max(0, totalSeconds - secondsToReduce);
        setTotalSeconds(newSeconds);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    if (isSwipingUp) {
      // Only start timer if released at the top
      if (isAtTop && timerState === 'initial' && totalSeconds > 0) {
        startTimer();
      } else {
        // Trigger wobble if at 0:00 and tried to pull up
        if (totalSeconds === 0 && swipeProgress > 0) {
          setShouldWobble(true);
          setTimeout(() => setShouldWobble(false), 800);
        }
        // Reset swipe if not at top
        setSwipeProgress(0);
        setIsSwipingUp(false);
        setIsAtTop(false);
      }
    }
    
    touchStartY.current = null;
  };

  // Handle mouse gestures for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (timerState === 'initial') {
      mouseStartY.current = e.clientY;
      setIsSwipingUp(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartY.current === null) return;
    
    if (isSwipingUp) {
      const currentY = e.clientY;
      const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
      
      // Calculate progress based on actual position (0 at bottom, 1 at top)
      const bottomPosition = containerHeight * 0.8;
      const topPosition = containerHeight * 0.1;
      const range = bottomPosition - topPosition;
      let progress = Math.max(0, Math.min(1, (bottomPosition - currentY) / range));
      
      // Add resistance if timer is at 0:00 - reduce progress dramatically
      if (totalSeconds === 0) {
        progress = progress * 0.2; // Only allow 20% of normal movement
      }
      
      setSwipeProgress(progress);
      setIsAtTop(progress >= 0.95);
      
      // If dragging down past starting position, reduce time
      if (currentY > mouseStartY.current && totalSeconds > 0) {
        const dragDownDistance = currentY - mouseStartY.current;
        const secondsToReduce = Math.floor(dragDownDistance / 20) * 15;
        const newSeconds = Math.max(0, totalSeconds - secondsToReduce);
        setTotalSeconds(newSeconds);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartY.current === null) return;
    
    if (isSwipingUp) {
      // Only start timer if released at the top
      if (isAtTop && timerState === 'initial' && totalSeconds > 0) {
        startTimer();
      } else {
        // Trigger wobble if at 0:00 and tried to pull up
        if (totalSeconds === 0 && swipeProgress > 0) {
          setShouldWobble(true);
          setTimeout(() => setShouldWobble(false), 800);
        }
        // Reset swipe if not at top
        setSwipeProgress(0);
        setIsSwipingUp(false);
        setIsAtTop(false);
      }
    }
    
    mouseStartY.current = null;
  };

  // Start timer
  const startTimer = () => {
    setTimerState('running');
    setRemainingSeconds(totalSeconds);
    setProgress(0);
    setSwipeProgress(0);
    setIsSwipingUp(false);
    setIsAtTop(false);
    justStartedTimer.current = true;
    // Reset the flag after a short delay to allow normal pause/resume
    setTimeout(() => {
      justStartedTimer.current = false;
    }, 100);
  };

  // Timer countdown effect
  useEffect(() => {
    if ((timerState === 'running' || timerState === 'mid') && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const newRemaining = prev - 1;
          const newProgress = 1 - newRemaining / totalSeconds;
          setProgress(newProgress);
          
          // Check if we're in the middle section (around 50%)
          if (newProgress >= 0.4 && newProgress < 0.6 && timerState === 'running') {
            setTimerState('mid');
          }
          
          if (newRemaining <= 0) {
            // Smoothly transition to done state by first setting progress to 1
            setProgress(1);
            // Delay state change slightly to allow smooth animation
            setTimeout(() => {
              setTimerState('done');
            }, 300);
            return 0;
          }
          
          return newRemaining;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else if (timerState === 'paused') {
      // Clear interval when paused
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [timerState, remainingSeconds, totalSeconds]);

  // Fade to grey after 10 seconds in done state
  useEffect(() => {
    if (timerState === 'done') {
      setDoneFadedToGrey(false);
      doneTimeoutRef.current = setTimeout(() => {
        setDoneFadedToGrey(true);
      }, 10000);

      return () => {
        if (doneTimeoutRef.current) {
          clearTimeout(doneTimeoutRef.current);
        }
      };
    } else {
      setDoneFadedToGrey(false);
      if (doneTimeoutRef.current) {
        clearTimeout(doneTimeoutRef.current);
      }
    }
  }, [timerState]);

  // Get background color based on state
  const getBackgroundColor = () => {
    switch (timerState) {
      case 'initial':
        return 'bg-gradient-to-b from-zinc-500 via-zinc-500 to-zinc-500';
      case 'running':
        return 'bg-gradient-to-b from-[#FFB5A0] via-[#FFA68F] to-[#FF9B85]';
      case 'mid':
        return 'bg-gradient-to-b from-[#FFC4B3] via-[#FFB5A0] to-[#FFA68F]';
      case 'paused':
        return 'bg-gradient-to-b from-zinc-500 via-zinc-500 to-zinc-500';
      case 'done':
        return doneFadedToGrey 
          ? 'bg-gradient-to-b from-zinc-500 via-zinc-500 to-zinc-500'
          : 'bg-gradient-to-b from-[#5FD17B] via-[#5FD17B] to-[#5FD17B]';
      default:
        return 'bg-gradient-to-b from-zinc-500 via-zinc-500 to-zinc-500';
    }
  };

  // Reset timer
  const handleReset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimerState('initial');
    setRemainingSeconds(0);
    setProgress(0);
    setSwipeProgress(0);
    setIsSwipingUp(false);
    setIsAtTop(false);
  };

  // Handle pause/resume
  const handlePauseResume = () => {
    // Don't pause if we just started the timer
    if (justStartedTimer.current) return;
    
    if (timerState === 'running' || timerState === 'mid') {
      setTimerState('paused');
    } else if (timerState === 'paused') {
      // Resume to the appropriate state based on progress
      const currentProgress = 1 - remainingSeconds / totalSeconds;
      if (currentProgress >= 0.4 && currentProgress < 0.6) {
        setTimerState('mid');
      } else {
        setTimerState('running');
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-900 md:bg-transparent px-6 py-6 md:p-0" style={{ touchAction: 'none' }}>
      <div
        ref={containerRef}
        className={`relative flex w-full md:w-full h-[calc(100vh-3rem)] md:h-screen max-w-md md:max-w-none flex-col items-center justify-between transition-colors duration-500 ${getBackgroundColor()} overflow-hidden md:rounded-none rounded-[60px] shadow-2xl select-none py-8 md:py-0 ${
          isSwipingUp ? 'cursor-grabbing' : ''
        }`}
        style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(timerState === 'running' || timerState === 'mid' || timerState === 'paused') ? handlePauseResume : undefined}
      >
      {/* Timer Pill - show in all states */}
      {timerState === 'initial' ? (
        <>
          <TimerPill 
            time={formatTime(totalSeconds)} 
            progress={1 - swipeProgress}
            editable={!isSwipingUp}
            onEditMinutes={handleMinutesEdit}
            onEditSeconds={handleSecondsEdit}
            animate={false}
            wobble={shouldWobble}
          />
          {/* Reset icon next to pill */}
          {totalSeconds > 0 && !isSwipingUp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTotalSeconds(0);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute hover:opacity-80 active:scale-95 transition-all z-10 cursor-pointer"
              style={{
                top: `${(1 - swipeProgress) * 70 + 10}%`,
                left: isMobile ? 'calc(50% + 130px)' : 'calc(50% + 100px)',
                transform: isMobile ? 'translateY(30px)' : 'translateY(24px)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-black opacity-60"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
          )}
        </>
      ) : timerState === 'done' ? (
        <>
          {/* Done text at top - fade in smoothly */}
          <div className={`absolute top-20 left-1/2 -translate-x-1/2 transition-all duration-1000 ${
            doneFadedToGrey ? 'opacity-0' : 'opacity-100'
          }`}>
            <div className="text-white text-2xl font-medium animate-[fadeIn_0.5s_ease-in]">Done</div>
          </div>
          {/* Timer pill stays at bottom showing 0:00 */}
          <TimerPill 
            time="0:00" 
            progress={1} 
            animate={true}
            editable={true}
            onEditMinutes={handleMinutesEdit}
            onEditSeconds={handleSecondsEdit} 
          />
        </>
      ) : (
        <>
          <TimerPill 
            time={formatTime(remainingSeconds)} 
            progress={progress} 
            animate={timerState !== 'paused'} 
          />
          {/* Reset icon when paused */}
          {timerState === 'paused' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute hover:opacity-80 active:scale-95 transition-all animate-pulse z-10 cursor-pointer"
              style={{
                top: `${progress * 70 + 10}%`,
                left: isMobile ? 'calc(50% + 130px)' : 'calc(50% + 120px)',
                transform: isMobile ? 'translateY(28px)' : 'translateY(22px)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-black opacity-60"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
          )}
        </>
      )}

      {/* Swipe/Release Indicator */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
        {isAtTop ? (
          <div className="flex flex-col items-center gap-2 animate-pulse">
            <div className="text-sm font-medium opacity-80">Release to start</div>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-80 rotate-180"
            >
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </div>
        ) : (
          <SwipeIndicator show={timerState === 'initial' && totalSeconds > 0 && !isSwipingUp} />
        )}
      </div>
      </div>
    </div>
  );
}

