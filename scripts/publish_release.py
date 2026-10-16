#!/usr/bin/env python3
import json
import os
import sys
import urllib.parse
import urllib.request

def get_token():
    if "GITHUB_TOKEN" in os.environ:
        return os.environ["GITHUB_TOKEN"]
    creds_path = os.path.expanduser("~/.git-credentials")
    if os.path.exists(creds_path):
        with open(creds_path, "r") as f:
            for line in f:
                if "github.com" in line and ":" in line and "@" in line:
                    user_pass = line.strip().split("://")[1].split("@")[0]
                    if ":" in user_pass:
                        return user_pass.split(":")[1]
    return ""

TOKEN = get_token()
OWNER = "Romanov-E"
REPO = "SwitchBack-Ubuntu"
TAG = "v2.5.0"
VERSION = "2.5.0"
RELEASE_TITLE = f"v{VERSION} — Native Ubuntu Lock HUD & Persistent Lock Badge (Фиксация раскладки)"

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(PROJECT_DIR, "dist")

RELEASE_BODY = r"""# 🚀 SwitchBack Ubuntu v2.5.0

<div align="center">
  <img src="https://raw.githubusercontent.com/Romanov-E/SwitchBack-Ubuntu/main/docs/screenshots/lock-indicator.png" width="600" alt="SwitchBack Lock and Unlock HUD Indicators" />
  <p><em>🔒 Фиксация раскладки (слева) • 🔓 Снятие блокировки (справа)</em></p>
</div>

---

## 🇷🇺 Ключевые новшества и улучшения в v2.5.0

- **🔒 Нативные индикаторы блокировки и разблокировки раскладки (Lock & Unlock HUD)**:
  - Широкие текстовые плашки заменены на аккуратные карточки уведомлений в аутентичном стиле переключателя раскладок Ubuntu (`108 × 70 px`, скругление `18 px`).
  - Чёткие символьные системные иконки:
    - `🔒` (`changes-prevent-symbolic`) при фиксации неприоритетной раскладки.
    - `🔓` (`changes-allow-symbolic`) при снятии фиксации и возврате на приоритетный язык.
  - Оптимальное расположение по высоте ($Y = 70\%$) — карточка отображается строго под системным переключателем раскладок GNOME ($Y = 50\%$) без визуального наложения.
  - Защита анимации разблокировки от обрыва системным событием смены источника ввода при возврате раскладки.

- **📌 Постоянный экранный бейдж замка (`caps-lock-hold-persistent-badge`)**:
  - Опция непрерывного отображения компактной карточки замка на экране на всё время действия блокировки.
  - Сквозной элемент (`reactive: false`) — не перехватывает клики мыши и нажатия клавиш при вводе текста.

- **🧹 Чистые края экрана при блокировке (`caps-lock-hold-hide-bars`)**:
  - Опция плавного скрытия полос обратного отсчета по краям экрана во время активной фиксации раскладки, оставляя экран чистым и не отвлекающим от работы.

- **🔔 Тумблер уведомлений блокировки (`caps-lock-hold-notify`)**:
  - Отдельный переключатель для включения или отключения OSD-уведомлений фиксации.

- **🛡️ Аппаратное устранение автоповтора клавиши Caps Lock**:
  - Фильтрация аппаратных autorepeat-событий `KEY_CAPSLOCK` в `daemon.py` и удержание 100% заполнения полосы во время нажатия клавиши. Полоса больше не дергается и не перезапускается циклами.

- **📌 Закреплённое Live Preview 16:9 и относительные отступы**:
  - Миниатюра монитора с аппаратным VSync теперь постоянно закреплена вверху вкладки «Внешний вид» и не уезжает при прокрутке настроек.
  - Наглядная пропорциональная визуализация границ отступов (верх, низ, лево, право) прямо внутри рамки превью.

- **🎨 Графический установщик GTK4 + Libadwaita (`install-gui`)**:
  - Интерактивная установка с терминальным журналом реального времени и прогресс-баром.
  - Переключатель языка интерфейса (RU / EN).
  - Запуск в один клик через `SwitchBack-Installer.desktop` или терминальной командой.

- **📐 Режимы анимации и бесшовное схождение линий**:
  - 6 стилей движения индикатора: сжатие к центру, разделение к краям, заполнение из центра, схождение от краев к центру, сжатие к началу и к концу.
  - Субпиксельная точность и направленное скругление углов без ступенек и зазоров.
  - 4 угловых Г-образных положения и режим одновременного 4-углового HUD.

- **⏱️ Тонкая настройка плавности появления и затухания**:
  - Раздельные параметры времени Fade-In (0–1000 мс) и Fade-Out (0–2000 мс).

- **🛡️ Полная поддержка GNOME Shell 45–51 и Wayland**:
  - IPC через разделяемую память `/dev/shm` без задержек и нагрузки на CPU.
  - Полная русская и английская локализация с выверенной типографикой.

### 📦 Варианты установки

#### Быстрый запуск одной командой (Рекомендуется)
Выполните в терминале для автоматического скачивания и запуска установщика:
```bash
wget -qO- https://github.com/Romanov-E/SwitchBack-Ubuntu/releases/latest/download/SwitchBack-Ubuntu-v2.5.0.tar.gz | tar xz && cd SwitchBack-Ubuntu-v2.5.0 && ./install-gui
```

#### Или распаковать архив и запустить:
- **Графический установщик (GUI):** `./install-gui` (или двойной клик по `SwitchBack-Installer.desktop`)
- **Установка через терминал (CLI):** `./install.sh`

---

## 🇬🇧 Key Features & Improvements in v2.5.0

- **🔒 Native Ubuntu-Style Lock & Unlock HUD Indicators**:
  - Replaced wide text banners with an elegant, dedicated notification card matching Ubuntu's native layout switcher styling (`108 × 70 px`, `border-radius: 18px`).
  - Crisp, prominent symbolic icons:
    - `🔒` (`changes-prevent-symbolic`) on layout lock.
    - `🔓` (`changes-allow-symbolic`) on unlock.
  - Positioned comfortably below GNOME's central layout popup ($Y = 70\%$ height), completely eliminating any visual overlap.
  - Protected unlock animation against premature disposal by GNOME input source change events.

- **📌 Persistent On-Screen Lock Badge (`caps-lock-hold-persistent-badge`)**:
  - Option to keep the discrete lock card on screen for the entire duration of the lock, providing permanent visual assurance of the locked layout.
  - Non-reactive actor (`reactive: false`): mouse clicks and typing pass through without interference.

- **🧹 Clean Screen Edges While Locked (`caps-lock-hold-hide-bars`)**:
  - Option to smoothly hide countdown indicator bars while layout is locked, keeping screen edges completely clear and distraction-free.

- **🔔 Lock Notification Toggle (`caps-lock-hold-notify`)**:
  - Independent switch to enable or disable the lock and unlock HUD notifications.

- **🛡️ Hardware Daemon Keyboard Repeat Fix**:
  - Filtered out `KEY_CAPSLOCK` from autorepeat events in `daemon.py` and maintained a frozen 100% indicator bar during key hold, completely eliminating visual bar jerking or reset loops.

- **📌 Pinned 16:9 Live Preview & Relative Margins**:
  - Pinned real-time 16:9 monitor preview stays permanently fixed at the top of the "Appearance" tab while scrolling through settings.
  - Real-time proportional edge margin visualization directly inside the monitor preview for top, bottom, left, and right offsets.

- **🎨 Modern GTK4 + Libadwaita GUI Installer (`install-gui`)**:
  - Interactive graphical installation with real-time log terminal and progress bar.
  - Multi-language switcher (RU / EN).
  - Launchable directly from terminal or by double-clicking `SwitchBack-Installer.desktop`.

- **📐 Indicator Animation Modes & Seamless Convergence**:
  - 6 motion styles: Collapse to center, split to edges, fill from center outward, converge from edges to center (`from-edges-to-center`), collapse to start, and collapse to end.
  - Sub-pixel precise alignment and directional corner radius rounding: lines converge into an unbroken solid bar without notches, gaps, or seams.
  - 4 corner L-bracket positions and simultaneous 4-corner HUD mode.

- **⏱️ Advanced Transition Timing (Libadwaita Expander)**:
  - Separate Fade-In appearance duration (`0–1000 ms`) and Fade-Out dissolution duration (`0–2000 ms`).

- **🛡️ Full GNOME Shell 45 – 51 & Wayland Support**:
  - Clean real-time `/dev/shm` shared memory IPC with zero lag and zero CPU overhead.
  - Complete English & Russian localizations with refined typography.

---

### 📦 Installation Options

#### Fast One-Line Launch (Recommended)
Run in terminal to download and launch the installer in seconds:
```bash
wget -qO- https://github.com/Romanov-E/SwitchBack-Ubuntu/releases/latest/download/SwitchBack-Ubuntu-v2.5.0.tar.gz | tar xz && cd SwitchBack-Ubuntu-v2.5.0 && ./install-gui
```

#### Or extract and run:
- **Graphical Setup (GUI):** `./install-gui` (or double-click `SwitchBack-Installer.desktop`)
- **Terminal Script (CLI):** `./install.sh`

---

### 👥 Authors & Contributors
- **Romanov E.** ([@Romanov-E](https://github.com/Romanov-E)) — Project Creator, Architect & Lead Maintainer
- **Antigravity** ([Google DeepMind](https://deepmind.google)) — Autonomous Agentic Coding Assistant & Co-Developer
"""

def create_or_get_release():
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/releases"
    headers = {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "SwitchBack-Release-Bot"
    }
    
    # Check if release already exists
    req = urllib.request.Request(f"{url}/tags/{TAG}", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"ℹ️ Release for {TAG} already exists (ID: {data['id']})")
            
            # Patch release text and title
            patch_payload = {
                "name": RELEASE_TITLE,
                "body": RELEASE_BODY
            }
            patch_req = urllib.request.Request(
                f"{url}/{data['id']}",
                data=json.dumps(patch_payload).encode("utf-8"),
                headers=headers,
                method="PATCH"
            )
            with urllib.request.urlopen(patch_req) as patch_resp:
                updated_data = json.loads(patch_resp.read().decode())
                print(f"📝 Updated release body on GitHub (ID: {updated_data['id']})")
                return updated_data
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise

    # Create new release
    payload = {
        "tag_name": TAG,
        "target_commitish": "main",
        "name": RELEASE_TITLE,
        "body": RELEASE_BODY,
        "draft": False,
        "prerelease": False
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"✅ Created release: {data['html_url']} (ID: {data['id']})")
        return data

def upload_asset(release, file_path, content_type):
    file_name = os.path.basename(file_path)
    
    # If asset already exists on release, delete it to allow re-upload
    for asset in release.get("assets", []):
        if asset.get("name") == file_name:
            asset_id = asset.get("id")
            del_url = f"https://api.github.com/repos/{OWNER}/{REPO}/releases/assets/{asset_id}"
            del_req = urllib.request.Request(
                del_url,
                headers={"Authorization": f"token {TOKEN}", "User-Agent": "SwitchBack-Release-Bot"},
                method="DELETE"
            )
            try:
                with urllib.request.urlopen(del_req) as _:
                    print(f"🗑️ Removed previous asset {file_name} (ID: {asset_id})")
            except Exception as e:
                print(f"Notice: Failed to delete previous asset {file_name}: {e}")

    upload_url_template = release["upload_url"] # e.g. https://uploads.github.com/repos/.../assets{?name,label}
    upload_url = upload_url_template.split("{")[0] + f"?name={urllib.parse.quote(file_name)}"
    
    print(f"📤 Uploading asset: {file_name}...")
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    headers = {
        "Authorization": f"token {TOKEN}",
        "Content-Type": content_type,
        "User-Agent": "SwitchBack-Release-Bot"
    }

    req = urllib.request.Request(upload_url, data=file_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"✅ Uploaded {file_name}: {data.get('browser_download_url')}")
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"❌ Failed to upload {file_name}: {e.code} {err_msg}")
        raise

def main():
    print(f"🚀 Publishing release {TAG} to GitHub...")
    release = create_or_get_release()
    
    tar_path = os.path.join(DIST_DIR, f"SwitchBack-Ubuntu-v{VERSION}.tar.gz")
    zip_path = os.path.join(DIST_DIR, f"SwitchBack-Ubuntu-v{VERSION}.zip")
    
    if os.path.exists(tar_path):
        upload_asset(release, tar_path, "application/gzip")
    if os.path.exists(zip_path):
        upload_asset(release, zip_path, "application/zip")
        
    print("\n🎉 GitHub Release published successfully!")
    print(f"🔗 Release URL: {release['html_url']}")

if __name__ == "__main__":
    main()
