#!/usr/bin/env bash
# ==============================================================================
# SwitchBack Ubuntu — Clean Uninstaller
# https://github.com/Romanov-E/SwitchBack-Ubuntu
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${YELLOW}${BOLD}🧹 Удаление SwitchBack Indicator... / Uninstalling SwitchBack...${NC}"

# 1. Отключение и удаление расширения
echo "1. Отключение расширения GNOME Shell..."
gnome-extensions disable switchback@local 2>/dev/null || true
rm -rf "$HOME/.local/share/gnome-shell/extensions/switchback@local"

# 2. Остановка и удаление службы
echo "2. Остановка службы systemd switchback-daemon..."
systemctl --user stop switchback-daemon.service 2>/dev/null || true
systemctl --user disable switchback-daemon.service 2>/dev/null || true
rm -f "$HOME/.config/systemd/user/switchback-daemon.service"
systemctl --user daemon-reload

# 3. Удаление файлов демона
echo "3. Удаление фонового демона..."
rm -rf "$HOME/.local/share/switchback"
rm -f /dev/shm/switchback_key

# 4. Удаление схемы GSettings
echo "4. Очистка пользовательской схемы GSettings..."
rm -f "$HOME/.local/share/glib-2.0/schemas/org.gnome.shell.extensions.switchback.gschema.xml"
if [ -d "$HOME/.local/share/glib-2.0/schemas" ]; then
    glib-compile-schemas "$HOME/.local/share/glib-2.0/schemas" 2>/dev/null || true
fi

# 5. Очистка иконки и ярлыков
echo "5. Удаление иконок и ярлыков..."
rm -f "$HOME/.local/share/icons/hicolor/scalable/apps/switchback.svg"
rm -f "$HOME/.local/share/icons/hicolor/scalable/apps/io.github.romanov_e.switchback.installer.svg"
rm -f "$HOME/.local/share/applications/io.github.romanov_e.switchback.installer.desktop"
rm -f "$HOME/.local/share/applications/switchback-settings.desktop"
rm -f "$HOME/.local/bin/switchback-settings"

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SwitchBack полностью и чисто удалён из системы!${NC}"
echo -e "${GREEN}   SwitchBack has been cleanly uninstalled.${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
