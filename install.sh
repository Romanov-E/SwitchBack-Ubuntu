#!/usr/bin/env bash
# ==============================================================================
# SwitchBack Ubuntu — Installer for Ubuntu GNOME (Wayland & X11)
# https://github.com/Romanov-E/SwitchBack-Ubuntu
# ==============================================================================

set -e

# Support GUI installer
if [ "$1" = "--gui" ] || [ "$1" = "-g" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    exec python3 "$SCRIPT_DIR/install-gui" "$@"
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}"
echo "  ███████╗██╗    ██╗██╗████████╗ ██████╗██╗  ██╗██████╗  █████╗  ██████╗██╗  ██╗"
echo "  ██╔════╝██║    ██║██║╚══██╔══╝██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝██║ ██╔╝"
echo "  ███████╗██║ █╗ ██║██║   ██║   ██║     ███████║██████╔╝███████║██║     █████╔╝ "
echo "  ╚════██║██║███╗██║██║   ██║   ██║     ██╔══██║██╔══██╗██╔══██║██║     ██╔═██╗ "
echo "  ███████║╚███╔███╔╝██║   ██║   ╚██████╗██║  ██║██████╔╝██║  ██║╚██████╗██║  ██╗"
echo "  ╚══════╝ ╚══╝╚══╝ ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${BOLD}Установка SwitchBack Indicator для Ubuntu GNOME...${NC}"
echo -e "${BOLD}Installing SwitchBack Indicator for Ubuntu GNOME...${NC}"
echo -e "${YELLOW}💡 Доступен графический установщик: ./install-gui (или ./install.sh --gui)${NC}\n"

# 1. Проверка прав (не от root)
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Не запускайте скрипт через sudo! Запустите от своего обычного пользователя:${NC}"
    echo "   ./install.sh"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 2. Проверка зависимостей
echo -e "${BLUE}🔍 Проверка системных компонентов...${NC}"
MISSING_DEPS=()
for cmd in python3 glib-compile-schemas gnome-extensions; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING_DEPS+=("$cmd")
    fi
done

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Отсутствуют необходимые пакеты: ${MISSING_DEPS[*]}${NC}"
    echo "Установка через apt..."
    sudo apt-get update && sudo apt-get install -y python3 libglib2.0-bin gnome-shell
fi

# 3. Настройка прав доступа к клавиатуре (группа input)
echo -e "${BLUE}🔑 Проверка доступа к аппаратным устройствам ввода (/dev/input)...${NC}"
NEED_LOGOUT=0
if ! groups "$USER" | grep -q "\binput\b"; then
    echo -e "${YELLOW}👉 Добавление пользователя $USER в системную группу 'input'...${NC}"
    echo "   (Требуется sudo для однократной настройки прав)"
    sudo usermod -aG input "$USER"
    NEED_LOGOUT=1
    echo -e "${GREEN}✅ Пользователь успешно добавлен в группу 'input'.${NC}"
else
    echo -e "${GREEN}✅ Пользователь уже имеет доступ к группе 'input'.${NC}"
fi

# 4. Настройка переключения раскладки по Caps Lock
echo -e "${BLUE}⌨️  Проверка переключения по Caps Lock...${NC}"
CURRENT_XKB=$(gsettings get org.gnome.desktop.input-sources xkb-options 2>/dev/null || echo "[]")
if [[ "$CURRENT_XKB" != *"grp:caps_toggle"* ]]; then
    echo "Включение переключения раскладки по клавише Caps Lock..."
    gsettings set org.gnome.desktop.input-sources xkb-options "['grp:caps_toggle']"
    echo -e "${GREEN}✅ Переключение по Caps Lock активировано.${NC}"
else
    echo -e "${GREEN}✅ Caps Lock уже настроен на переключение раскладки.${NC}"
fi

# 5. Установка и компиляция схемы GSettings
echo -e "${BLUE}⚙️  Компиляция схемы настроек GSettings...${NC}"
glib-compile-schemas "$PROJECT_DIR/extension/schemas"

USER_GLIB_DIR="$HOME/.local/share/glib-2.0/schemas"
mkdir -p "$USER_GLIB_DIR"
cp -f "$PROJECT_DIR/extension/schemas/"*.xml "$USER_GLIB_DIR/"
glib-compile-schemas "$USER_GLIB_DIR"
echo -e "${GREEN}✅ Схема настроек скомпилирована.${NC}"

# 6. Развёртывание расширения GNOME Shell
echo -e "${BLUE}🧩 Установка расширения GNOME Shell...${NC}"
EXT_TARGET="$HOME/.local/share/gnome-shell/extensions/switchback@local"
mkdir -p "$EXT_TARGET/schemas"
mkdir -p "$EXT_TARGET/locale"
mkdir -p "$EXT_TARGET/icons"

python3 "$PROJECT_DIR/scripts/compile_locales.py"

cp -f "$PROJECT_DIR/extension/metadata.json" "$EXT_TARGET/"
cp -f "$PROJECT_DIR/extension/extension.js" "$EXT_TARGET/"
cp -f "$PROJECT_DIR/extension/prefs.js" "$EXT_TARGET/"
cp -f "$PROJECT_DIR/extension/schemas/"* "$EXT_TARGET/schemas/"
cp -rf "$PROJECT_DIR/extension/locale/"* "$EXT_TARGET/locale/"
cp -f "$PROJECT_DIR/desktop/icons/switchback.svg" "$EXT_TARGET/icons/"

echo -e "${GREEN}✅ Файлы расширения, иконок и локализации установлены в $EXT_TARGET${NC}"

# 7. Развёртывание демона клавиатуры
echo -e "${BLUE}🐍 Установка демона клавиатуры...${NC}"
DAEMON_TARGET="$HOME/.local/share/switchback"
mkdir -p "$DAEMON_TARGET"

cp -f "$PROJECT_DIR/daemon/daemon.py" "$DAEMON_TARGET/daemon.py"
chmod +x "$DAEMON_TARGET/daemon.py"

# Очистка устаревших файлов
rm -f "$HOME/.local/share/applications/switchback-settings.desktop"
rm -f "$HOME/.local/bin/switchback-settings"
rm -f "$DAEMON_TARGET/switchback-settings.py"
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
fi

# 8. Настройка службы systemd --user
echo -e "${BLUE}⏱️  Регистрация службы systemd --user...${NC}"
SERVICE_TARGET_DIR="$HOME/.config/systemd/user"
mkdir -p "$SERVICE_TARGET_DIR"
cp -f "$PROJECT_DIR/daemon/switchback-daemon.service" "$SERVICE_TARGET_DIR/"

systemctl --user daemon-reload
systemctl --user enable switchback-daemon.service
systemctl --user restart switchback-daemon.service 2>/dev/null || true
echo -e "${GREEN}✅ Служба switchback-daemon.service активна.${NC}"

# 9. Установка иконки
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
mkdir -p "$ICON_DIR"
cp -f "$PROJECT_DIR/desktop/icons/switchback.svg" "$ICON_DIR/switchback.svg"
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

# 10. Активация расширения
echo -e "${BLUE}⚡ Активация расширения GNOME...${NC}"
gnome-extensions enable switchback@local 2>/dev/null || true

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}🎉 УСТАНОВКА УСПЕШНО ЗАВЕРШЕНА! / INSTALLATION COMPLETE!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "🔹 ${BOLD}Как открыть настройки:${NC}"
echo "   1. В окне «Расширения» / «Менеджер расширений» GNOME: кнопка шестерёнки ⚙️ рядом с SwitchBack"
echo "   2. Командой в терминале: gnome-extensions prefs switchback@local"
echo ""
if [ "$NEED_LOGOUT" -eq 1 ]; then
    echo -e "${YELLOW}${BOLD}⚠️  ВАЖНОЕ ПРИМЕЧАНИЕ:${NC}"
    echo -e "Вы были добавлены в группу 'input'. Чтобы права доступа к клавиатуре вступили в силу,"
    echo -e "пожалуйста, выполните ${BOLD}Выход из системы (Log Out)${NC} и войдите снова."
else
    echo -e "✅ Все компоненты настроены и готовы к работе!"
fi
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
