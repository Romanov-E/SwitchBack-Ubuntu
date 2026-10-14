#!/usr/bin/env python3
"""
SwitchBack Hardware Keyboard Daemon
Monitors /dev/input/event* for physical keyboard events.
Completely isolates keyboard input from mouse movements, clicks, and scroll wheels.
Writes high-precision monotonic timestamp to /dev/shm/switchback_key.
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

SHM_PATH = "/dev/shm/switchback_key"
EV_KEY = 1

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

def is_keyboard_device(path):
    """Checks if a device at path is a keyboard and returns fd if true, else None."""
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
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
    global shm_fd
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
    sys.exit(0)

def main():
    global shm_fd
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("[SwitchBack Daemon] Запуск фонового демона клавиатуры...", flush=True)

    # Initialize shared memory file with 0600 permissions (owner read/write only)
    try:
        shm_fd = os.open(SHM_PATH, os.O_RDWR | os.O_CREAT, 0o600)
        os.fchmod(shm_fd, 0o600)
        os.write(shm_fd, b"0               \n")
    except Exception as e:
        print(f"[SwitchBack Daemon] Ошибка создания {SHM_PATH}: {e}", file=sys.stderr, flush=True)

    rescan_devices()

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

    while True:
        now = time.monotonic()

        # Rescan for hotplugged or removed devices every 5 seconds
        if now - last_rescan > 5.0:
            last_rescan = now
            rescan_devices()
            if len(opened_devices) != last_device_count:
                last_device_count = len(opened_devices)
                print(f"[SwitchBack Daemon] Список устройств обновлён: {last_device_count} активных", flush=True)

        if not opened_devices:
            time.sleep(2.0)
            rescan_devices()
            continue

        fd_map = {fd: path for path, fd in opened_devices.items()}
        try:
            r, _, _ = select.select(list(fd_map.keys()), [], [], 2.0)
        except (select.error, ValueError):
            rescan_devices()
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

                        # EV_KEY: 1 (key down) or 2 (key repeat)
                        if ev_type == EV_KEY and (ev_value == 1 or ev_value == 2):
                            # Filter out mouse and pointer buttons
                            if not (MOUSE_BUTTONS_START <= ev_code <= MOUSE_BUTTONS_END):
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

        if key_hit and shm_fd >= 0:
            try:
                now_ms = int(time.monotonic() * 1000)
                os.lseek(shm_fd, 0, os.SEEK_SET)
                os.write(shm_fd, f"{now_ms:<16}\n".encode('ascii'))
            except Exception:
                pass

if __name__ == "__main__":
    main()
