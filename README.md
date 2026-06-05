# Chaotic Productivity ⚡

An offline-first, highly aesthetic productivity dashboard designed for both modern web browsers and standalone Android environments. It integrates a focused Single-Page Application (SPA) dashboard, a customized Pomodoro timer with local audio bell synthesis, a millisecond-precision stopwatch with lap comparison metrics, a prioritized To-Do list, and a universal single-file backup and restore mechanism.

## Key Features

- **Unified Responsive SPA**: Clean, distraction-free interface presenting tabs for **Dashboard**, **Pomodoro**, **Stopwatch**, **To-Do**, and **Settings**. Responsive sidebar layouts on desktop and glassmorphic bottom navbars on mobile.
- **Offline-Safe Theme Engine**: Switch seamlessly between three popular developer color palettes: **Nord** (Arctic & clean), **Gruvbox** (Retro & warm), and **Dracula** (Bold & dark). Implemented purely using custom CSS properties with zero external network resource requests (100% offline-ready).
- **Audio & Visual Pomodoro Timer**: Features an SVG circular progress ring, interactive session logs, a persistent countdown in the tab title, and high-fidelity chimes generated dynamically using the Web Audio API (no external sound file dependencies).
- **Millisecond Stopwatch**: Track activities with high-precision timekeeping, split lap records, and auto-flagging of the fastest and slowest rounds using relative color indicators.
- **Prioritized To-Do List**: Manage focus items with low/medium/high priority tags, categories (Work, Study, Personal, Other), due-date sorting, and dynamic task completion statistics. Includes a safety delete-undo toast system.
- **Universal Data Portability**: Single-file JSON backup and recovery. On web, it uses standard browser file dialogs. On Android, it leverages the Kotlin Javascript Bridge to call native Storage Access Framework dialogs.
- **Standalone Android Wrapper**: Compiles into a high-performance, lightweight Android APK wrapper around WebView, fully edge-to-edge integrated and styled to match native applications.

---

## Project Structure

```
chaotic-productivity/
├── web/                         # Dedicated directory for web assets
│   ├── index.html               # Main unified Single Page Application entry point
│   ├── theme.css                # Design tokens & color variables for Nord, Gruvbox, Dracula
│   ├── main.css                 # Main styling sheets (layouts, dashboard, buttons, cards, animations)
│   ├── main.js                  # Core SPA router, dashboard widgets, stopwatch, todo list, backup engine
│   ├── pomodoro.html            # Backup distraction-free standalone timer
│   ├── pomodoro.css             # Premium Pomodoro timer & notes components styling
│   └── pomodoro.js              # Pomodoro countdown logic, Web Audio synthesizer, wake locks
├── sync-assets.sh               # Sync script to mirror web source files into the Android assets
├── chaotic-productivity-debug.apk # Ready-to-install Compiled Android APK
└── android-app/                 # Custom Android Jetpack Compose wrapper project
    ├── app/src/main/assets/     # Offloaded web app files (synced from web/)
    └── app/src/main/java/.../   # Kotlin source code, WebView configuration, Javascript Bridge
```

---

## Getting Started

### Running in Web Browsers
Since the application is 100% offline-safe and client-side, you can run it without a local web server:
1. Open the [web/index.html](web/index.html) file in any web browser.
2. Toggle themes, log tasks, or run timers—all state is persisted in your browser's local storage.

### Synchronizing Web Assets to Android
Whenever you modify files in the root folder, mirror them to the Android project before building:
```bash
./sync-assets.sh
```

### Compiling the Android APK
The project comes preconfigured with local build paths. To compile a debug APK:
```bash
cd android-app
./gradlew assembleDebug --no-daemon
```
The compiled APK will be output to:
- `android-app/app/build/outputs/apk/debug/app-debug.apk`
- A copy is also updated in the project root: `chaotic-productivity-debug.apk`

---

## Data Schema & Portability

Backup files are exported as a structured JSON file containing all active user configurations and entries:
```json
{
  "todos": [
    {
      "id": 1717621450000,
      "title": "Modernize Android app wrapper",
      "description": "Complete Kotlin WebAppInterface integration",
      "priority": "high",
      "tag": "Work",
      "due": "2026-06-06",
      "completed": false
    }
  ],
  "focus-log": [
    {
      "timestamp": "2026-06-06T01:00:00.000Z",
      "duration": 25,
      "note": "Completed first layout sprint"
    }
  ],
  "settings": {
    "theme": "nord",
    "soundEnabled": true
  }
}
```

---

## Technical Specifications
For a deep dive into the system architecture, DOM lifecycle optimizations, Kotlin-JavaScript WebBridge serialization, and performance optimization profiles, refer to the **[TECHNICAL_THESIS.md](TECHNICAL_THESIS.md)** file.
