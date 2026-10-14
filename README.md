<p align="right">
  <b>English 🇬🇧</b> | <a href="README.ru.md">Русский 🇷🇺</a>
</p>

# SwitchBack Ubuntu 🔄

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45%20%7C%2046%20%7C%2047%20%7C%2048%20%7C%2049%20%7C%2050%20%7C%2051-blue.svg)](https://extensions.gnome.org/)
[![Session](https://img.shields.io/badge/Session-Wayland%20%7C%20X11-success.svg)](#architecture)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-24.04%20%7C%2024.10%20%7C%2025%20%7C%2026-orange.svg)](https://ubuntu.com)
[![GitHub](https://img.shields.io/badge/Author-Romanov--E-blue?logo=github)](https://github.com/Romanov-E)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**SwitchBack Ubuntu** is an intelligent keyboard layout management extension and background daemon designed specifically for Ubuntu GNOME (Wayland & X11), inspired by the Windows utility [*Switchify*](https://github.com/JD72/Switchify) created by [JD72](https://github.com/JD72).

It provides effortless layout switching via `Caps Lock`, customizable screen indicators (single or dual synchronized bars), and automatic return to your primary language (e.g., English) after typing inactivity.

---

## ✨ Features

- ⌨️ **Caps Lock Fast Toggle (Optional):**
  - Instant layout switching on single `Caps Lock` press.
  - Can be toggled on or off directly from the preferences: when disabled, standard system shortcuts (Super+Space, Alt+Shift) work as usual.
- ⏱️ **Inactivity Auto-Return:** Automatically reverts to your primary layout (English) after you stop typing (e.g. 2–5 seconds).
- 📏 **Customizable Indicator (Single & Dual Modes):**
  - **Positions:**
    - Top (horizontal)
    - Bottom (horizontal)
    - **Top + Bottom (dual horizontal bars simultaneously)**
    - Left (vertical)
    - Right (vertical)
    - **Left + Right (dual vertical bars simultaneously)**
  - **Independent Directional Margins:** Configure custom screen margins for Top, Bottom, Left, and Right independently (in pixels).
  - **Dimensions & Style:** Thickness (1–40 px), Length (5% to 100% of screen edge), Corner radius (sharp to smooth capsule).
  - **Color & Alpha:** Full GTK Color Dialog with RGB / HEX / Opacity support.
  - **Animation Styles:** Symmetrical shrink towards the center, or towards start/end.
- 🎛️ **Prioritized Options & Flexible Modes:**
  - **Silent Mode:** Auto-switch active while indicator is turned off (runs silently in the background).
  - **Full Deactivation:** When auto-switch is disabled, the indicator is also automatically hidden.
- 🖱️ **Hardware Evdev Isolation (Zero False-Triggers):**
  - Reads hardware keystrokes directly via Linux kernel `/dev/input/event*`.
  - **Mouse moves, clicks (LMB/RMB), and scroll wheels (including dual horizontal wheels like Logitech MX Master) NEVER reset the typing timer!**
- 🛡️ **Security & Privacy by Design:**
  - **No Keylogging:** Does NOT record, log, or transmit any typed keys. It strictly reads `EV_KEY` events to update a numeric monotonic timestamp.
  - **Zero Root at Runtime:** Background daemon runs as a user service (`systemd --user`).
  - **Protected IPC:** Shared memory file in RAM (`/dev/shm/switchback_key`) is locked with `0600` permissions (owner only).
- ⚙️ **Integrated Service Management:**
  - Start, stop, enable autostart, and restart the background daemon directly from the Extension Preferences GUI!

---

## 📸 Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          Physical Keyboard (/dev/input)      │
                  └──────────────────────┬───────────────────────┘
                                         │ EV_KEY keystrokes only
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │       SwitchBack Daemon (systemd --user)     │
                  │  Filters out all mouse buttons, moves & wheels│
                  └──────────────────────┬───────────────────────┘
                                         │ Monotonic timestamp (0600)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │        Shared Memory RAM (/dev/shm)          │
                  └──────────────────────┬───────────────────────┘
                                         │ Instant zero-overhead read
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │        GNOME Shell Extension (Wayland / Mutter│
                  │    • Smooth 60 FPS Clutter / St indicator     │
                  │    • Auto-switch via InputSourceManager       │
                  │    • Live GSettings sync with GTK4 Prefs GUI  │
                  └──────────────────────────────────────────────┘
```

---

## 🚀 Installation

Clone the repository and run the automated installer:

```bash
git clone https://github.com/Romanov-E/SwitchBack-Ubuntu.git
cd SwitchBack-Ubuntu
./install.sh
```

### What `install.sh` does:
1. Validates system dependencies (`python3`, `glib-compile-schemas`, `gnome-extensions`).
2. Configures access to `/dev/input` securely for the current user (via `input` group).
3. Compiles the GSettings schema and installs the GNOME Shell extension.
4. Deploys and starts the `systemd --user` background keyboard service.
5. Enables the extension.

> ⚠️ **Note:** If you were just added to the `input` group during installation, please **Log Out** of your Ubuntu session and log back in for the kernel permissions to take effect.

---

## ⚙️ Configuration

Open the SwitchBack settings via:
- **GNOME Extensions App:** Click the gear icon ⚙️ next to **SwitchBack Ubuntu**.
- **Terminal:**
  ```bash
  gnome-extensions prefs switchback@local
  ```

All changes apply **immediately in real time** without restarting GNOME Shell.

---

## 🧹 Uninstallation

To cleanly remove SwitchBack and all its components:

```bash
cd SwitchBack-Ubuntu
./uninstall.sh
```

---

## 👏 Acknowledgments

- Inspired by the Windows utility [Switchify](https://github.com/JD72/Switchify) created by [JD72](https://github.com/JD72).

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
Author: [Romanov-E](https://github.com/Romanov-E).

---

<div align="center">

<a href="https://deepmind.google/technologies/gemini/">
  <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" width="38" height="38" alt="Gemini Sparkle" />
</a>

<br/><br/>

<a href="https://deepmind.google/technologies/gemini/">
  <img src="https://img.shields.io/badge/Assisted%20by-Google%20Gemini-8E75C2?style=flat-square&logo=google&logoColor=white" alt="Assisted by Gemini" />
</a>
&nbsp;
<a href="https://deepmind.google">
  <img src="https://img.shields.io/badge/Engineered%20with-Google%20DeepMind%20Antigravity-4285F4?style=flat-square&logo=googlecloud&logoColor=white" alt="Engineered with Antigravity" />
</a>

<br/><br/>

<p><sub>Assisted by <b>Google Gemini</b> & <b>Google DeepMind Antigravity</b></sub></p>

</div>
