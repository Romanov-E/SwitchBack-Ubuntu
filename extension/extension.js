import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/status/keyboard.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

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
        this.initTranslations();
        this._settings = this.getSettings();

        this._timerId = null;
        this._bars = [];
        this._sourceChangedId = null;
        this._settingsChangedId = null;
        this._lastKeyboardTime = 0;
        this._lastDaemonTs = 0;
        this._shmPath = '/dev/shm/switchback_key';

        this._isLocked = false;
        this._isCapsHeldDown = false;
        this._lastProcessedCapsTs = 0;
        this._capsMonitor = null;
        this._capsMonitorId = null;
        this._capsFile = null;

        this._lockCard = null;
        this._lockIcon = null;
        this._lockTimeoutId = null;
        this._isShowingUnlock = false;

        this._loadSettings();
        this._syncCapsLockOption();
        this._setupCapsMonitor();

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
            if (!this._capsLockHoldEnabled && this._isLocked) {
                this._isLocked = false;
                this._hideLockCard(true);
            }
            this._rebuildBars();
            if (this._isSecondaryLayout() && this._autoSwitchEnabled) {
                if (this._isLocked) {
                    if (this._capsLockHoldPersistentBadge) {
                        this._showLockCard('changes-prevent-symbolic', true);
                    } else {
                        this._hideLockCard(true);
                    }
                    if (this._capsLockHoldHideBars) {
                        this._stopCountdown(true);
                    } else {
                        this._showLockedIndicator();
                    }
                } else {
                    this._startCountdown();
                }
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
        this._capsLockHoldEnabled = this._settings.get_boolean('caps-lock-hold-enabled');
        this._capsLockHoldDuration = this._settings.get_int('caps-lock-hold-duration');
        this._capsLockHoldNotify = this._settings.get_boolean('caps-lock-hold-notify');
        this._capsLockHoldPersistentBadge = this._settings.get_boolean('caps-lock-hold-persistent-badge');
        this._capsLockHoldHideBars = this._settings.get_boolean('caps-lock-hold-hide-bars');
        this._autoSwitchEnabled = this._settings.get_boolean('auto-switch-enabled');
        this._showIndicator = this._settings.get_boolean('show-indicator');
        this._timeoutMs = Math.round(this._settings.get_double('timeout-seconds') * 1000);
        this._barPosition = this._settings.get_string('bar-position');

        // Направленные отступы
        this._marginTop = this._settings.get_int('margin-top');
        this._marginBottom = this._settings.get_int('margin-bottom');
        this._marginLeft = this._settings.get_int('margin-left');
        this._marginRight = this._settings.get_int('margin-right');

        this._barThickness = this._settings.get_int('bar-thickness');
        this._barLengthFraction = this._settings.get_double('bar-length-fraction');
        this._barColor = this._settings.get_string('bar-color');
        this._barRadius = this._settings.get_int('bar-radius');
        this._animationMode = this._settings.get_string('animation-mode');
        this._fadeDuration = this._settings.get_int('fade-duration');
        this._splitFadeDurations = this._settings.get_boolean('split-fade-durations');
        this._fadeInDuration = this._splitFadeDurations
            ? this._settings.get_int('fade-in-duration')
            : this._fadeDuration;
        this._fadeOutDuration = this._splitFadeDurations
            ? this._settings.get_int('fade-out-duration')
            : this._fadeDuration;
        this._onlyPrimaryMonitor = this._settings.get_boolean('only-on-primary-monitor');
        this._targetSourceIndex = this._settings.get_int('switch-to-source-index');
    }

    _setupCapsMonitor() {
        this._destroyCapsMonitor();
        try {
            this._capsFile = Gio.File.new_for_path('/dev/shm/switchback_caps');
            this._capsMonitor = this._capsFile.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._capsMonitorId = this._capsMonitor.connect('changed', (mon, f, other, eventType) => {
                if (eventType === Gio.FileMonitorEvent.CHANGED || eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
                    this._onCapsFileEvent();
                }
            });
        } catch (e) {
            console.error('[SwitchBack] Не удалось запустить мониторинг Caps Lock:', e);
        }
    }

    _destroyCapsMonitor() {
        if (this._capsMonitorId && this._capsMonitor) {
            this._capsMonitor.disconnect(this._capsMonitorId);
            this._capsMonitorId = null;
        }
        if (this._capsMonitor) {
            this._capsMonitor.cancel();
            this._capsMonitor = null;
        }
        this._capsFile = null;
    }

    _onCapsFileEvent() {
        try {
            const [ok, contents] = GLib.file_get_contents('/dev/shm/switchback_caps');
            if (!ok) return;
            const str = new TextDecoder().decode(contents).trim();
            const parts = str.split(/\s+/);
            const action = parts[0];
            const ts = parseInt(parts[1], 10);

            if (ts && ts <= this._lastProcessedCapsTs) return;
            if (ts) this._lastProcessedCapsTs = ts;

            if (action === 'HOLD') {
                this._onCapsHold();
            } else if (action === 'TAP') {
                this._onCapsTap();
            } else if (action === 'DOWN') {
                this._onCapsDown();
            } else if (action === 'UP') {
                this._onCapsUp();
            }
        } catch (e) {
            console.error('[SwitchBack] Ошибка чтения события Caps Lock:', e);
        }
    }

    _onCapsDown() {
        if (!this._capsLockHoldEnabled) return;
        this._isCapsHeldDown = true;
        if (this._isSecondaryLayout() && !this._isLocked) {
            this._lastKeyboardTime = GLib.get_monotonic_time() / 1000;
        }
    }

    _onCapsUp() {
        this._isCapsHeldDown = false;
    }

    _onCapsHold() {
        this._isCapsHeldDown = false;
        if (!this._capsLockHoldEnabled) return;
        if (this._isLocked) return;

        // Если находились на приоритетной раскладке — переключаем на вторичную
        if (!this._isSecondaryLayout()) {
            this._switchToSecondary();
        }

        this._isLocked = true;
        this._isShowingUnlock = false;
        this._stopCountdown(false);

        if (this._capsLockHoldNotify) {
            // Показываем замок: если включен постоянный значок — оставляем на экране, иначе плавно скрываем
            this._showLockCard('changes-prevent-symbolic', this._capsLockHoldPersistentBadge, 1500);
        } else if (this._capsLockHoldPersistentBadge) {
            // Уведомление выключено, но постоянный значок включен — показываем на всё время
            this._showLockCard('changes-prevent-symbolic', true);
        }

        if (this._capsLockHoldHideBars) {
            this._stopCountdown(true);
        } else {
            this._showLockedIndicator();
        }
    }

    _onCapsTap() {
        this._isCapsHeldDown = false;
        if (this._isLocked) {
            this._isLocked = false;
            if (this._capsLockHoldNotify) {
                // Показываем разомкнутый замочек на 1.3 секунды
                this._isShowingUnlock = true;
                this._showLockCard('changes-allow-symbolic', false, 1300);
            } else {
                this._hideLockCard(true);
            }
            this._switchToPrimary();
            this._stopCountdown(true);
        }
    }

    _ensureLockCard() {
        if (this._lockCard) return;

        this._lockCard = new St.BoxLayout({
            style: `
                width: 108px;
                height: 70px;
                background-color: rgba(45, 45, 45, 0.94);
                border: 1px solid rgba(255, 255, 255, 0.10);
                border-radius: 18px;
                box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
            `,
            reactive: false,
            visible: false,
            can_focus: false,
            track_hover: false,
            opacity: 0,
        });

        this._lockIcon = new St.Icon({
            icon_size: 36,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
            style: 'color: #ffffff;',
        });
        this._lockCard.add_child(this._lockIcon);

        Main.layoutManager.uiGroup.add_child(this._lockCard);
    }

    _destroyLockCard() {
        this._isShowingUnlock = false;
        if (this._lockTimeoutId) {
            GLib.source_remove(this._lockTimeoutId);
            this._lockTimeoutId = null;
        }
        if (this._lockCard) {
            try {
                this._lockCard.destroy();
            } catch (e) {}
            this._lockCard = null;
            this._lockIcon = null;
        }
    }

    _showLockCard(iconName, isPersistent, durationMs = 1500) {
        try {
            this._ensureLockCard();
            if (!this._lockCard) return;

            const monitorIndex = global.display.get_current_monitor ? global.display.get_current_monitor() : 0;
            const monitor = Main.layoutManager.monitors[monitorIndex] || Main.layoutManager.primaryMonitor;
            if (!monitor) return;

            if (this._lockTimeoutId) {
                GLib.source_remove(this._lockTimeoutId);
                this._lockTimeoutId = null;
            }

            this._lockIcon.gicon = Gio.ThemedIcon.new(iconName);

            // Размеры плашки как у нативных индикаторов Ubuntu (108 x 70 px, скругление 18px)
            const width = 108;
            const height = 70;

            // Позиционирование ниже нативного переключателя раскладок (70% высоты экрана) для исключения наслоения
            const x = monitor.x + Math.round((monitor.width - width) / 2);
            const y = monitor.y + Math.round(monitor.height * 0.70);

            this._lockCard.set_position(x, y);
            this._lockCard.set_size(width, height);
            Main.layoutManager.uiGroup.set_child_above_sibling(this._lockCard, null);

            this._lockCard.remove_all_transitions();
            this._lockCard.visible = true;
            this._lockCard.ease({
                opacity: 255,
                duration: 180,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });

            if (!isPersistent) {
                this._lockTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, durationMs, () => {
                    this._lockTimeoutId = null;
                    this._isShowingUnlock = false;
                    if (this._lockCard && this._lockCard.visible) {
                        this._lockCard.ease({
                            opacity: 0,
                            duration: 250,
                            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                            onComplete: () => {
                                if (this._lockCard && !this._isLocked && !this._isShowingUnlock) {
                                    this._lockCard.visible = false;
                                }
                            },
                        });
                    }
                    return GLib.SOURCE_REMOVE;
                });
            }
        } catch (e) {
            console.error('[SwitchBack] Ошибка отображения индикатора блокировки:', e);
        }
    }

    _hideLockCard(force = false) {
        if (this._isShowingUnlock && !force) return;
        this._isShowingUnlock = false;
        if (this._lockTimeoutId) {
            GLib.source_remove(this._lockTimeoutId);
            this._lockTimeoutId = null;
        }
        if (!this._lockCard || !this._lockCard.visible) return;
        try {
            this._lockCard.remove_all_transitions();
            this._lockCard.ease({
                opacity: 0,
                duration: 200,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    if (this._lockCard && !this._isLocked && !this._isShowingUnlock) {
                        this._lockCard.visible = false;
                    }
                },
            });
        } catch (e) {
            if (this._lockCard) {
                this._lockCard.visible = false;
            }
        }
    }

    _showLockedIndicator() {
        if (!this._showIndicator || this._bars.length === 0) return;
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        const arms = getArmsForPosition(this._barPosition, monitor, this._barLengthFraction, this._barThickness, {
            top: this._marginTop,
            bottom: this._marginBottom,
            left: this._marginLeft,
            right: this._marginRight,
        });

        for (let i = 0; i < arms.length; i++) {
            const arm = arms[i];
            const maxLen = arm.end - arm.start;
            const mid = Math.round((arm.start + arm.end) / 2);

            if (this._animationMode === 'to-edges' || this._animationMode === 'from-edges-to-center') {
                const halfA = Math.floor(maxLen / 2);
                const halfB = maxLen - halfA;
                const barA = this._bars[i * 2];
                const barB = this._bars[i * 2 + 1];
                if (barA) {
                    barA.remove_all_transitions();
                    if (arm.isVertical) {
                        barA.set_position(arm.fixedCoord, arm.start);
                        barA.set_size(this._barThickness, halfA);
                    } else {
                        barA.set_position(arm.start, arm.fixedCoord);
                        barA.set_size(halfA, this._barThickness);
                    }
                    barA.opacity = 255;
                    barA.visible = true;
                }
                if (barB) {
                    barB.remove_all_transitions();
                    if (arm.isVertical) {
                        barB.set_position(arm.fixedCoord, arm.start + halfA);
                        barB.set_size(this._barThickness, halfB);
                    } else {
                        barB.set_position(arm.start + halfA, arm.fixedCoord);
                        barB.set_size(halfB, this._barThickness);
                    }
                    barB.opacity = 255;
                    barB.visible = true;
                }
            } else {
                const bar = this._bars[i];
                if (bar) {
                    bar.remove_all_transitions();
                    const coord = (this._animationMode === 'to-start') ? arm.start :
                                  (this._animationMode === 'to-end') ? arm.end - maxLen :
                                  Math.round(mid - maxLen / 2);
                    if (arm.isVertical) {
                        bar.set_position(arm.fixedCoord, coord);
                        bar.set_size(this._barThickness, maxLen);
                    } else {
                        bar.set_position(coord, arm.fixedCoord);
                        bar.set_size(maxLen, this._barThickness);
                    }
                    bar.opacity = 255;
                    bar.visible = true;
                }
            }
        }
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

        const isSplitMode = (this._animationMode === 'to-edges' || this._animationMode === 'from-edges-to-center');
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
        this._stopCountdown(false);
        for (const bar of this._bars) {
            try {
                bar.destroy();
            } catch (e) {}
        }
        this._bars = [];
    }

    _applyBarStyles() {
        const isSplit = (this._animationMode === 'to-edges' || this._animationMode === 'from-edges-to-center');
        const isVertical = (this._barPosition === 'left' || this._barPosition === 'right' || this._barPosition === 'left-right');
        const r = this._barRadius;

        if (isSplit) {
            const styleA = isVertical
                ? `background-color: ${this._barColor}; border-radius: ${r}px ${r}px 0px 0px;`
                : `background-color: ${this._barColor}; border-radius: ${r}px 0px 0px ${r}px;`;
            const styleB = isVertical
                ? `background-color: ${this._barColor}; border-radius: 0px 0px ${r}px ${r}px;`
                : `background-color: ${this._barColor}; border-radius: 0px ${r}px ${r}px 0px;`;

            for (let i = 0; i < this._bars.length; i += 2) {
                try {
                    if (this._bars[i]) this._bars[i].set_style(styleA);
                } catch (e) {}
                try {
                    if (this._bars[i + 1]) this._bars[i + 1].set_style(styleB);
                } catch (e) {}
            }
        } else {
            const style =
                `background-color: ${this._barColor}; ` +
                `border-radius: ${r}px;`;

            for (const bar of this._bars) {
                try {
                    bar.set_style(style);
                } catch (e) {}
            }
        }
    }

    _isSecondaryLayout() {
        if (!this._ism || !this._ism.currentSource) return false;
        return this._ism.currentSource.index !== this._targetSourceIndex;
    }

    _onSourceChanged() {
        // Если автовозврат выключен — ничего не делаем и прячем всё
        if (!this._autoSwitchEnabled) {
            this._isLocked = false;
            this._hideLockCard(true);
            this._stopCountdown(false);
            return;
        }

        if (this._isSecondaryLayout()) {
            if (this._isLocked) {
                // Зафиксировано: таймер не запускаем
                if (this._capsLockHoldPersistentBadge) {
                    this._showLockCard('changes-prevent-symbolic', true);
                }
                if (this._capsLockHoldHideBars) {
                    this._stopCountdown(true);
                } else {
                    this._showLockedIndicator();
                }
                return;
            }
            this._startCountdown();
        } else {
            // Вернулись на приоритетную раскладку
            if (this._isLocked) {
                this._isLocked = false;
                if (this._capsLockHoldNotify) {
                    this._isShowingUnlock = true;
                    this._showLockCard('changes-allow-symbolic', false, 1300);
                } else {
                    this._hideLockCard(true);
                }
            } else if (!this._isShowingUnlock) {
                this._hideLockCard();
            }
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

        if (!this._autoSwitchEnabled || this._isLocked) return;

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
                if (this._fadeInDuration > 0) {
                    bar.opacity = 0;
                    bar.visible = true;
                    bar.ease({
                        opacity: 255,
                        duration: this._fadeInDuration,
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
            if (!this._autoSwitchEnabled || !this._isSecondaryLayout() || this._isLocked) {
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

            // 2. Расчёт прошедшего времени (при удержании Caps Lock держим полосу на 100%)
            if (this._isCapsHeldDown) {
                this._lastKeyboardTime = currentNow;
            }
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

                if (this._animationMode === 'to-edges' || this._animationMode === 'from-edges-to-center') {
                    const halfA = Math.floor(maxLen / 2);
                    const halfB = maxLen - halfA;

                    let p = progress;
                    if (this._animationMode === 'from-edges-to-center') {
                        p = Math.min(1.0, elapsedFraction / 0.88);
                    }

                    const overlap = (this._animationMode === 'from-edges-to-center' && p >= 0.95) ? 2 : 0;
                    const lenA = Math.round(halfA * p) + overlap;
                    const lenB = Math.round(halfB * p) + overlap;
                    const coordA = arm.start;
                    const coordB = Math.max(arm.start + halfA - overlap, arm.end - lenB);

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

        if (animated && this._fadeOutDuration > 0 && this._bars.some(b => b.visible && b.opacity > 0)) {
            for (const bar of this._bars) {
                bar.remove_all_transitions();
                bar.ease({
                    opacity: 0,
                    duration: this._fadeOutDuration,
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

    _switchToSecondary() {
        if (!this._ism) return;

        const rawSources = this._ism.inputSources ?? this._ism._inputSources ?? {};
        const sources = Array.isArray(rawSources) ? rawSources : Object.values(rawSources);

        const secondary = sources.find(s => s && s.index !== this._targetSourceIndex);

        if (secondary) {
            if (typeof secondary.activate === 'function') {
                secondary.activate();
            } else if (typeof this._ism.activateInputSource === 'function') {
                this._ism.activateInputSource(secondary, false);
            }
        }
    }

    disable() {
        this._destroyCapsMonitor();
        this._destroyLockCard();
        this._isCapsHeldDown = false;
        this._isLocked = false;
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
