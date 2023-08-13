// Pomodoro Timer logic
const timer = document.querySelector('.timer');
const startButton = document.querySelector('.start-button');
const pauseButton = document.querySelector('.pause-button');
const resetButton = document.querySelector('.reset-button');
const sessionCounter = document.querySelector('.session-counter');
const timerSlider = document.querySelector('#timer-slider');
let isRunning = false;
let countdown;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function startTimer(duration) {
    let startTime = Date.now();
    const endTime = startTime + duration * 60 * 1000;

    function updateTimer() {
        const currentTime = Date.now();
        const remainingTime = Math.max(endTime - currentTime, 0);
        const remainingSeconds = Math.round(remainingTime / 1000);
        timer.textContent = formatTime(remainingSeconds);

        if (remainingTime === 0) {
            clearInterval(countdown);
            isRunning = false;
        }
    }

    updateTimer();
    countdown = setInterval(updateTimer, 1000);
}

startButton.addEventListener('click', () => {
    if (!isRunning) {
        const timerValue = parseInt(timerSlider.value);
        startTimer(timerValue);
        isRunning = true;
    }
});

pauseButton.addEventListener('click', () => {
    clearInterval(countdown);
    isRunning = false;
});

resetButton.addEventListener('click', () => {
    clearInterval(countdown);
    isRunning = false;
    timer.textContent = formatTime(parseInt(timerSlider.value) * 60);
});

timerSlider.addEventListener('input', () => {
    if (!isRunning) {
        timer.textContent = formatTime(parseInt(timerSlider.value) * 60);
    }
});

// Initialize timer display
timer.textContent = formatTime(parseInt(timerSlider.value) * 60);
