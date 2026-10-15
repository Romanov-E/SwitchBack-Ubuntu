import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/status/keyboard.js';
function getArmsForPosition(pos, monitor, fraction, thickness, margins) {
    const { top: mTop, bottom: mBottom, left: mLeft, right: mRight } = margins;
    const hMaxLen = Math.max(8, Math.round(monitor.width * fraction));
    const vMaxLen = Math.max(8, Math.round(monitor.height * fraction));
    const t = thickness;

    const arms = [];

    const addTopLeft = () => {
        arms.push({ isVertical: false, fixedCoord: monitor.y + mTop, start: monitor.x + mLeft, end: monitor.x + mLeft + hMaxLen });
        arms.push({ isVertical: true, fixedCoord: monitor.x + mLeft, start: monitor.y + mTop, end: monitor.y + mTop + vMaxLen });
    };

    const addTopRight = () => {
        arms.push({ isVertical: false, fixedCoord: monitor.y + mTop, start: monitor.x + monitor.width - mRight - hMaxLen, end: monitor.x + monitor.width - mRight });
        arms.push({ isVertical: true, fixedCoord: monitor.x + monitor.width - mRight - t, start: monitor.y + mTop, end: monitor.y + mTop + vMaxLen });
    };

    const addBottomLeft = () => {
        arms.push({ isVertical: false, fixedCoord: monitor.y + monitor.height - mBottom - t, start: monitor.x + mLeft, end: monitor.x + mLeft + hMaxLen });
        arms.push({ isVertical: true, fixedCoord: monitor.x + mLeft, start: monitor.y + monitor.height - mBottom - vMaxLen, end: monitor.y + monitor.height - mBottom });
    };

    const addBottomRight = () => {
        arms.push({ isVertical: false, fixedCoord: monitor.y + monitor.height - mBottom - t, start: monitor.x + monitor.width - mRight - hMaxLen, end: monitor.x + monitor.width - mRight });
        arms.push({ isVertical: true, fixedCoord: monitor.x + monitor.width - mRight - t, start: monitor.y + monitor.height - mBottom - vMaxLen, end: monitor.y + monitor.height - mBottom });
    };

    if (pos === 'top-left') {
        addTopLeft();
    } else if (pos === 'top-right') {
        addTopRight();
    } else if (pos === 'bottom-left') {
        addBottomLeft();
    } else if (pos === 'bottom-right') {
        addBottomRight();
    } else if (pos === 'all-corners') {
        addTopLeft();
        addTopRight();
        addBottomLeft();
        addBottomRight();
    } else if (pos === 'top') {
        const centerX = monitor.x + Math.round(monitor.width / 2);
        arms.push({ isVertical: false, fixedCoord: monitor.y + mTop, start: Math.round(centerX - hMaxLen / 2), end: Math.round(centerX + hMaxLen / 2) });
    } else if (pos === 'bottom') {
        const centerX = monitor.x + Math.round(monitor.width / 2);
        arms.push({ isVertical: false, fixedCoord: monitor.y + monitor.height - mBottom - t, start: Math.round(centerX - hMaxLen / 2), end: Math.round(centerX + hMaxLen / 2) });
    } else if (pos === 'top-bottom') {
        const centerX = monitor.x + Math.round(monitor.width / 2);
        arms.push({ isVertical: false, fixedCoord: monitor.y + mTop, start: Math.round(centerX - hMaxLen / 2), end: Math.round(centerX + hMaxLen / 2) });
        arms.push({ isVertical: false, fixedCoord: monitor.y + monitor.height - mBottom - t, start: Math.round(centerX - hMaxLen / 2), end: Math.round(centerX + hMaxLen / 2) });
    } else if (pos === 'left') {
        const centerY = monitor.y + Math.round(monitor.height / 2);
        arms.push({ isVertical: true, fixedCoord: monitor.x + mLeft, start: Math.round(centerY - vMaxLen / 2), end: Math.round(centerY + vMaxLen / 2) });
    } else if (pos === 'right') {
        const centerY = monitor.y + Math.round(monitor.height / 2);
        arms.push({ isVertical: true, fixedCoord: monitor.x + monitor.width - mRight - t, start: Math.round(centerY - vMaxLen / 2), end: Math.round(centerY + vMaxLen / 2) });
    } else if (pos === 'left-right') {
        const centerY = monitor.y + Math.round(monitor.height / 2);
        arms.push({ isVertical: true, fixedCoord: monitor.x + mLeft, start: Math.round(centerY - vMaxLen / 2), end: Math.round(centerY + vMaxLen / 2) });
        arms.push({ isVertical: true, fixedCoord: monitor.x + monitor.width - mRight - t, start: Math.round(centerY - vMaxLen / 2), end: Math.round(centerY + vMaxLen / 2) });
    }

    return arms;
}

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
        this._animationMode = this._settings.get_string('animation-mode'); // 'to-center', 'to-start', 'to-end', 'to-edges', 'fill-from-center'
        this._fadeDuration = this._settings.get_int('fade-duration');
        this._onlyPrimaryMonitor = this._settings.get_boolean('only-on-primary-monitor');
        this._targetSourceIndex = this._settings.get_int('switch-to-source-index');
    }

    _syncCapsLockOption() {
        try {
            if (!this._inputSettings) {
                this._inputSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.input-sources' });
            }
            const currentOptions = this._inputSettings.get_strv('xkb-options');
            const hasCapsToggle = currentOptions.includes('grp:caps_toggle');

            if (this._capsLockSwitchEnabled && !hasCapsToggle) {
                this._inputSettings.set_strv('xkb-options', [...currentOptions, 'grp:caps_toggle']);
            } else if (!this._capsLockSwitchEnabled && hasCapsToggle) {
                this._inputSettings.set_strv('xkb-options', currentOptions.filter(opt => opt !== 'grp:caps_toggle'));
            }
        } catch (e) {
            console.error('[SwitchBack] Ошибка синхронизации Caps Lock:', e);
        }
    }

    _rebuildBars() {
        this._destroyBars();

        // Если автовозврат или индикатор отключен — полосы не создаем
        if (!this._autoSwitchEnabled || !this._showIndicator) return;

        let armCount = 1;
        if (this._barPosition === 'all-corners') {
            armCount = 8;
        } else if (
            this._barPosition === 'top-bottom' ||
            this._barPosition === 'left-right' ||
            this._barPosition === 'top-left' ||
            this._barPosition === 'top-right' ||
            this._barPosition === 'bottom-left' ||
            this._barPosition === 'bottom-right'
        ) {
            armCount = 2;
        }

        const isSplitMode = (this._animationMode === 'to-edges');
        const barsPerArm = isSplitMode ? 2 : 1;
        const count = armCount * barsPerArm;

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
            this._stopCountdown(false);
            return;
        }

        if (this._isSecondaryLayout()) {
            this._startCountdown();
        } else {
            this._stopCountdown(true);
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
        this._stopCountdown(false);

        if (!this._autoSwitchEnabled) return;

        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        const now = GLib.get_monotonic_time() / 1000;
        this._lastKeyboardTime = now;
        this._lastDaemonTs = this._readDaemonTimestamp();

        // Поднимаем полосы на самый верхний Z-слой и включаем плавное появление (Fade-In)
        const shouldShowBars = this._showIndicator && this._bars.length > 0;
        if (shouldShowBars) {
            for (const bar of this._bars) {
                Main.layoutManager.uiGroup.set_child_above_sibling(bar, null);
                bar.remove_all_transitions();
                if (this._fadeDuration > 0) {
                    bar.opacity = 0;
                    bar.visible = true;
                    bar.ease({
                        opacity: 255,
                        duration: this._fadeDuration,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                    });
                } else {
                    bar.opacity = 255;
                    bar.visible = true;
                }
            }
        }

        const arms = getArmsForPosition(this._barPosition, monitor, this._barLengthFraction, this._barThickness, {
            top: this._marginTop,
            bottom: this._marginBottom,
            left: this._marginLeft,
            right: this._marginRight,
        });

        // Цикл обновления ~60 FPS (16 мс)
        let frameCount = 0;
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
            if (!this._autoSwitchEnabled || !this._isSecondaryLayout()) {
                this._stopCountdown(true);
                return GLib.SOURCE_REMOVE;
            }

            const currentNow = GLib.get_monotonic_time() / 1000;

            // 1. Проверяем таймштамп аппаратной клавиатуры каждые 3 кадра (~48 мс) для снижения системных вызовов
            frameCount++;
            if (frameCount % 3 === 0) {
                const daemonTs = this._readDaemonTimestamp();
                if (daemonTs > this._lastDaemonTs) {
                    this._lastDaemonTs = daemonTs;
                    this._lastKeyboardTime = currentNow; // Сброс таймера от клавиатуры
                }
            }

            // 2. Расчёт прошедшего времени
            const timeSinceTyping = currentNow - this._lastKeyboardTime;

            if (timeSinceTyping >= this._timeoutMs) {
                this._stopCountdown(true);
                this._switchToPrimary();
                return GLib.SOURCE_REMOVE;
            }

            // 3. Если индикатор не требуется отрисовывать — продолжаем только логику таймера
            if (!shouldShowBars) {
                return GLib.SOURCE_CONTINUE;
            }

            // 4. Отрисовка полос
            const progress = Math.max(0, 1.0 - (timeSinceTyping / this._timeoutMs));
            const elapsedFraction = Math.min(1.0, Math.max(0, timeSinceTyping / this._timeoutMs));

            for (let i = 0; i < arms.length; i++) {
                const arm = arms[i];
                const maxLen = arm.end - arm.start;
                const mid = Math.round((arm.start + arm.end) / 2);

                if (this._animationMode === 'to-edges') {
                    const halfA = Math.floor(maxLen / 2);
                    const halfB = maxLen - halfA;
                    const lenA = Math.round(halfA * progress);
                    const lenB = Math.round(halfB * progress);
                    const coordA = arm.start;
                    const coordB = arm.end - lenB;

                    const barA = this._bars[i * 2];
                    const barB = this._bars[i * 2 + 1];
                    if (barA) {
                        if (arm.isVertical) {
                            barA.set_position(arm.fixedCoord, coordA);
                            barA.set_size(this._barThickness, lenA);
                        } else {
                            barA.set_position(coordA, arm.fixedCoord);
                            barA.set_size(lenA, this._barThickness);
                        }
                    }
                    if (barB) {
                        if (arm.isVertical) {
                            barB.set_position(arm.fixedCoord, coordB);
                            barB.set_size(this._barThickness, lenB);
                        } else {
                            barB.set_position(coordB, arm.fixedCoord);
                            barB.set_size(lenB, this._barThickness);
                        }
                    }
                } else {
                    let len = 0;
                    let coord = 0;

                    if (this._animationMode === 'fill-from-center') {
                        len = Math.round(maxLen * elapsedFraction);
                        coord = Math.round(mid - len / 2);
                    } else {
                        len = Math.round(maxLen * progress);
                        if (this._animationMode === 'to-start') {
                            coord = arm.start;
                        } else if (this._animationMode === 'to-end') {
                            coord = arm.end - len;
                        } else {
                            // 'to-center' (по умолчанию)
                            coord = Math.round(mid - len / 2);
                        }
                    }

                    const bar = this._bars[i];
                    if (bar) {
                        if (arm.isVertical) {
                            bar.set_position(arm.fixedCoord, coord);
                            bar.set_size(this._barThickness, len);
                        } else {
                            bar.set_position(coord, arm.fixedCoord);
                            bar.set_size(len, this._barThickness);
                        }
                    }
                }
            }

            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopCountdown(animated = false) {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }

        if (animated && this._fadeDuration > 0 && this._bars.some(b => b.visible && b.opacity > 0)) {
            for (const bar of this._bars) {
                bar.remove_all_transitions();
                bar.ease({
                    opacity: 0,
                    duration: this._fadeDuration,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                    onComplete: () => {
                        bar.visible = false;
                        bar.set_size(0, 0);
                        bar.opacity = 255;
                    },
                });
            }
        } else {
            for (const bar of this._bars) {
                bar.remove_all_transitions();
                bar.visible = false;
                bar.set_size(0, 0);
                bar.opacity = 255;
            }
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
        this._stopCountdown(false);

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
        this._inputSettings = null;
        this._ism = null;
    }
}
