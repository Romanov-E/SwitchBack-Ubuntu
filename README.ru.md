<p align="right">
  <a href="README.md">English 🇬🇧</a> | <b>Русский 🇷🇺</b>
</p>

<div align="center">
  <img src="desktop/icons/switchback.svg" width="96" height="96" alt="Логотип SwitchBack Ubuntu" />
  <h1>SwitchBack Ubuntu 🔄</h1>
  <p>Расширение GNOME Shell и фоновый демон автопереключения раскладки для Ubuntu 🚀⌨️</p>

  <p>
    <a href="https://extensions.gnome.org/"><img src="https://img.shields.io/badge/GNOME%20Shell-45%20%7C%2046%20%7C%2047%20%7C%2048%20%7C%2049%20%7C%2050%20%7C%2051-blue.svg" alt="GNOME Shell" /></a>
    <a href="#архитектура"><img src="https://img.shields.io/badge/Сессия-Wayland%20%7C%20X11-success.svg" alt="Сессия" /></a>
    <a href="https://ubuntu.com"><img src="https://img.shields.io/badge/Ubuntu-24.04%20%7C%2024.10%20%7C%2025%20%7C%2026-orange.svg" alt="Ubuntu" /></a>
    <a href="https://github.com/Romanov-E"><img src="https://img.shields.io/badge/Автор-Romanov--E-blue?logo=github" alt="Автор" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/Лицензия-MIT-green.svg" alt="Лицензия: MIT" /></a>
  </p>
</div>

**SwitchBack Ubuntu** — расширение для GNOME Shell и фоновый демон для автоматического возврата на приоритетную раскладку клавиатуры в Ubuntu (Wayland и X11), созданные по мотивам утилиты [*Switchify*](https://github.com/JD72/Switchify) автора [JD72](https://github.com/JD72).

Проект добавляет переключение раскладки по нажатию `Caps Lock`, экранную полосу обратного отсчёта с гибкой кастомизацией и автоматический возврат на основной язык (например, английский) после завершения ввода.

---

## ✨ Возможности

- **Переключение по Caps Lock:** Быстрая смена языка по клавише `Caps Lock`. При отключении функции действуют стандартные системные комбинации (`Super+Пробел`, `Alt+Shift`).
- **Автовозврат при бездействии:** Переключение на приоритетную раскладку после паузы в наборе текста (от 0.5 до 30 секунд).
- **Экранный индикатор:**
  - **Расположение:** Сверху, Снизу, Парные полосы Сверху + Снизу, Слева, Справа, Парные Слева + Справа, Угловые Г-образные индикаторы (все 4 угла по отдельности и синхронно все 4 угла).
  - **Индивидуальные отступы:** Точная настройка зазоров от каждой кромки экрана в пикселях.
  - **Геометрия:** Настройка толщины (1–40 px), длины (5%–100%) и радиуса скругления углов.
  - **Цвет и прозрачность:** Поддержка системной палитры и RGBA с прозрачностью.
  - **Анимация и эффекты:** Сжатие к центру, распадение от центра к краям, заполнение от центра, сжатие к началу/концу, а также плавная настройка появления и затухания (0–800 мс).
  - **Живое 16:9 превью:** Макет монитора реальных пропорций с аппаратной синхронизацией частоты кадров (VSync).
- **Аппаратная фильтрация событий ввода:**
  - Чтение событий клавиатуры напрямую через `/dev/input/event*`.
  - Движения курсора, клики мыши и прокрутка колёсика (включая горизонтальное колесо) не сбрасывают таймер ввода.
- **Безопасность и приватность:**
  - Не выполняет запись или анализ вводимого текста. Демон фиксирует исключительно факт нажатия клавиш (`EV_KEY`) для обновления монотонной метки времени.
  - Работает в пользовательском пространстве (`systemd --user`) без root-прав.
  - Файл разделяемой памяти (`/dev/shm/switchback_key`) защищён правами `0600` (только для владельца).
- **Управление службой:** Встроенные элементы управления в окне настроек для проверки статуса, запуска, остановки и перезапуска демона.

---

## 📸 Интерфейс и анимации визуализации

### Вкладки окна настроек

<div align="center">

| Вкладка 1: Поведение | Вкладка 2: Внешний вид | Вкладка 3: Служба |
| :---: | :---: | :---: |
| <img src="docs/screenshots/tab1-behavior.png" width="280" alt="Вкладка 1: Поведение" /> | <img src="docs/screenshots/tab2-appearance.png" width="280" alt="Вкладка 2: Внешний вид" /> | <img src="docs/screenshots/tab3-service.png" width="280" alt="Вкладка 3: Служба" /> |

</div>

### Анимации визуализации индикатора на экране превью

<div align="center">

| Сверху экрана — Сжатие к центру (Белый) | Верхний правый угол — Г-образный (Ubuntu Orange) |
| :---: | :---: |
| <img src="docs/screenshots/preview-top-white.gif?v=2" width="340" alt="Сверху экрана (Белый)" /> | <img src="docs/screenshots/preview-top-right-orange.gif?v=2" width="340" alt="Верхний правый угол (Ubuntu Orange)" /> |

| Снизу экрана — К краям (Изумрудно-зелёный) | Все 4 угла экрана — HUD (Неоновый циан) |
| :---: | :---: |
| <img src="docs/screenshots/preview-bottom-green.gif?v=2" width="340" alt="Снизу экрана (Изумрудный)" /> | <img src="docs/screenshots/preview-all-corners-cyan.gif?v=2" width="340" alt="Все 4 угла экрана (Циан)" /> |

| Сверху и снизу экрана (Янтарное золото) | Слева и справа экрана (Кибер-фиолетовый) |
| :---: | :---: |
| <img src="docs/screenshots/preview-dual-amber.gif?v=2" width="340" alt="Сверху и снизу экрана" /> | <img src="docs/screenshots/preview-dual-purple.gif?v=2" width="340" alt="Слева и справа экрана" /> |

</div>

---

## 🏗️ Архитектура

```
                  ┌──────────────────────────────────────────────┐
                  │        Физическая клавиатура (/dev/input)    │
                  └──────────────────────┬───────────────────────┘
                                         │ Только события EV_KEY
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │       SwitchBack Демон (systemd --user)      │
                  │   Фильтрует клики, прокрутку и движения мыши │
                  └──────────────────────┬───────────────────────┘
                                         │ Метка времени в RAM (0600)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │          Общая память RAM (/dev/shm)         │
                  └──────────────────────┬───────────────────────┘
                                         │ Быстрое чтение без нагрузки
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │        GNOME Shell Extension (Wayland / X11) │
                  │    • 60 FPS отрисовка полосы индикатора      │
                  │    • Автовозврат через InputSourceManager    │
                  │    • Синхронизация с настройками в реальном  │
                  │      времени                                 │
                  └──────────────────────────────────────────────┘
```

---

## 🚀 Установка

Склонируйте репозиторий и выберите удобный способ установки:

```bash
git clone https://github.com/Romanov-E/SwitchBack-Ubuntu.git
cd SwitchBack-Ubuntu
```

### Способ А: Графический установщик (Рекомендуется)
Запустите графический установщик и менеджер на GTK4/Libadwaita:

```bash
./install-gui
# или: ./install.sh --gui
```
*(Также можно просто дважды кликнуть по файлу `SwitchBack-Installer.desktop` в проводнике «Файлы»)*

Позволяет выполнить установку, настроить автозапуск, перейти в настройки, а также в один клик безопасно переустановить или удалить SwitchBack в любой момент.

<div align="center">

| Экран параметров установки | Процесс установки и журнал |
| :---: | :---: |
| <img src="docs/screenshots/installer-gui.png" width="380" alt="Графический установщик SwitchBack" /> | <img src="docs/screenshots/installer-gui-progress.png" width="380" alt="Процесс установки и терминальный журнал" /> |

</div>

### Способ Б: Установка через терминал
Запустите скрипт автоматической установки:

```bash
./install.sh
```

### Действия установщика:
1. Проверяет наличие зависимостей (`python3`, `glib-compile-schemas`, `gnome-extensions`).
2. Добавляет пользователя в группу `input` для доступа к устройствам ввода без root-прав.
3. Компилирует схему GSettings и устанавливает расширение GNOME Shell.
4. Регистрирует и запускает пользовательскую службу `systemd --user`.
5. Включает расширение.

> **Примечание:** Если пользователя только что добавили в группу `input`, выполните выход из сеанса системы (Log Out) и войдите повторно.

---

## ⚙️ Настройка

Параметры открываются через:
- **Приложение «Расширения» GNOME:** Кнопка шестерёнки рядом с **SwitchBack Ubuntu**.
- **Терминал:**
  ```bash
  gnome-extensions prefs switchback@local
  ```

Изменения применяются мгновенно без перезапуска сессии GNOME Shell.

---

## 🗑️ Удаление

Для полного удаления SwitchBack и его компонентов:

```bash
cd SwitchBack-Ubuntu
./uninstall.sh
```

---

## 🙏 Благодарности

- Проект вдохновлён утилитой [Switchify](https://github.com/JD72/Switchify) для Windows автора [JD72](https://github.com/JD72).

---

## 👥 Авторы и контрибьюторы

- **Romanov E.** ([@Romanov-E](https://github.com/Romanov-E)) — Автор проекта и ведущий разработчик
- **Antigravity** ([Google DeepMind](https://deepmind.google)) — AI Pair Programmer & Соавтор (системная архитектура, модуль перехвата ввода `/dev/input`, математика анимаций, расширение GNOME Shell и дизайн UI/UX)

---

## 📄 Лицензия

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
Авторы: [Romanov-E](https://github.com/Romanov-E) и контрибьюторы.

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

<p><sub>Разработано при содействии <b>Google Gemini</b> & <b>Google DeepMind Antigravity</b></sub></p>

</div>
