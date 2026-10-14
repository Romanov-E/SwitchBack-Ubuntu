import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/status/keyboard.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class SwitchBackExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._timerId = null;
        this._bars = [];
        this._sourceChangedId = null;
        this._settingsChangedId = null;
        this._lastKeyboardTime = 0;
        this._lastDaemonTs = 0;
        this._shmPath = '/dev/shm/switchback_key';

        this._loadSettings();
        this._syncCapsLockOption();

        try {
            this._ism = Keyboard.getInputSourceManager();
        } catch (e) {
            console.error('[SwitchBack] Не удалось получить InputSourceManager:', e);
            return;
        }

        this._rebuildBars();

        // Отслеживание изменений настроек на лету (Hot Reload)
        this._settingsChangedId = this._settings.connect('changed', (settings, key) => {
            this._loadSettings();
            if (key === 'caps-lock-switch-enabled') {
                this._syncCapsLockOption();
            }
            this._rebuildBars();
            if (this._isSecondaryLayout() && this._autoSwitchEnabled) {
                this._startCountdown();
            } else {
                this._stopCountdown();
            }
        });

        // Отслеживание переключения раскладки
        if (this._ism) {
            this._sourceChangedId = this._ism.connect('current-source-changed', () => {
                this._onSourceChanged();
            });
        }

        // Первичная проверка при включении
        this._onSourceChanged();
    }

    _loadSettings() {
        this._capsLockSwitchEnabled = this._settings.get_boolean('caps-lock-switch-enabled');
        this._autoSwitchEnabled = this._settings.get_boolean('auto-switch-enabled');
        this._showIndicator = this._settings.get_boolean('show-indicator');
        this._timeoutMs = Math.round(this._settings.get_double('timeout-seconds') * 1000);
        this._barPosition = this._settings.get_string('bar-position'); // 'top', 'bottom', 'top-bottom', 'left', 'right', 'left-right'

        // Направленные отступы
        this._marginTop = this._settings.get_int('margin-top');
        this._marginBottom = this._settings.get_int('margin-bottom');
        this._marginLeft = this._settings.get_int('margin-left');
        this._marginRight = this._settings.get_int('margin-right');

        this._barThickness = this._settings.get_int('bar-thickness');
        this._barLengthFraction = this._settings.get_double('bar-length-fraction');
        this._barColor = this._settings.get_string('bar-color');
        this._barRadius = this._settings.get_int('bar-radius');
        this._animationMode = this._settings.get_string('animation-mode'); // 'to-center', 'to-start', 'to-end'
        this._onlyPrimaryMonitor = this._settings.get_boolean('only-on-primary-monitor');
        this._targetSourceIndex = this._settings.get_int('switch-to-source-index');
    }

    _syncCapsLockOption() {
        try {
            const inputSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.input-sources' });
            const currentOptions = inputSettings.get_strv('xkb-options');
            const hasCapsToggle = currentOptions.includes('grp:caps_toggle');

            if (this._capsLockSwitchEnabled && !hasCapsToggle) {
                inputSettings.set_strv('xkb-options', [...currentOptions, 'grp:caps_toggle']);
            } else if (!this._capsLockSwitchEnabled && hasCapsToggle) {
                inputSettings.set_strv('xkb-options', currentOptions.filter(opt => opt !== 'grp:caps_toggle'));
            }
        } catch (e) {
            console.error('[SwitchBack] Ошибка синхронизации Caps Lock:', e);
        }
    }

    _rebuildBars() {
        this._destroyBars();

        // Если автовозврат или индикатор отключен — полосы не создаем
        if (!this._autoSwitchEnabled || !this._showIndicator) return;

        const count = (this._barPosition === 'top-bottom' || this._barPosition === 'left-right') ? 2 : 1;
        for (let i = 0; i < count; i++) {
            const bar = new St.Widget({
                reactive: false,
                visible: false,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            });
            Main.layoutManager.uiGroup.add_child(bar);
            Main.layoutManager.uiGroup.set_child_above_sibling(bar, null);
            this._bars.push(bar);
        }

        this._applyBarStyles();
    }

    _destroyBars() {
        for (const bar of this._bars) {
            try {
                bar.destroy();
            } catch (e) {}
        }
        this._bars = [];
    }

    _applyBarStyles() {
        const style =
            `background-color: ${this._barColor}; ` +
            `border-radius: ${this._barRadius}px;`;

        for (const bar of this._bars) {
            bar.set_style(style);
        }
    }

    _isSecondaryLayout() {
        if (!this._ism || !this._ism.currentSource) return false;
        return this._ism.currentSource.index !== this._targetSourceIndex;
    }

    _onSourceChanged() {
        // Если автовозврат выключен — ничего не делаем и прячем всё
        if (!this._autoSwitchEnabled) {
            this._stopCountdown();
            return;
        }

        if (this._isSecondaryLayout()) {
            this._startCountdown();
        } else {
            this._stopCountdown();
        }
    }

    _readDaemonTimestamp() {
        try {
            const [ok, contents] = GLib.file_get_contents(this._shmPath);
            if (ok) {
                const str = new TextDecoder().decode(contents).trim();
                const ts = parseInt(str, 10);
                if (!isNaN(ts)) return ts;
            }
        } catch (e) {}
        return 0;
    }

    _startCountdown() {
        this._stopCountdown();

        if (!this._autoSwitchEnabled) return;

        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        const isVertical = (this._barPosition === 'left' || this._barPosition === 'right' || this._barPosition === 'left-right');

        const now = GLib.get_monotonic_time() / 1000;
        this._lastKeyboardTime = now;
        this._lastDaemonTs = this._readDaemonTimestamp();

        // Поднимаем полосы на самый верхний Z-слой и включаем видимость
        const shouldShowBars = this._showIndicator && this._bars.length > 0;
        if (shouldShowBars) {
            for (const bar of this._bars) {
                Main.layoutManager.uiGroup.set_child_above_sibling(bar, null);
                bar.visible = true;
            }
        }

        // Базовая геометрия
        const maxLen = isVertical
            ? Math.round(monitor.height * this._barLengthFraction)
            : Math.round(monitor.width * this._barLengthFraction);

        const centerCoordinate = isVertical
            ? monitor.y + Math.round(monitor.height / 2)
            : monitor.x + Math.round(monitor.width / 2);

        // Расчёт фиксированных координат с учётом индивидуальных отступов
        const fixedCoords = [];
        if (this._barPosition === 'top') {
            fixedCoords.push(monitor.y + this._marginTop);
        } else if (this._barPosition === 'bottom') {
            fixedCoords.push(monitor.y + monitor.height - this._barThickness - this._marginBottom);
        } else if (this._barPosition === 'top-bottom') {
            fixedCoords.push(monitor.y + this._marginTop);
            fixedCoords.push(monitor.y + monitor.height - this._barThickness - this._marginBottom);
        } else if (this._barPosition === 'left') {
            fixedCoords.push(monitor.x + this._marginLeft);
        } else if (this._barPosition === 'right') {
            fixedCoords.push(monitor.x + monitor.width - this._barThickness - this._marginRight);
        } else if (this._barPosition === 'left-right') {
            fixedCoords.push(monitor.x + this._marginLeft);
            fixedCoords.push(monitor.x + monitor.width - this._barThickness - this._marginRight);
        }

        // Цикл обновления ~60 FPS (16 мс)
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
            if (!this._autoSwitchEnabled || !this._isSecondaryLayout()) {
                this._stopCountdown();
                return GLib.SOURCE_REMOVE;
            }

            const currentNow = GLib.get_monotonic_time() / 1000;

            // 1. Проверяем таймштамп аппаратной клавиатуры
            const daemonTs = this._readDaemonTimestamp();
            if (daemonTs > this._lastDaemonTs) {
                this._lastDaemonTs = daemonTs;
                this._lastKeyboardTime = currentNow; // Сброс таймера от клавиатуры
            }

            // 2. Расчёт прошедшего времени
            const timeSinceTyping = currentNow - this._lastKeyboardTime;

            if (timeSinceTyping >= this._timeoutMs) {
                this._stopCountdown();
                this._switchToPrimary();
                return GLib.SOURCE_REMOVE;
            }

            // 3. Если индикатор не требуется отрисовывать — продолжаем только логику таймера
            if (!shouldShowBars) {
                return GLib.SOURCE_CONTINUE;
            }

            // 4. Отрисовка полос
            const progress = Math.max(0, 1.0 - (timeSinceTyping / this._timeoutMs));
            const currentLen = Math.round(maxLen * progress);

            let animCoord = 0;
            if (this._animationMode === 'to-center') {
                animCoord = Math.round(centerCoordinate - (currentLen / 2));
            } else if (this._animationMode === 'to-start') {
                const startEdge = Math.round(centerCoordinate - (maxLen / 2));
                animCoord = startEdge;
            } else if (this._animationMode === 'to-end') {
                const endEdge = Math.round(centerCoordinate + (maxLen / 2));
                animCoord = endEdge - currentLen;
            }

            // Позиционируем каждую полосу
            for (let i = 0; i < this._bars.length; i++) {
                const bar = this._bars[i];
                const fixed = fixedCoords[i] ?? fixedCoords[0];
                if (isVertical) {
                    bar.set_position(fixed, animCoord);
                    bar.set_size(this._barThickness, currentLen);
                } else {
                    bar.set_position(animCoord, fixed);
                    bar.set_size(currentLen, this._barThickness);
                }
            }

            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopCountdown() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }

        for (const bar of this._bars) {
            bar.visible = false;
            bar.set_size(0, 0);
        }
    }

    _switchToPrimary() {
        if (!this._ism) return;

        const rawSources = this._ism.inputSources ?? this._ism._inputSources ?? {};
        const sources = Array.isArray(rawSources) ? rawSources : Object.values(rawSources);

        const target = sources.find(s => s && s.index === this._targetSourceIndex) || sources[0];

        if (target) {
            if (typeof target.activate === 'function') {
                target.activate();
            } else if (typeof this._ism.activateInputSource === 'function') {
                this._ism.activateInputSource(target, false);
            }
        }
    }

    disable() {
        this._stopCountdown();

        if (this._settingsChangedId && this._settings) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._sourceChangedId && this._ism) {
            this._ism.disconnect(this._sourceChangedId);
            this._sourceChangedId = null;
        }

        this._destroyBars();
        this._settings = null;
        this._ism = null;
    }
}
