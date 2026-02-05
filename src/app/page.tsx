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
  const startTimeRef = useRef<number | null>(null); // Track millisecond start time
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0); // Track progress without causing re-renders
  const pillRef = useRef<HTMLDivElement>(null); // Direct reference to pill for CSS updates

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
    // If in done state, fully reset
    let baseSeconds = totalSeconds;
    if (timerState === 'done') {
      setTimerState('initial');
      setProgress(0);
      setRemainingSeconds(0);
      setTotalSeconds(0);
      baseSeconds = 0;
    }
    if (timerState !== 'initial' && timerState !== 'done') return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const currentMinutes = Math.floor(baseSeconds / 60);
    const currentSecondsRemainder = baseSeconds % 60;
    
    // Add 5, then round to nearest 5 for clean increments
    const nextMinutesRaw = currentMinutes + 5;
    const nextMinutes = Math.min(99, Math.round(nextMinutesRaw / 5) * 5); // Round and lock at 99
    
    setTotalSeconds(nextMinutes * 60 + currentSecondsRemainder);
    
    // Reset swipe state
    setSwipeProgress(0);
    setIsSwipingUp(false);
    touchStartY.current = null;
    mouseStartY.current = null;
  };

  // Handle time edit for seconds (0, 15, 30, 45)
  const handleSecondsEdit = (e: React.MouseEvent) => {
    // If in done state, fully reset
    let baseSeconds = totalSeconds;
    if (timerState === 'done') {
      setTimerState('initial');
      setProgress(0);
      setRemainingSeconds(0);
      setTotalSeconds(0);
      baseSeconds = 0;
    }
    if (timerState !== 'initial' && timerState !== 'done') return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const currentMinutes = Math.floor(baseSeconds / 60);
    const currentSeconds = baseSeconds % 60;
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
    if (timerState === 'initial' || timerState === 'done') {
      e.preventDefault();
      touchStartY.current = e.touches[0].clientY;
      if (timerState === 'done') {
        // Reset to initial state when dragging on done screen
        setTimerState('initial');
        setTotalSeconds(0);
        setProgress(0);
        setRemainingSeconds(0);
      }
      // Don't set isSwipingUp yet - wait for actual movement
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY.current - currentY;
    
    // Only start tracking swipe after moving 15px upward
    if (!isSwipingUp && deltaY > 15) {
      setIsSwipingUp(true);
    }
    
    if (isSwipingUp) {
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
      
      // If threshold reached and has time set, snap to top with wobble
      const wasAtTop = isAtTop;
      const reachedThreshold = progress >= 0.5 && totalSeconds > 0;
      
      if (reachedThreshold && !wasAtTop) {
        setSwipeProgress(1); // Snap to top
        setIsAtTop(true);
        setShouldWobble(true);
        setTimeout(() => setShouldWobble(false), 400);
      } else if (!reachedThreshold) {
        setSwipeProgress(progress);
        setIsAtTop(false);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    if (isSwipingUp) {
      // If at top (threshold was reached), start timer
      if (isAtTop && timerState === 'initial' && totalSeconds > 0) {
        startTimer();
      } else {
        // Trigger wobble if at 0:00 and tried to pull up
        if (totalSeconds === 0 && swipeProgress > 0) {
          setShouldWobble(true);
          setTimeout(() => setShouldWobble(false), 800);
        }
        // Also wobble if time is set but didn't reach threshold
        if (totalSeconds > 0 && swipeProgress > 0 && !isAtTop) {
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
    if (timerState === 'initial' || timerState === 'done') {
      mouseStartY.current = e.clientY;
      if (timerState === 'done') {
        // Reset to initial state when dragging on done screen
        setTimerState('initial');
        setTotalSeconds(0);
        setProgress(0);
        setRemainingSeconds(0);
      }
      // Don't set isSwipingUp yet - wait for actual movement
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartY.current === null) return;
    
    const currentY = e.clientY;
    const deltaY = mouseStartY.current - currentY;
    
    // Only start tracking swipe after moving 15px upward
    if (!isSwipingUp && deltaY > 15) {
      setIsSwipingUp(true);
    }
    
    if (isSwipingUp) {
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
      
      // If threshold reached and has time set, snap to top with wobble
      const wasAtTop = isAtTop;
      const reachedThreshold = progress >= 0.5 && totalSeconds > 0;
      
      if (reachedThreshold && !wasAtTop) {
        setSwipeProgress(1); // Snap to top
        setIsAtTop(true);
        setShouldWobble(true);
        setTimeout(() => setShouldWobble(false), 400);
      } else if (!reachedThreshold) {
        setSwipeProgress(progress);
        setIsAtTop(false);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartY.current === null) return;
    
    if (isSwipingUp) {
      // If at top (threshold was reached), start timer
      if (isAtTop && timerState === 'initial' && totalSeconds > 0) {
        startTimer();
      } else {
        // Trigger wobble if at 0:00 and tried to pull up
        if (totalSeconds === 0 && swipeProgress > 0) {
          setShouldWobble(true);
          setTimeout(() => setShouldWobble(false), 800);
        }
        // Also wobble if time is set but didn't reach threshold
        if (totalSeconds > 0 && swipeProgress > 0 && !isAtTop) {
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
    startTimeRef.current = Date.now();
    justStartedTimer.current = true;
    // Reset the flag after a short delay to allow normal pause/resume
    setTimeout(() => {
      justStartedTimer.current = false;
    }, 100);
  };

  // Millisecond-precision progress updates with reduced re-renders
  useEffect(() => {
    if ((timerState === 'running' || timerState === 'mid') && startTimeRef.current) {
      let lastStateUpdate = 0;
      let hasSwitchedToMid = timerState === 'mid';
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTimeRef.current!;
        const elapsedSeconds = elapsed / 1000;
        const newRemaining = Math.max(0, totalSeconds - elapsedSeconds);
        const newProgress = Math.min(1, elapsedSeconds / totalSeconds);
        
        progressRef.current = newProgress;
        
        // Update pill position via CSS transform (no React re-render)
        if (pillRef.current) {
          const yPosition = newProgress * 60 + 15;
          pillRef.current.style.top = `${yPosition}%`;
        }
        
        // Only update state every 100ms to reduce re-renders
        const now = Date.now();
        if (now - lastStateUpdate > 100) {
          setProgress(newProgress);
          setRemainingSeconds(Math.ceil(newRemaining));
          lastStateUpdate = now;
        }
        
        // Check if we're in the middle section (around 50%)
        if (newProgress >= 0.4 && newProgress < 0.6 && !hasSwitchedToMid) {
          setTimerState('mid');
          hasSwitchedToMid = true;
        }
        
        if (newRemaining > 0) {
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
          setProgress(1);
          setTimerState('done');
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(updateProgress);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      startTimeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [timerState, totalSeconds]);

  // Old interval-based timer - keep for state transitions
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
            setProgress(1);
            // Wait for the 1-second animation to complete before showing done state
            setTimeout(() => {
              setTimerState('done');
            }, 1000);
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
      // Capture exact progress when pausing
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        const elapsedSeconds = elapsed / 1000;
        const exactProgress = Math.min(1, elapsedSeconds / totalSeconds);
        const exactRemaining = Math.max(0, totalSeconds - elapsedSeconds);
        setProgress(exactProgress);
        setRemainingSeconds(Math.ceil(exactRemaining));
      }
      setTimerState('paused');
    } else if (timerState === 'paused') {
      // Resume from exact position - adjust startTime to continue from current progress
      // Calculate what the start time should have been to reach current progress
      const elapsedSoFar = progress * totalSeconds;
      startTimeRef.current = Date.now() - (elapsedSoFar * 1000);
      
      // Resume to the appropriate state based on progress
      const currentProgress = progress;
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
        <div 
          className="absolute"
          style={{
            top: `${(1 - swipeProgress) * 60 + 15}%`,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {/* Swipe indicator above pill */}
          {totalSeconds > 0 && !isSwipingUp && (
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce" style={{ bottom: 'calc(100% + 40px)' }}>
              <div className="text-sm font-medium opacity-60 text-center leading-tight w-15">
                Swipe up<br />to start
              </div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-60"
              >
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </div>
          )}
          
          <TimerPill 
            time={formatTime(totalSeconds)} 
            progress={0}
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
                left: '100%',
                top: '50%',
                transform: 'translate(20px, -50%)',
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
        </div>
      ) : timerState === 'done' ? (
        <>
          {/* Done text at top - fade in smoothly */}
          <div className={`absolute top-20 left-1/2 -translate-x-1/2 transition-all duration-1000 ${
            doneFadedToGrey ? 'opacity-0' : 'opacity-100'
          }`}>
            <div className="text-white text-2xl font-medium animate-[fadeIn_0.5s_ease-in]">Done</div>
          </div>
          {/* Timer pill stays at bottom showing 0:00 */}
          <div 
            className="absolute"
            style={{
              top: '75%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <TimerPill 
              time="0:00" 
              progress={0} 
              animate={false}
              editable={true}
              onEditMinutes={handleMinutesEdit}
              onEditSeconds={handleSecondsEdit} 
            />
          </div>
        </>
      ) : (
        <>
          <TimerPill 
            ref={pillRef}
            time={formatTime(remainingSeconds)} 
            progress={progress} 
            animate={false}
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
                top: `${progress * 60 + 15}%`,
                left: isMobile ? 'calc(50% + 130px)' : 'calc(50% + 100px)',
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
        ) : null}
      </div>
      </div>
    </div>
  );
}

