import os
import gi, cairo
gi.require_version('Rsvg', '2.0')
from gi.repository import Rsvg

def generate_svg(lang="en"):
    is_ru = lang == "ru"
    
    title = "АРХИТЕКТУРА СИСТЕМЫ SWITCHBACK" if is_ru else "SWITCHBACK SYSTEM ARCHITECTURE"
    subtitle = "Аппаратная изоляция ввода и конвейер разделяемой памяти" if is_ru else "Hardware input isolation &amp; low-overhead shared memory pipeline"
    
    # Card 1
    c1_title = "Физическая клавиатура (/dev/input)" if is_ru else "Physical Keyboard (/dev/input)"
    c1_desc = "Прямой поток аппаратных событий ядра Linux (evdev)" if is_ru else "Raw Linux kernel hardware event stream (evdev)"
    arrow1_text = "Только события EV_KEY • фильтрация мыши" if is_ru else "EV_KEY events only • filters out all mouse activity"
    p1_w = 340 if is_ru else 310
    
    # Card 2
    c2_title = "Фоновый демон SwitchBack (systemd --user)" if is_ru else "SwitchBack Background Daemon (systemd --user)"
    c2_desc = "Изолированный сервис пользователя • 0% CPU в простое" if is_ru else "Lightweight user service • 0% CPU when idle"
    arrow2_text = "Атомарная запись метки времени • права 0600" if is_ru else "Atomic monotonic timestamp write • RAM mode 0600"
    p2_w = 330 if is_ru else 310
    
    # Card 3
    c3_title = "Разделяемая память RAM (/dev/shm)" if is_ru else "Shared Memory RAM (/dev/shm)"
    c3_desc = "POSIX shm буфер в RAM • нулевая нагрузка на диск" if is_ru else "POSIX shm buffer in RAM • zero disk I/O, sub-microsecond latency"
    arrow3_text = "Мгновенное неблокирующее чтение без задержек" if is_ru else "Instant non-blocking read • zero IPC overhead"
    p3_w = 320 if is_ru else 290
    
    # Card 4
    c4_title = "Расширение GNOME Shell (Wayland / X11)" if is_ru else "GNOME Shell Extension (Wayland / X11)"
    c4_lines = [
        "Плавная 60 FPS отрисовка полосы индикатора (Clutter / St)" if is_ru else "Smooth 60 FPS Clutter / St custom timer indicator",
        "Безопасный автовозврат раскладки через InputSourceManager" if is_ru else "Safe layout auto-restore via InputSourceManager",
        "Мгновенная синхронизация GSettings с окном настроек GTK4" if is_ru else "Real-time GSettings synchronization with GTK4 Preferences GUI"
    ]

    p1_x = 310 - p1_w // 2
    p2_x = 310 - p2_w // 2
    p3_x = 310 - p3_w // 2

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 484" width="620" height="484">
  <defs>
    <!-- Arrow heads -->
    <marker id="arrowhead-blue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M 0 0.5 L 5 3 L 0 5.5 Z" fill="#0969da" />
    </marker>
    <marker id="arrowhead-orange" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M 0 0.5 L 5 3 L 0 5.5 Z" fill="#e95420" />
    </marker>
    <marker id="arrowhead-green" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M 0 0.5 L 5 3 L 0 5.5 Z" fill="#1a7f37" />
    </marker>
  </defs>

  <style>
    .title {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; font-weight: 700; fill: #656d76; letter-spacing: 1.5px; text-anchor: middle; }}
    .subtitle {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #8c959f; text-anchor: middle; }}
    .card-title {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; font-weight: 600; fill: #1f2328; }}
    .card-desc {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; fill: #656d76; }}
    .badge-text {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; font-weight: 600; text-anchor: middle; }}
    .list-item {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; fill: #24292f; }}
  </style>

  <!-- Container Box (Clean Light Canvas) -->
  <rect x="1" y="1" width="618" height="482" rx="12" fill="#f8fafc" stroke="#d0d7de" stroke-width="1.2" />

  <!-- Title & Header -->
  <text x="310" y="28" class="title">{title}</text>
  <text x="310" y="44" class="subtitle">{subtitle}</text>

  <!-- ==================== CARD 1: HARDWARE ==================== -->
  <g transform="translate(45, 58)">
    <rect width="530" height="52" rx="8" fill="#ffffff" stroke="#0969da" stroke-width="1.4" />
    <circle cx="28" cy="26" r="15" fill="#ddf4ff" />
    <!-- Keyboard vector icon -->
    <g transform="translate(17, 16)" stroke="#0969da" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="20" height="14" rx="2" />
      <line x1="5" y1="7" x2="7" y2="7" />
      <line x1="10" y1="7" x2="12" y2="7" />
      <line x1="15" y1="7" x2="17" y2="7" />
      <line x1="5" y1="10" x2="7" y2="10" />
      <line x1="10" y1="10" x2="12" y2="10" />
      <line x1="15" y1="10" x2="17" y2="10" />
      <line x1="7" y1="13" x2="15" y2="13" />
    </g>
    <text x="54" y="23" class="card-title">{c1_title}</text>
    <text x="54" y="39" class="card-desc">{c1_desc}</text>
  </g>

  <!-- ARROW 1 -->
  <line x1="310" y1="110" x2="310" y2="120" stroke="#0969da" stroke-width="1.5" />
  <rect x="{p1_x}" y="120" width="{p1_w}" height="20" rx="10" fill="#ffffff" stroke="#0969da" stroke-width="1.2" />
  <text x="310" y="134" class="badge-text" fill="#0969da">{arrow1_text}</text>
  <line x1="310" y1="140" x2="310" y2="149" stroke="#0969da" stroke-width="1.5" marker-end="url(#arrowhead-blue)" />

  <!-- ==================== CARD 2: DAEMON ==================== -->
  <g transform="translate(45, 150)">
    <rect width="530" height="52" rx="8" fill="#ffffff" stroke="#e95420" stroke-width="1.4" />
    <circle cx="28" cy="26" r="15" fill="#fff0eb" />
    <!-- Cog vector icon -->
    <g transform="translate(18, 16)" stroke="#e95420" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4.34 4.34l1.42 1.42 M14.24 14.24l1.42 1.42 M4.34 15.66l1.42-1.42 M14.24 5.76l1.42-1.42" />
    </g>
    <text x="54" y="23" class="card-title">{c2_title}</text>
    <text x="54" y="39" class="card-desc">{c2_desc}</text>
  </g>

  <!-- ARROW 2 -->
  <line x1="310" y1="202" x2="310" y2="212" stroke="#e95420" stroke-width="1.5" />
  <rect x="{p2_x}" y="212" width="{p2_w}" height="20" rx="10" fill="#ffffff" stroke="#e95420" stroke-width="1.2" />
  <text x="310" y="226" class="badge-text" fill="#cf4311">{arrow2_text}</text>
  <line x1="310" y1="232" x2="310" y2="241" stroke="#e95420" stroke-width="1.5" marker-end="url(#arrowhead-orange)" />

  <!-- ==================== CARD 3: SHARED MEMORY ==================== -->
  <g transform="translate(45, 242)">
    <rect width="530" height="52" rx="8" fill="#ffffff" stroke="#1a7f37" stroke-width="1.4" />
    <circle cx="28" cy="26" r="15" fill="#dafbe1" />
    <!-- Chip / RAM vector icon -->
    <g transform="translate(18, 16)" stroke="#1a7f37" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="4" width="12" height="12" rx="2" />
      <line x1="7" y1="1" x2="7" y2="4" />
      <line x1="13" y1="1" x2="13" y2="4" />
      <line x1="7" y1="16" x2="7" y2="19" />
      <line x1="13" y1="16" x2="13" y2="19" />
      <line x1="1" y1="7" x2="4" y2="7" />
      <line x1="1" y1="13" x2="4" y2="13" />
      <line x1="16" y1="7" x2="19" y2="7" />
      <line x1="16" y1="13" x2="19" y2="13" />
    </g>
    <text x="54" y="23" class="card-title">{c3_title}</text>
    <text x="54" y="39" class="card-desc">{c3_desc}</text>
  </g>

  <!-- ARROW 3 -->
  <line x1="310" y1="294" x2="310" y2="304" stroke="#1a7f37" stroke-width="1.5" />
  <rect x="{p3_x}" y="304" width="{p3_w}" height="20" rx="10" fill="#ffffff" stroke="#1a7f37" stroke-width="1.2" />
  <text x="310" y="318" class="badge-text" fill="#1a7f37">{arrow3_text}</text>
  <line x1="310" y1="324" x2="310" y2="333" stroke="#1a7f37" stroke-width="1.5" marker-end="url(#arrowhead-green)" />

  <!-- ==================== CARD 4: GNOME EXTENSION ==================== -->
  <g transform="translate(45, 334)">
    <rect width="530" height="122" rx="8" fill="#ffffff" stroke="#8250df" stroke-width="1.4" />
    <circle cx="28" cy="26" r="15" fill="#fbefff" />
    <!-- Monitor vector icon -->
    <g transform="translate(18, 16)" stroke="#8250df" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="16" height="11" rx="1.5" />
      <line x1="10" y1="14" x2="10" y2="17" />
      <line x1="6" y1="17" x2="14" y2="17" />
    </g>
    <text x="54" y="25" class="card-title">{c4_title}</text>

    <!-- Checklist / details -->
    <g transform="translate(54, 46)">
      <!-- Item 1 -->
      <circle cx="4" cy="4" r="2.5" fill="#8250df" />
      <text x="14" y="8" class="list-item">{c4_lines[0]}</text>

      <!-- Item 2 -->
      <circle cx="4" cy="26" r="2.5" fill="#8250df" />
      <text x="14" y="30" class="list-item">{c4_lines[1]}</text>

      <!-- Item 3 -->
      <circle cx="4" cy="48" r="2.5" fill="#8250df" />
      <text x="14" y="52" class="list-item">{c4_lines[2]}</text>
    </g>
  </g>
</svg>
"""
    return svg

for lang in ["en", "ru"]:
    svg_content = generate_svg(lang)
    with open(f"docs/architecture-{lang}.svg", "w", encoding="utf-8") as f:
        f.write(svg_content)
    
    handle = Rsvg.Handle.new_from_file(f"docs/architecture-{lang}.svg")
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 620, 484)
    cr = cairo.Context(surface)
    handle.render_cairo(cr)
    surface.write_to_png(f"docs/architecture-{lang}.png")
    print(f"Generated light theme docs/architecture-{lang}.svg and .png")
