// Chaotic Productivity - Main App JS

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE VARIABLES ---
  let activeTab = 'dashboard';
  let todos = JSON.parse(localStorage.getItem('productivity-todos')) || [];
  let focusLog = JSON.parse(localStorage.getItem('productivity-focus-log')) || [];
  let stopwatchState = JSON.parse(localStorage.getItem('productivity-stopwatch')) || {
    running: false,
    startTime: 0,
    elapsedTime: 0,
    laps: []
  };

  // Stopwatch ticking interval
  let stopwatchInterval = null;

  // Undo-delete state
  let lastDeletedTask = null;
  let deleteUndoTimeout = null;

  // --- HAPTIC FEEDBACK UTILITY ---
  function haptic() {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  // --- TOAST NOTIFICATION SYSTEM ---
  let toastContainer = null;

  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        padding: 16px;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(message, type = 'info', options = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Color mapping
    const colors = {
      success: { bg: '#2ea043', text: '#ffffff' },
      error: { bg: '#d73a49', text: '#ffffff' },
      info: { bg: 'var(--accent-color)', text: '#ffffff' }
    };
    const color = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${color.bg};
      color: ${color.text};
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 500;
      font-family: inherit;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      transform: translateX(120%);
      transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease;
      opacity: 0;
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 360px;
      word-break: break-word;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    `;

    // Message span
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    // Optional undo button
    if (options.undoCallback) {
      const undoBtn = document.createElement('button');
      undoBtn.textContent = 'Undo';
      undoBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.25);
        color: inherit;
        border: 1px solid rgba(255, 255, 255, 0.4);
        padding: 4px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        font-family: inherit;
        white-space: nowrap;
        transition: background 0.2s ease;
      `;
      undoBtn.addEventListener('mouseenter', () => {
        undoBtn.style.background = 'rgba(255, 255, 255, 0.4)';
      });
      undoBtn.addEventListener('mouseleave', () => {
        undoBtn.style.background = 'rgba(255, 255, 255, 0.25)';
      });
      undoBtn.addEventListener('click', () => {
        options.undoCallback();
        dismissToast(toast);
      });
      toast.appendChild(undoBtn);
    }

    container.appendChild(toast);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
      });
    });

    // Auto-dismiss after duration
    const duration = options.duration || 3000;
    const autoDismiss = setTimeout(() => {
      dismissToast(toast);
    }, duration);

    toast._autoDismiss = autoDismiss;
    return toast;
  }

  function dismissToast(toast) {
    if (toast._dismissed) return;
    toast._dismissed = true;
    clearTimeout(toast._autoDismiss);

    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }

  // Expose globally for pomodoro.js
  window.showToast = showToast;

  // --- SMOOTH NUMBER ANIMATION ---
  function animateNumber(element, targetValue, suffix = '', duration = 400) {
    const currentText = element.textContent;
    const currentMatch = currentText.match(/(\d+)/);
    const startValue = currentMatch ? parseInt(currentMatch[1], 10) : 0;

    if (startValue === targetValue) {
      element.textContent = targetValue + suffix;
      return;
    }

    const startTime = performance.now();
    const diff = targetValue - startValue;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * eased);
      element.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // --- META THEME COLOR ---
  function updateMetaThemeColor(themeName) {
    const themeColors = {
      nord: '#2e3440',
      gruvbox: '#1d2021',
      dracula: '#1e1f29'
    };
    const color = themeColors[themeName] || themeColors.nord;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }

  // --- ELEMENT REFERENCES ---
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const contentArea = document.querySelector('.content-area');
  
  // Dashboard Elements
  const dashboardDate = document.getElementById('dashboard-date');
  const statFocusSessions = document.getElementById('stat-focus-sessions');
  const statFocusTime = document.getElementById('stat-focus-time');
  const statTodoProgress = document.getElementById('stat-todo-progress');
  const todoProgressBar = document.getElementById('todo-progress-bar');
  const statTodoCount = document.getElementById('stat-todo-count');
  const statActiveGoal = document.getElementById('stat-active-goal');
  const statActiveGoalDesc = document.getElementById('stat-active-goal-desc');
  const quickStartPomodoro = document.getElementById('quick-start-pomodoro');
  const quickStartStopwatch = document.getElementById('quick-start-stopwatch');
  const quickViewTodo = document.getElementById('quick-view-todo');
  const quickWidget = document.getElementById('quick-widget');
  const portfolioLink = document.getElementById('portfolio-link');

  // Stopwatch Elements
  const stopwatchTime = document.getElementById('stopwatch-time');
  const stopwatchStart = document.getElementById('stopwatch-start');
  const stopwatchPause = document.getElementById('stopwatch-pause');
  const stopwatchLap = document.getElementById('stopwatch-lap');
  const stopwatchReset = document.getElementById('stopwatch-reset');
  const stopwatchLapsContainer = document.getElementById('stopwatch-laps');
  const lapCountLabel = document.getElementById('lap-count-label');
  const stopwatchStatus = document.getElementById('stopwatch-status');

  // To-Do Elements
  const todoForm = document.getElementById('todo-form');
  const todoTitle = document.getElementById('todo-title');
  const todoDescription = document.getElementById('todo-description');
  const todoPriority = document.getElementById('todo-priority');
  const todoTag = document.getElementById('todo-tag');
  const todoDue = document.getElementById('todo-due');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskListContainer = document.getElementById('task-list');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const taskCounter = document.getElementById('task-counter');
  const todoEmpty = document.getElementById('todo-empty');
  let currentFilter = 'all';

  // Settings Elements
  const themeButtons = document.querySelectorAll('.theme-card');
  const soundToggle = document.getElementById('sound-toggle');
  const btnExportBackup = document.getElementById('btn-export-backup');
  const btnImportBackupTrigger = document.getElementById('btn-import-backup-trigger');
  const importFileInput = document.getElementById('import-file-input');

  // --- STOPWATCH STATUS LABEL ---
  function updateStopwatchStatus(state) {
    if (!stopwatchStatus) return;
    stopwatchStatus.classList.remove('status-running', 'status-paused');
    switch (state) {
      case 'running':
        stopwatchStatus.textContent = 'Running';
        stopwatchStatus.classList.add('status-running');
        break;
      case 'paused':
        stopwatchStatus.textContent = 'Paused';
        stopwatchStatus.classList.add('status-paused');
        break;
      default:
        stopwatchStatus.textContent = 'Ready';
        break;
    }
  }

  // --- TASK COUNTER ---
  function updateTaskCounter() {
    if (!taskCounter) return;
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    if (total === 0) {
      taskCounter.textContent = '0 tasks';
    } else if (completed > 0) {
      taskCounter.textContent = `${total} task${total === 1 ? '' : 's'} · ${completed} completed`;
    } else {
      taskCounter.textContent = `${total} task${total === 1 ? '' : 's'}`;
    }
  }

  // --- ROUTING / TAB SYSTEM ---
  function switchTab(targetTabId) {
    activeTab = targetTabId;
    
    // Update active nav button
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-target') === targetTabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Remove .active from all panels first
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
    });

    // On next frame, add .active to the target panel for clean CSS animation
    requestAnimationFrame(() => {
      tabPanels.forEach(panel => {
        if (panel.id === targetTabId) {
          panel.classList.add('active');
        }
      });
    });

    // Smooth scroll content area to top
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Custom callbacks per tab activation
    if (targetTabId === 'dashboard') {
      updateDashboardStats();
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      haptic();
      switchTab(btn.getAttribute('data-target'));
    });
  });

  // Dashboard quick triggers
  quickStartPomodoro.addEventListener('click', () => {
    haptic();
    switchTab('pomodoro');
    // Start pomodoro timer directly if not already running
    if (typeof window.triggerPomodoroStart === 'function') {
      window.triggerPomodoroStart();
    }
  });

  quickStartStopwatch.addEventListener('click', () => {
    haptic();
    switchTab('stopwatch');
  });

  quickViewTodo.addEventListener('click', () => {
    haptic();
    switchTab('todo');
  });

  // Portfolio Link - Open GitHub profile directly
  portfolioLink.addEventListener('click', (e) => {
    e.preventDefault();
    haptic();
    window.open('https://github.com/as-repo1', '_blank');
  });

  // --- SMART DATE FORMATTING ---
  function getSmartDateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greeting;
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    return `${greeting}, Today is ${dateStr}`;
  }

  // --- DASHBOARD UPDATES ---
  function updateDashboardStats() {
    // Smart date with greeting
    dashboardDate.textContent = getSmartDateGreeting();

    // Focus Sessions stats
    focusLog = JSON.parse(localStorage.getItem('productivity-focus-log')) || [];
    const totalSessions = focusLog.length;
    const totalMinutes = focusLog.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    // Animate focus session count
    animateNumber(statFocusSessions, totalSessions, ` session${totalSessions === 1 ? '' : 's'}`);
    statFocusTime.textContent = `${totalMinutes} total focus minute${totalMinutes === 1 ? '' : 's'}`;

    // Tasks progress
    const totalTasks = todos.length;
    const completedTasks = todos.filter(t => t.completed).length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Animate percentage
    animateNumber(statTodoProgress, percentage, '%');
    todoProgressBar.style.width = `${percentage}%`;
    statTodoCount.textContent = `${completedTasks} of ${totalTasks} task${totalTasks === 1 ? '' : 's'} completed`;

    // Active Goal (High priority uncompleted task)
    const activeTasks = todos.filter(t => !t.completed);
    if (activeTasks.length > 0) {
      // Sort: High priority first, then medium, then low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      activeTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      const primaryGoal = activeTasks[0];
      
      // Determine priority color stripe
      const pColor = primaryGoal.priority === 'high' ? 'var(--color-danger)' : (primaryGoal.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-success)');
      
      // Render interactive goal block with checkbox
      statActiveGoal.innerHTML = `
        <div class="dashboard-goal-container" style="display:flex; align-items:center; gap: 12px; margin-top: 6px; width: 100%; border-left: 3px solid ${pColor}; padding-left: 8px;">
          <input type="checkbox" id="dashboard-goal-checkbox" class="task-checkbox" data-id="${primaryGoal.id}" style="width: 22px; height: 22px; flex-shrink: 0;">
          <span style="font-size: 1.2rem; line-height: 1.25; font-weight: 600; text-align: left; word-break: break-word; color: var(--text-primary);">${primaryGoal.title}</span>
        </div>
      `;
      statActiveGoal.style.color = 'inherit';
      
      const dueLabel = primaryGoal.due ? `<span style="font-size: 0.75rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; margin-left: 5px;">📅 ${primaryGoal.due}</span>` : '';
      
      statActiveGoalDesc.innerHTML = `
        <span class="badge badge-priority-${primaryGoal.priority}">${primaryGoal.priority}</span>
        <span class="badge badge-tag">${primaryGoal.tag}</span>
        ${dueLabel}
        ${primaryGoal.description ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; max-width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${primaryGoal.description}</div>` : ''}
      `;

      // Attach complete event listener
      const checkbox = document.getElementById('dashboard-goal-checkbox');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          haptic();
          if (typeof window.showToast === 'function') {
            window.showToast('Goal completed! Keep going! ⚡', 'success');
          }
          // Slight delay to allow animation to show
          setTimeout(() => {
            toggleTaskCompletion(primaryGoal.id);
          }, 250);
        });
      }
    } else {
      statActiveGoal.innerHTML = 'No active tasks';
      statActiveGoal.style.color = 'var(--text-muted)';
      statActiveGoalDesc.textContent = 'Create a task in your To-Do list to get started!';
    }
  }

  // --- PRECISION STOPWATCH ---
  function formatStopwatchTime(ms) {
    let milliseconds = Math.floor((ms % 1000) / 10);
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / (1000 * 60)) % 60);
    let hours = Math.floor((ms / (1000 * 60 * 60)));

    milliseconds = milliseconds < 10 ? '0' + milliseconds : milliseconds;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    hours = hours < 10 ? '0' + hours : hours;

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  function startStopwatch() {
    stopwatchState.running = true;
    stopwatchState.startTime = Date.now() - stopwatchState.elapsedTime;
    
    stopwatchStart.disabled = true;
    stopwatchPause.disabled = false;
    stopwatchLap.disabled = false;

    updateStopwatchStatus('running');
    saveStopwatchState();

    stopwatchInterval = setInterval(() => {
      stopwatchState.elapsedTime = Date.now() - stopwatchState.startTime;
      stopwatchTime.textContent = formatStopwatchTime(stopwatchState.elapsedTime);
      updateQuickWidget();
    }, 33);
  }

  function pauseStopwatch() {
    stopwatchState.running = false;
    clearInterval(stopwatchInterval);
    
    stopwatchStart.disabled = false;
    stopwatchPause.disabled = true;
    stopwatchLap.disabled = true;

    updateStopwatchStatus('paused');
    saveStopwatchState();
    updateQuickWidget();
  }

  function resetStopwatch() {
    stopwatchState.running = false;
    stopwatchState.elapsedTime = 0;
    stopwatchState.laps = [];
    clearInterval(stopwatchInterval);
    
    stopwatchTime.textContent = '00:00:00.00';
    stopwatchStart.disabled = false;
    stopwatchPause.disabled = true;
    stopwatchLap.disabled = true;

    updateStopwatchStatus('ready');
    saveStopwatchState();
    renderLaps();
    updateQuickWidget();
  }

  function recordLap() {
    haptic();
    const totalTime = stopwatchState.elapsedTime;
    let lapTime = totalTime;
    
    if (stopwatchState.laps.length > 0) {
      const lastLapTotal = stopwatchState.laps[0].totalTime;
      lapTime = totalTime - lastLapTotal;
    }
    
    stopwatchState.laps.unshift({
      id: Date.now(),
      lapIndex: stopwatchState.laps.length + 1,
      lapTime: lapTime,
      totalTime: totalTime
    });

    saveStopwatchState();
    renderLaps();
  }

  function renderLaps() {
    stopwatchLapsContainer.innerHTML = '';
    
    if (stopwatchState.laps.length === 0) {
      lapCountLabel.textContent = 'No laps recorded';
      return;
    }
    
    lapCountLabel.textContent = `${stopwatchState.laps.length} Lap${stopwatchState.laps.length === 1 ? '' : 's'} recorded`;

    // Find fastest and slowest laps
    let fastestIndex = -1;
    let slowestIndex = -1;
    if (stopwatchState.laps.length > 1) {
      let minTime = Infinity;
      let maxTime = -Infinity;
      
      stopwatchState.laps.forEach((lap, idx) => {
        if (lap.lapTime < minTime) {
          minTime = lap.lapTime;
          fastestIndex = idx;
        }
        if (lap.lapTime > maxTime) {
          maxTime = lap.lapTime;
          slowestIndex = idx;
        }
      });
    }

    stopwatchState.laps.forEach((lap, idx) => {
      const lapDiv = document.createElement('div');
      lapDiv.className = 'lap-item';
      if (idx === fastestIndex) lapDiv.classList.add('fastest');
      if (idx === slowestIndex) lapDiv.classList.add('slowest');

      const splitText = idx === fastestIndex ? ' (Fastest)' : (idx === slowestIndex ? ' (Slowest)' : '');
      
      lapDiv.innerHTML = `
        <span class="lap-number">Lap ${lap.lapIndex}${splitText}</span>
        <span>${formatStopwatchTime(lap.lapTime)}</span>
        <span class="text-muted">${formatStopwatchTime(lap.totalTime)}</span>
      `;
      stopwatchLapsContainer.appendChild(lapDiv);
    });
  }

  function saveStopwatchState() {
    localStorage.setItem('productivity-stopwatch', JSON.stringify(stopwatchState));
  }

  function initStopwatch() {
    stopwatchTime.textContent = formatStopwatchTime(stopwatchState.elapsedTime);
    renderLaps();

    stopwatchStart.addEventListener('click', () => {
      haptic();
      startStopwatch();
    });
    stopwatchPause.addEventListener('click', () => {
      haptic();
      pauseStopwatch();
    });
    stopwatchLap.addEventListener('click', recordLap);
    stopwatchReset.addEventListener('click', () => {
      haptic();
      resetStopwatch();
    });

    if (stopwatchState.running) {
      // Resume running stopwatch
      stopwatchState.startTime = Date.now() - stopwatchState.elapsedTime;
      stopwatchStart.disabled = true;
      stopwatchPause.disabled = false;
      stopwatchLap.disabled = false;
      updateStopwatchStatus('running');
      
      stopwatchInterval = setInterval(() => {
        stopwatchState.elapsedTime = Date.now() - stopwatchState.startTime;
        stopwatchTime.textContent = formatStopwatchTime(stopwatchState.elapsedTime);
        updateQuickWidget();
      }, 33);
    } else if (stopwatchState.elapsedTime > 0) {
      updateStopwatchStatus('paused');
    } else {
      updateStopwatchStatus('ready');
    }
  }

  // --- TO-DO TASK MANAGER ---
  function saveTodos() {
    localStorage.setItem('productivity-todos', JSON.stringify(todos));
    updateDashboardStats();
  }

  function addTask() {
    const title = todoTitle.value.trim();
    if (!title) return;

    haptic();

    const newTask = {
      id: Date.now(),
      title: title,
      description: todoDescription.value.trim(),
      priority: todoPriority.value,
      tag: todoTag.value,
      due: todoDue.value || null,
      completed: false
    };

    todos.push(newTask);
    saveTodos();
    renderTasks();
    
    // Reset form
    todoTitle.value = '';
    todoDescription.value = '';
    todoPriority.value = 'medium';
    todoTag.value = 'Work';
    todoDue.value = '';

    showToast('Task created', 'success');
  }

  function toggleTaskCompletion(id) {
    haptic();
    todos = todos.map(t => {
      if (t.id === id) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });
    saveTodos();
    renderTasks();
  }

  function deleteTask(id) {
    haptic();

    // Find the task before removing
    const taskToDelete = todos.find(t => t.id === id);
    const taskIndex = todos.indexOf(taskToDelete);

    // Remove from array
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTasks();

    // Cancel any previous undo timeout
    if (deleteUndoTimeout) {
      clearTimeout(deleteUndoTimeout);
      deleteUndoTimeout = null;
    }

    // Store for potential undo
    lastDeletedTask = { task: taskToDelete, index: taskIndex };

    // Show toast with undo
    showToast('Task deleted', 'info', {
      duration: 5000,
      undoCallback: () => {
        if (lastDeletedTask && lastDeletedTask.task) {
          // Restore task at original position
          todos.splice(lastDeletedTask.index, 0, lastDeletedTask.task);
          saveTodos();
          renderTasks();
          lastDeletedTask = null;
          showToast('Task restored', 'success');
        }
      }
    });

    // Clear undo data after 5 seconds
    deleteUndoTimeout = setTimeout(() => {
      lastDeletedTask = null;
    }, 5500);
  }

  function renderTasks() {
    taskListContainer.innerHTML = '';
    
    let filteredTasks = todos;
    if (currentFilter === 'active') {
      filteredTasks = todos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
      filteredTasks = todos.filter(t => t.completed);
    }

    // Sort priority: High -> Medium -> Low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Update task counter
    updateTaskCounter();

    if (filteredTasks.length === 0) {
      // Show empty state element if it exists, otherwise inject text
      if (todoEmpty) {
        todoEmpty.style.display = 'flex';
      } else {
        taskListContainer.innerHTML = `<div class="text-center text-muted p-4">No tasks found</div>`;
      }
      return;
    }

    // Hide empty state when there are tasks
    if (todoEmpty) {
      todoEmpty.style.display = 'none';
    }

    filteredTasks.forEach(task => {
      const taskDiv = document.createElement('div');
      taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
      
      const dueLabel = task.due ? `<span class="task-due">📅 ${task.due}</span>` : '';
      
      taskDiv.innerHTML = `
        <div class="task-checkbox-container">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
        </div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
          <div class="task-meta">
            <span class="badge badge-priority-${task.priority}">${task.priority}</span>
            <span class="badge badge-tag">${task.tag}</span>
            ${dueLabel}
          </div>
        </div>
        <button class="task-delete-btn" data-id="${task.id}" title="Delete Task">
          <svg viewBox="0 0 24 24" class="task-delete-icon"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      `;

      // Event listeners inside dynamic items
      taskDiv.querySelector('.task-checkbox').addEventListener('change', () => {
        toggleTaskCompletion(task.id);
      });

      taskDiv.querySelector('.task-delete-btn').addEventListener('click', () => {
        deleteTask(task.id);
      });

      taskListContainer.appendChild(taskDiv);
    });
  }

  function initTodo() {
    addTaskBtn.addEventListener('click', () => {
      haptic();
      addTask();
    });
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        haptic();
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        renderTasks();
      });
    });

    renderTasks();
  }

  // --- SETTINGS, THEMES & BACKUP/RESTORE ---
  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('productivity-theme', themeName);
    
    // Sync meta theme-color for Android status bar
    updateMetaThemeColor(themeName);

    // Toggle active classes on theme buttons
    themeButtons.forEach(btn => {
      if (btn.getAttribute('data-theme') === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function initSettings() {
    // Sound settings
    const savedSound = localStorage.getItem('productivity-sound-enabled');
    if (savedSound !== null) {
      soundToggle.checked = savedSound === 'true';
    }
    soundToggle.addEventListener('change', () => {
      localStorage.setItem('productivity-sound-enabled', soundToggle.checked);
    });

    // Theme switching buttons
    const activeTheme = localStorage.getItem('productivity-theme') || 'nord';
    applyTheme(activeTheme);

    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        haptic();
        applyTheme(btn.getAttribute('data-theme'));
      });
    });

    // Backup Export Trigger
    btnExportBackup.addEventListener('click', () => {
      haptic();
      const backupData = {
        todos: localStorage.getItem('productivity-todos') || '[]',
        focusLog: localStorage.getItem('productivity-focus-log') || '[]',
        theme: localStorage.getItem('productivity-theme') || 'nord',
        sound: localStorage.getItem('productivity-sound-enabled') || 'true'
      };

      const backupString = JSON.stringify(backupData);

      // Check if running inside Android APK WebView
      if (typeof window.AndroidBridge !== 'undefined' && typeof window.AndroidBridge.exportBackup === 'function') {
        window.AndroidBridge.exportBackup(backupString);
      } else {
        // Standard browser download
        const blob = new Blob([backupString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `chaotic-productivity-backup-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      showToast('Backup exported', 'success');
    });

    // Backup Import Trigger
    btnImportBackupTrigger.addEventListener('click', () => {
      haptic();
      if (typeof window.AndroidBridge !== 'undefined' && typeof window.AndroidBridge.importBackup === 'function') {
        window.AndroidBridge.importBackup();
      } else {
        importFileInput.click();
      }
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        window.restoreBackup(evt.target.result);
      };
      reader.readAsText(file);
    });
  }

  // GLOBAL RESTORE BACKUP FUNCTION - Called by both browser file reader and Android bridge!
  window.restoreBackup = function(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Basic structure validation
      if (data.todos) localStorage.setItem('productivity-todos', data.todos);
      if (data.focusLog) localStorage.setItem('productivity-focus-log', data.focusLog);
      if (data.theme) localStorage.setItem('productivity-theme', data.theme);
      if (data.sound) localStorage.setItem('productivity-sound-enabled', data.sound);

      showToast('Productivity data restored successfully! Reloading...', 'success', { duration: 2000 });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      showToast('Failed to restore backup: Invalid data format.', 'error');
      console.error(err);
    }
  };

  // --- QUICK ACTIVE TIMER WIDGET (ON HOME SCREEN) ---
  function updateQuickWidget() {
    const isPomoRunning = window.pomodoroTimerActive && window.pomodoroTimerActive();
    
    if (isPomoRunning) {
      quickWidget.classList.add('active');
      quickWidget.innerHTML = `
        <span class="widget-dot" style="color: var(--color-danger)">●</span>
        <span>Focus Session: ${document.getElementById('pomodoro-time').textContent}</span>
      `;
    } else if (stopwatchState.running) {
      quickWidget.classList.add('active');
      // Format simple readout
      const seconds = Math.floor(stopwatchState.elapsedTime / 1000) % 60;
      const minutes = Math.floor(stopwatchState.elapsedTime / (1000 * 60)) % 60;
      const hours = Math.floor(stopwatchState.elapsedTime / (1000 * 60 * 60));
      const text = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
      
      quickWidget.innerHTML = `
        <span class="widget-dot" style="color: var(--color-success)">●</span>
        <span>Stopwatch: ${text}</span>
      `;
    } else {
      quickWidget.classList.remove('active');
      quickWidget.innerHTML = `<span class="widget-label">No Active Timer</span>`;
    }
  }

  // Listen to widget click to jump directly to active running screen
  quickWidget.addEventListener('click', () => {
    haptic();
    const isPomoRunning = window.pomodoroTimerActive && window.pomodoroTimerActive();
    if (isPomoRunning) {
      switchTab('pomodoro');
    } else if (stopwatchState.running) {
      switchTab('stopwatch');
    }
  });

  // Make the widget update visible globally
  window.triggerQuickWidgetUpdate = updateQuickWidget;

  // --- INITIALIZE ALL MODULES ---
  initStopwatch();
  initTodo();
  initSettings();
  updateDashboardStats();
  
  // Timer widget updates periodically
  setInterval(updateQuickWidget, 1000);
});
