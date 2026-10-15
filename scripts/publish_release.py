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
TAG = "v2.3.0"
VERSION = "2.3.0"

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(PROJECT_DIR, "dist")

RELEASE_BODY = """## 🚀 SwitchBack Ubuntu v2.3.0

### ✨ Key Features & Improvements
- **🎨 Modern GTK4 + Libadwaita GUI Installer (`install-gui`)**:
  - Interactive graphical installation with real-time log terminal and progress bar.
  - Multi-language switcher (RU / EN).
  - Launchable directly from terminal or by double-clicking `SwitchBack-Installer.desktop`.
- **📐 10 Indicator Animations & New Placement Modes**:
  - Center-to-edges expansion & edges-to-center contraction.
  - Smooth fade-in & fade-out transitions with configurable durations (50 ms – 500 ms).
  - 4 corner positions (top-left, top-right, bottom-left, bottom-right).
  - All 4 corners simultaneously mode.
- **🖥️ 16:9 Realistic Virtual Display Preview in Preferences**:
  - Enlarged 16:9 aspect ratio monitor with active bezel styling.
  - Automatic 3-cycle animation repeat when switching animation types for instant feedback.
  - Sub-pixel precise indicator and corner positioning preview.
- **🛡️ Full GNOME Shell 45 – 51 & Wayland Support**:
  - Clean real-time `/dev/shm` shared memory IPC with zero lag and zero CPU overhead.
  - Complete English & Russian localizations with refined typography.

---

### 📦 Installation Options

#### Option A: Graphical Installer (Recommended)
Download and extract `SwitchBack-Ubuntu-v2.3.0.tar.gz` or `.zip`:
```bash
./install-gui
# Or double-click "SwitchBack-Installer.desktop"
```

#### Option B: Terminal CLI
```bash
./install.sh
```

---

### 👥 Authors & Contributors
- **Evgeniy Romanov** ([@Romanov-E](https://github.com/Romanov-E)) — Project Creator, Architect & Lead Maintainer
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
            return data
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise

    # Create new release
    payload = {
        "tag_name": TAG,
        "target_commitish": "main",
        "name": f"v{VERSION} — Smooth Transitions, Corner Modes & GUI Installer",
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
        if e.code == 422:
            print(f"⚠️ Asset {file_name} might already exist: {err_msg}")
        else:
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
