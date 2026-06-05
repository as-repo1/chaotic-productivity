// Pomodoro Timer Module

(function() {
  // --- STATE ---
  let isRunning = false;
  let timerMode = 'focus'; // 'focus', 'short', 'long'
  let durationMinutes = 25;
  let remainingSeconds = durationMinutes * 60;
  let totalDurationSeconds = durationMinutes * 60;
  let timerInterval = null;
  let wakeLockSentinel = null;
  
  // Circumference of SVG circle (radius = 108)
  const ringCircumference = 678.6;

  // Session counter
  let sessionCount = parseInt(localStorage.getItem('productivity-session-count'), 10) || 0;

  // --- ELEMENTS ---
  const timeReadout = document.getElementById('pomodoro-time');
  const pomodoroStatus = document.getElementById('pomodoro-status');
  const startButton = document.getElementById('pomodoro-start');
  const pauseButton = document.getElementById('pomodoro-pause');
  const resetButton = document.getElementById('pomodoro-reset');
  const timerSlider = document.getElementById('timer-slider');
  const sliderVal = document.getElementById('slider-val');
  const progressCircle = document.querySelector('.progress-ring-fg');
  const timerCircleContainer = document.querySelector('.timer-circle-container');
  
  // Presets
  const presetButtons = document.querySelectorAll('.btn-preset');
  
  // Notes
  const sessionNotes = document.getElementById('session-notes');
  const saveNotesBtn = document.getElementById('save-notes-btn');
  const focusHistoryList = document.getElementById('focus-history');

  // --- TOAST HELPER (falls back to console.log) ---
  function toast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // --- WAKE LOCK ---
  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      } catch (err) {
        // Wake lock request failed (e.g., low battery, tab not visible)
        console.warn('Wake lock request failed:', err);
      }
    }
  }

  async function releaseWakeLock() {
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      } catch (err) {
        console.warn('Wake lock release failed:', err);
      }
    }
  }

  // --- TIMER GLOW MANAGEMENT ---
  function setTimerGlow(active) {
    if (!timerCircleContainer) return;
    if (active) {
      timerCircleContainer.classList.add('timer-active');
    } else {
      timerCircleContainer.classList.remove('timer-active');
    }
  }

  // --- PULSE ON COMPLETION ---
  function triggerCompletionPulse() {
    if (!timeReadout) return;
    timeReadout.classList.add('timer-complete');
    setTimeout(() => {
      timeReadout.classList.remove('timer-complete');
    }, 3000);
  }

  // --- SESSION COUNTER ---
  function incrementSessionCount() {
    sessionCount++;
    localStorage.setItem('productivity-session-count', sessionCount);
  }

  function getSessionLabel() {
    if (sessionCount > 0) {
      return `Focus Session · #${sessionCount}`;
    }
    return 'Focus Session';
  }

  // --- AUDIO SYNTHESIS ---
  function playAlarmBell() {
    const soundEnabled = localStorage.getItem('productivity-sound-enabled') !== 'false';
    if (!soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // Play three pleasant chime rings
      const times = [0, 0.4, 0.8];
      times.forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Sweet bell tone (high frequency sine with frequency modulation / decay)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + delay); // A5 note
        
        // Add a second harmonic oscillator to sound more like a bell
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, ctx.currentTime + delay); // E6 note
        
        // Envelope: sudden attack, exponential decay
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.8);
        
        gain2.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.6);

        osc.start(ctx.currentTime + delay);
        osc2.start(ctx.currentTime + delay);
        
        osc.stop(ctx.currentTime + delay + 0.9);
        osc2.stop(ctx.currentTime + delay + 0.9);
      });
    } catch (e) {
      console.warn('AudioContext failed to synthesize bell sound: ', e);
    }
  }

  // --- FORMATTING ---
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // --- PROGRESS BAR SVG ---
  function updateProgressRing() {
    if (progressCircle) {
      const percentage = remainingSeconds / totalDurationSeconds;
      const offset = ringCircumference * (1 - percentage);
      progressCircle.style.strokeDashoffset = offset;
    }
  }

  // --- TIMER LOGIC ---
  function updateTimerDisplay() {
    timeReadout.textContent = formatTime(remainingSeconds);
    
    // Update Tab Title
    const statusText = timerMode === 'focus' ? 'Focus' : 'Break';
    document.title = `[${formatTime(remainingSeconds)}] ${statusText} - Chaotic`;
    
    updateProgressRing();
    if (window.triggerQuickWidgetUpdate) {
      window.triggerQuickWidgetUpdate();
    }
  }

  function tick() {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateTimerDisplay();
    } else {
      // Completed!
      playAlarmBell();
      clearInterval(timerInterval);
      isRunning = false;

      // Remove timer glow, trigger completion pulse
      setTimerGlow(false);
      triggerCompletionPulse();

      // Release wake lock
      releaseWakeLock();
      
      // Save focus session to logs automatically if it was a focus block
      if (timerMode === 'focus') {
        incrementSessionCount();
        saveFocusSessionEntry(durationMinutes, 'Completed session without notes.');
      }
      
      toast(`Time's up! ${timerMode === 'focus' ? 'Take a break.' : 'Time to focus!'}`, 'success');
      
      // Toggle mode automatically
      if (timerMode === 'focus') {
        setTimerMode('short', 5);
      } else {
        setTimerMode('focus', 25);
      }
      
      startButton.disabled = false;
      pauseButton.disabled = true;
    }
  }

  function startTimer() {
    if (!isRunning) {
      isRunning = true;
      startButton.disabled = true;
      pauseButton.disabled = false;
      timerSlider.disabled = true; // lock custom slide changes

      // Activate timer glow
      setTimerGlow(true);

      // Request wake lock to keep screen on
      requestWakeLock();
      
      timerInterval = setInterval(tick, 1000);
    }
  }

  function pauseTimer() {
    if (isRunning) {
      isRunning = false;
      clearInterval(timerInterval);
      
      startButton.disabled = false;
      pauseButton.disabled = true;
      timerSlider.disabled = false;

      // Remove timer glow
      setTimerGlow(false);

      // Release wake lock
      releaseWakeLock();
      
      if (window.triggerQuickWidgetUpdate) {
        window.triggerQuickWidgetUpdate();
      }
    }
  }

  function resetTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    
    remainingSeconds = totalDurationSeconds;
    updateTimerDisplay();
    
    startButton.disabled = false;
    pauseButton.disabled = true;
    timerSlider.disabled = false;

    // Remove timer glow and completion pulse
    setTimerGlow(false);
    if (timeReadout) {
      timeReadout.classList.remove('timer-complete');
    }

    // Release wake lock
    releaseWakeLock();
    
    document.title = 'Chaotic Productivity';
  }

  function setTimerMode(mode, duration) {
    timerMode = mode;
    durationMinutes = duration;
    totalDurationSeconds = duration * 60;
    remainingSeconds = totalDurationSeconds;
    
    // Update active preset button styling
    presetButtons.forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update status text label with session counter
    if (mode === 'focus') {
      pomodoroStatus.textContent = getSessionLabel();
      pomodoroStatus.style.color = 'var(--accent-color)';
    } else if (mode === 'short') {
      pomodoroStatus.textContent = 'Short Break';
      pomodoroStatus.style.color = 'var(--color-success)';
    } else {
      pomodoroStatus.textContent = 'Long Break';
      pomodoroStatus.style.color = 'var(--color-info)';
    }

    // Set slider value
    timerSlider.value = durationMinutes;
    sliderVal.textContent = durationMinutes;

    resetTimer();
  }

  // --- FOCUS LOGS & NOTES ---
  function saveFocusSessionEntry(duration, notesText) {
    const focusLog = JSON.parse(localStorage.getItem('productivity-focus-log')) || [];
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      duration: duration,
      notes: notesText
    };
    
    focusLog.unshift(newEntry);
    localStorage.setItem('productivity-focus-log', JSON.stringify(focusLog));
    renderFocusHistory();
    
    // Alert parent to update dashboard figures
    if (window.triggerQuickWidgetUpdate) {
      window.triggerQuickWidgetUpdate();
    }
  }

  function deleteHistoryEntry(id) {
    let focusLog = JSON.parse(localStorage.getItem('productivity-focus-log')) || [];
    focusLog = focusLog.filter(e => e.id !== id);
    localStorage.setItem('productivity-focus-log', JSON.stringify(focusLog));
    renderFocusHistory();
  }

  function renderFocusHistory() {
    focusHistoryList.innerHTML = '';
    const focusLog = JSON.parse(localStorage.getItem('productivity-focus-log')) || [];
    
    if (focusLog.length === 0) {
      focusHistoryList.innerHTML = `<div class="text-center text-muted p-3">No focus logs recorded today</div>`;
      return;
    }

    focusLog.forEach(entry => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'note-entry-item';
      
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      entryDiv.innerHTML = `
        <div class="note-entry-header">
          <span class="note-duration">⏱️ ${entry.duration} min focus</span>
          <span class="note-time">${timeStr}</span>
        </div>
        <div class="note-content">${escapeHtml(entry.notes)}</div>
        <button class="note-delete-btn" data-id="${entry.id}">Delete</button>
      `;

      entryDiv.querySelector('.note-delete-btn').addEventListener('click', () => {
        deleteHistoryEntry(entry.id);
      });

      focusHistoryList.appendChild(entryDiv);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- INITIALIZE ---
  function initPomodoro() {
    startButton.addEventListener('click', startTimer);
    pauseButton.addEventListener('click', pauseTimer);
    resetButton.addEventListener('click', resetTimer);

    // Slider listener
    timerSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      sliderVal.textContent = val;
      if (!isRunning) {
        durationMinutes = val;
        totalDurationSeconds = val * 60;
        remainingSeconds = totalDurationSeconds;
        updateTimerDisplay();
      }
    });

    // Preset Buttons
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const duration = parseInt(btn.getAttribute('data-duration'));
        const mode = btn.getAttribute('data-mode');
        setTimerMode(mode, duration);
      });
    });

    // Save notes button
    saveNotesBtn.addEventListener('click', () => {
      const notes = sessionNotes.value.trim();
      if (!notes) {
        toast('Please write some notes before saving.', 'error');
        return;
      }
      
      // Capture current minutes or fallback to slider value
      const duration = isRunning ? Math.round((totalDurationSeconds - remainingSeconds) / 60) : durationMinutes;
      saveFocusSessionEntry(duration || 1, notes);
      
      // Clear notes field
      sessionNotes.value = '';
      toast('Focus log saved successfully!', 'success');
    });

    // Set initial display with session counter
    setTimerMode('focus', 25);
    renderFocusHistory();

    // Update progress ring stroke-dasharray to match new circumference
    if (progressCircle) {
      progressCircle.style.strokeDasharray = ringCircumference;
    }
  }

  // Expose widgets & helpers to main.js
  window.pomodoroTimerActive = function() {
    return isRunning;
  };

  window.triggerPomodoroStart = function() {
    startTimer();
  };

  // Run on dom load
  document.addEventListener('DOMContentLoaded', initPomodoro);
})();
