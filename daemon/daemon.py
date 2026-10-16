#!/usr/bin/env python3
"""
SwitchBack Hardware Keyboard Daemon
Monitors /dev/input/event* for physical keyboard events.
Completely isolates keyboard input from mouse movements, clicks, and scroll wheels.
Writes high-precision monotonic timestamp to /dev/shm/switchback_key.
Detects Caps Lock press, hold and tap events, writing to /dev/shm/switchback_caps.
Zero file descriptor leaks, zero keylogging, zero CPU overhead.
"""

import os
import sys
import glob
import select
import struct
import time
import fcntl
import signal

try:
    import gi
    gi.require_version('Gio', '2.0')
    from gi.repository import Gio
    has_gio = True
except Exception:
    has_gio = False

SHM_PATH = "/dev/shm/switchback_key"
SHM_CAPS_PATH = "/dev/shm/switchback_caps"
EV_KEY = 1
KEY_CAPSLOCK = 58

# Linux input-event-codes mouse/pointer button range:
# BTN_LEFT (0x110 = 272) .. BTN_TASK (0x117 = 279), BTN_JOYSTICK, etc.
MOUSE_BUTTONS_START = 272
MOUSE_BUTTONS_END = 352

# Event struct format: timeval (l, l), type (H), code (H), value (i)
LONG_SIZE = struct.calcsize("l")
EVENT_FMT = "llHHi" if LONG_SIZE == 8 else "iiHHi"
EVENT_SIZE = struct.calcsize(EVENT_FMT)

opened_devices = {}
shm_fd = -1
shm_caps_fd = -1
_settings_cached = None

def get_hold_settings():
    """Reads Caps Lock hold duration and enabled status from GSettings."""
    global _settings_cached
    if not has_gio:
        return True, 0.3
    try:
        if _settings_cached is None:
            _settings_cached = Gio.Settings(schema_id='org.gnome.shell.extensions.switchback')
        enabled = _settings_cached.get_boolean('caps-lock-hold-enabled')
        duration_s = max(0.1, min(3.0, _settings_cached.get_int('caps-lock-hold-duration') / 1000.0))
        return enabled, duration_s
    except Exception:
        return True, 0.3

def write_caps_event(action, ts_ms):
    """Writes an event string into /dev/shm/switchback_caps."""
    global shm_caps_fd
    if shm_caps_fd >= 0:
        try:
            os.lseek(shm_caps_fd, 0, os.SEEK_SET)
            os.write(shm_caps_fd, f"{action} {ts_ms:<20}\n".encode('ascii'))
        except Exception:
            pass

def is_keyboard_device(path):
    """Checks if a device at path is a keyboard and returns fd if true, else None."""
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
    except OSError:
        return None

    try:
        # Check supported event types: EVIOCGBIT(0, 4)
        buf = bytearray(4)
        fcntl.ioctl(fd, 0x80044520, buf)
        ev_bits = struct.unpack("I", buf)[0]

        if ev_bits & (1 << EV_KEY):
            # Check for alphanumeric keys: EVIOCGBIT(EV_KEY, 32)
            key_buf = bytearray(32)
            fcntl.ioctl(fd, 0x80204521, key_buf)
            # Keys 16..63 (Q, W, E, R, Space, Enter, Shift, etc.)
            has_letters = (key_buf[2] != 0 or key_buf[3] != 0 or key_buf[7] != 0)
            if has_letters:
                return fd
    except Exception:
        pass

    try:
        os.close(fd)
    except Exception:
        pass
    return None

def rescan_devices():
    """Updates opened_devices dict without leaking file descriptors."""
    current_paths = set(sorted(glob.glob('/dev/input/event*')))
    existing_paths = set(opened_devices.keys())

    # 1. Close removed devices
    for removed in existing_paths - current_paths:
        try:
            os.close(opened_devices[removed])
        except Exception:
            pass
        del opened_devices[removed]

    # 2. Open new devices
    for new_path in current_paths - existing_paths:
        fd = is_keyboard_device(new_path)
        if fd is not None:
            opened_devices[new_path] = fd

def cleanup(signum=None, frame=None):
    """Graceful cleanup on shutdown."""
    global shm_fd, shm_caps_fd
    for fd in opened_devices.values():
        try:
            os.close(fd)
        except Exception:
            pass
    opened_devices.clear()
    if shm_fd >= 0:
        try:
            os.close(shm_fd)
        except Exception:
            pass
        shm_fd = -1
    if shm_caps_fd >= 0:
        try:
            os.close(shm_caps_fd)
        except Exception:
            pass
        shm_caps_fd = -1
    sys.exit(0)

def main():
    global shm_fd, shm_caps_fd
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    if hasattr(signal, 'SIGHUP'):
        signal.signal(signal.SIGHUP, cleanup)

    print("[SwitchBack Daemon] Запуск фонового демона клавиатуры...", flush=True)

    # Initialize shared memory files with 0600 permissions (owner read/write only)
    try:
        shm_fd = os.open(SHM_PATH, os.O_RDWR | os.O_CREAT, 0o600)
        os.fchmod(shm_fd, 0o600)
        os.write(shm_fd, b"0               \n")
    except Exception as e:
        print(f"[SwitchBack Daemon] Ошибка создания {SHM_PATH}: {e}", file=sys.stderr, flush=True)

    try:
        shm_caps_fd = os.open(SHM_CAPS_PATH, os.O_RDWR | os.O_CREAT, 0o600)
        os.fchmod(shm_caps_fd, 0o600)
        os.write(shm_caps_fd, b"IDLE 0                          \n")
    except Exception as e:
        print(f"[SwitchBack Daemon] Ошибка создания {SHM_CAPS_PATH}: {e}", file=sys.stderr, flush=True)

    rescan_devices()
    fd_map = {fd: path for path, fd in opened_devices.items()}

    if not opened_devices:
        print("[SwitchBack Daemon] Клавиатуры не найдены или нет доступа к /dev/input.", file=sys.stderr)
        print("  Убедитесь, что пользователь состоит в группе 'input':", file=sys.stderr)
        print("  sudo usermod -aG input $USER", file=sys.stderr, flush=True)
    else:
        print(f"[SwitchBack Daemon] Активно клавиатурных устройств: {len(opened_devices)}", flush=True)
        for p in sorted(opened_devices.keys()):
            print(f"  - {p}", flush=True)

    last_rescan = time.monotonic()
    last_device_count = len(opened_devices)

    caps_down_time = None
    caps_hold_fired = False

    while True:
        now = time.monotonic()
        now_ms = int(now * 1000)

        # 1. Check if Caps Lock hold duration threshold has been reached
        hold_enabled, hold_duration_s = get_hold_settings()
        if caps_down_time is not None and not caps_hold_fired:
            if hold_enabled and (now - caps_down_time >= hold_duration_s):
                caps_hold_fired = True
                write_caps_event("HOLD", now_ms)

        # 2. Rescan for hotplugged or removed devices every 5 seconds
        if now - last_rescan > 5.0:
            last_rescan = now
            rescan_devices()
            if len(opened_devices) != last_device_count:
                last_device_count = len(opened_devices)
                fd_map = {fd: path for path, fd in opened_devices.items()}
                print(f"[SwitchBack Daemon] Список устройств обновлён: {last_device_count} активных", flush=True)

        if not opened_devices:
            time.sleep(2.0)
            rescan_devices()
            fd_map = {fd: path for path, fd in opened_devices.items()}
            continue

        # 3. Dynamic select timeout: short while Caps Lock is held down, else 2.0s
        if caps_down_time is not None and not caps_hold_fired:
            remaining = max(0.01, hold_duration_s - (now - caps_down_time))
            select_timeout = min(0.04, remaining)
        else:
            select_timeout = 2.0

        try:
            r, _, _ = select.select(list(fd_map.keys()), [], [], select_timeout)
        except (select.error, ValueError):
            rescan_devices()
            fd_map = {fd: path for path, fd in opened_devices.items()}
            continue

        if not r:
            continue

        key_hit = False
        devices_to_remove = []

        for fd in r:
            try:
                data = os.read(fd, EVENT_SIZE * 32)
                for i in range(0, len(data) - EVENT_SIZE + 1, EVENT_SIZE):
                    chunk = data[i:i + EVENT_SIZE]
                    if len(chunk) == EVENT_SIZE:
                        vals = struct.unpack(EVENT_FMT, chunk)
                        ev_type, ev_code, ev_value = vals[-3], vals[-2], vals[-1]

                        if ev_type == EV_KEY:
                            # Caps Lock key press/release tracking
                            if ev_code == KEY_CAPSLOCK:
                                key_now = time.monotonic()
                                key_now_ms = int(key_now * 1000)
                                if ev_value == 1:
                                    caps_down_time = key_now
                                    caps_hold_fired = False
                                    write_caps_event("DOWN", key_now_ms)
                                elif ev_value == 0:
                                    if caps_hold_fired:
                                        write_caps_event("UP", key_now_ms)
                                    else:
                                        # Key released quickly: TAP event!
                                        write_caps_event("TAP", key_now_ms)
                                    caps_down_time = None
                                    caps_hold_fired = False

                            # EV_KEY: 1 (key down) or 2 (key repeat)
                            if ev_value == 1 or ev_value == 2:
                                # Filter out mouse and pointer buttons, and Caps Lock key (avoids autorepeat timer jerking)
                                if not (MOUSE_BUTTONS_START <= ev_code <= MOUSE_BUTTONS_END) and ev_code != KEY_CAPSLOCK:
                                    key_hit = True
            except OSError:
                # Device unplugged / invalid fd
                devices_to_remove.append(fd_map[fd])

        for path in devices_to_remove:
            if path in opened_devices:
                try:
                    os.close(opened_devices[path])
                except Exception:
                    pass
                del opened_devices[path]
        if devices_to_remove:
            fd_map = {fd: path for path, fd in opened_devices.items()}

        if key_hit and shm_fd >= 0:
            try:
                os.lseek(shm_fd, 0, os.SEEK_SET)
                os.write(shm_fd, f"{now_ms:<16}\n".encode('ascii'))
            except Exception:
                pass

if __name__ == "__main__":
    main()
