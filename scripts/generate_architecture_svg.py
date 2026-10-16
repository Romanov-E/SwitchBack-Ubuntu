import os

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
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1117" />
      <stop offset="100%" stop-color="#161b22" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c2128" />
      <stop offset="100%" stop-color="#181c22" />
    </linearGradient>
    <marker id="arrowhead-blue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M 0 0.5 L 5 3 L 0 5.5 Z" fill="#58a6ff" />
    </marker>
    <marker id="arrowhead-orange" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M 0 0.5 L 5 3 L 0 5.5 Z" fill="#f0883e" />
    </marker>
    <marker id="arrowhead-green" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M 0 0.5 L 5 3 L 0 5.5 Z" fill="#3fb950" />
    </marker>
  </defs>

  <style>
    .title {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; fill: #8b949e; letter-spacing: 1.5px; text-anchor: middle; }}
    .subtitle {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #6e7681; text-anchor: middle; }}
    .card-title {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; font-weight: 600; fill: #f0f6fc; }}
    .card-desc {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; fill: #8b949e; }}
    .badge-text {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; font-weight: 500; text-anchor: middle; }}
    .list-item {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; fill: #c9d1d9; }}
  </style>

  <!-- Container Box -->
  <rect x="1" y="1" width="618" height="482" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.2" />

  <!-- Title & Header -->
  <text x="310" y="28" class="title">{title}</text>
  <text x="310" y="44" class="subtitle">{subtitle}</text>

  <!-- ==================== CARD 1: HARDWARE ==================== -->
  <g transform="translate(45, 58)">
    <rect width="530" height="52" rx="8" fill="url(#cardGrad)" stroke="#388bfd" stroke-width="1.2" />
    <circle cx="28" cy="26" r="14" fill="#388bfd" fill-opacity="0.15" />
    <!-- Keyboard vector icon -->
    <g transform="translate(17, 16)" stroke="#58a6ff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
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
  <line x1="310" y1="110" x2="310" y2="120" stroke="#58a6ff" stroke-width="1.5" />
  <rect x="{p1_x}" y="120" width="{p1_w}" height="20" rx="10" fill="#1f242c" stroke="#388bfd" stroke-width="1" />
  <text x="310" y="134" class="badge-text" fill="#79c0ff">{arrow1_text}</text>
  <line x1="310" y1="140" x2="310" y2="149" stroke="#58a6ff" stroke-width="1.5" marker-end="url(#arrowhead-blue)" />

  <!-- ==================== CARD 2: DAEMON ==================== -->
  <g transform="translate(45, 150)">
    <rect width="530" height="52" rx="8" fill="url(#cardGrad)" stroke="#f0883e" stroke-width="1.2" />
    <circle cx="28" cy="26" r="14" fill="#f0883e" fill-opacity="0.15" />
    <!-- Cog vector icon -->
    <g transform="translate(18, 16)" stroke="#f0883e" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4.34 4.34l1.42 1.42 M14.24 14.24l1.42 1.42 M4.34 15.66l1.42-1.42 M14.24 5.76l1.42-1.42" />
    </g>
    <text x="54" y="23" class="card-title">{c2_title}</text>
    <text x="54" y="39" class="card-desc">{c2_desc}</text>
  </g>

  <!-- ARROW 2 -->
  <line x1="310" y1="202" x2="310" y2="212" stroke="#f0883e" stroke-width="1.5" />
  <rect x="{p2_x}" y="212" width="{p2_w}" height="20" rx="10" fill="#242121" stroke="#f0883e" stroke-width="1" />
  <text x="310" y="226" class="badge-text" fill="#ffb454">{arrow2_text}</text>
  <line x1="310" y1="232" x2="310" y2="241" stroke="#f0883e" stroke-width="1.5" marker-end="url(#arrowhead-orange)" />

  <!-- ==================== CARD 3: SHARED MEMORY ==================== -->
  <g transform="translate(45, 242)">
    <rect width="530" height="52" rx="8" fill="url(#cardGrad)" stroke="#3fb950" stroke-width="1.2" />
    <circle cx="28" cy="26" r="14" fill="#3fb950" fill-opacity="0.15" />
    <!-- Chip / RAM vector icon -->
    <g transform="translate(18, 16)" stroke="#3fb950" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
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
  <line x1="310" y1="294" x2="310" y2="304" stroke="#3fb950" stroke-width="1.5" />
  <rect x="{p3_x}" y="304" width="{p3_w}" height="20" rx="10" fill="#1b2520" stroke="#3fb950" stroke-width="1" />
  <text x="310" y="318" class="badge-text" fill="#7ee787">{arrow3_text}</text>
  <line x1="310" y1="324" x2="310" y2="333" stroke="#3fb950" stroke-width="1.5" marker-end="url(#arrowhead-green)" />

  <!-- ==================== CARD 4: GNOME EXTENSION ==================== -->
  <g transform="translate(45, 334)">
    <rect width="530" height="122" rx="8" fill="url(#cardGrad)" stroke="#d2a8ff" stroke-width="1.2" />
    <circle cx="28" cy="26" r="14" fill="#d2a8ff" fill-opacity="0.15" />
    <!-- Monitor vector icon -->
    <g transform="translate(18, 16)" stroke="#d2a8ff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="16" height="11" rx="1.5" />
      <line x1="10" y1="14" x2="10" y2="17" />
      <line x1="6" y1="17" x2="14" y2="17" />
    </g>
    <text x="54" y="25" class="card-title">{c4_title}</text>

    <!-- Checklist / details -->
    <g transform="translate(54, 46)">
      <!-- Item 1 -->
      <circle cx="4" cy="4" r="2.5" fill="#d2a8ff" />
      <text x="14" y="8" class="list-item">{c4_lines[0]}</text>

      <!-- Item 2 -->
      <circle cx="4" cy="26" r="2.5" fill="#d2a8ff" />
      <text x="14" y="30" class="list-item">{c4_lines[1]}</text>

      <!-- Item 3 -->
      <circle cx="4" cy="48" r="2.5" fill="#d2a8ff" />
      <text x="14" y="52" class="list-item">{c4_lines[2]}</text>
    </g>
  </g>
</svg>
"""
    return svg

with open("docs/architecture-en.svg", "w", encoding="utf-8") as f:
    f.write(generate_svg("en"))

with open("docs/architecture-ru.svg", "w", encoding="utf-8") as f:
    f.write(generate_svg("ru"))

print("Updated docs/architecture-en.svg and docs/architecture-ru.svg")
