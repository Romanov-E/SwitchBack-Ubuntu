import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function runCmd(cmd) {
    try {
        const [ok, out, err, status] = GLib.spawn_command_line_sync(cmd);
        return ok && status === 0;
    } catch (e) {
        return false;
    }
}

function getCmdOutput(cmd) {
    try {
        const [ok, out] = GLib.spawn_command_line_sync(cmd);
        if (ok) {
            return new TextDecoder().decode(out).trim();
        }
    } catch (e) {}
    return '';
}

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

function drawRoundedRect(cr, x, y, w, h, r) {
    if (r <= 0) {
        cr.rectangle(x, y, w, h);
        return;
    }
    r = Math.min(r, Math.floor(w / 2), Math.floor(h / 2));
    const degrees = Math.PI / 180.0;
    cr.newSubPath();
    cr.arc(x + w - r, y + r, r, -90 * degrees, 0 * degrees);
    cr.arc(x + w - r, y + h - r, r, 0 * degrees, 90 * degrees);
    cr.arc(x + r, y + h - r, r, 90 * degrees, 180 * degrees);
    cr.arc(x + r, y + r, r, 180 * degrees, 270 * degrees);
    cr.closePath();
}

export default class SwitchBackPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this.initTranslations();
        window.set_default_size(680, 800);
        const settings = this.getSettings();

        // ══════════════════════════════════════════════════════════════
        // PAGE 1: BEHAVIOR & TIMER
        // ══════════════════════════════════════════════════════════════
        const pageBehavior = new Adw.PreferencesPage({
            title: _('Behavior'),
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(pageBehavior);

        // --- Group 1: Caps Lock Layout Toggle ---
        const groupSwitching = new Adw.PreferencesGroup({
            title: _('Keyboard Layout Switching'),
            description: _('Assign Caps Lock key for quick input language switching'),
        });
        pageBehavior.add(groupSwitching);

        const inputSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.input-sources' });
        const checkCapsActive = () => {
            const opts = inputSettings.get_strv('xkb-options');
            return opts.includes('grp:caps_toggle');
        };

        const rowCapsToggle = new Adw.SwitchRow({
            title: _('Switch layout with Caps Lock key'),
            subtitle: _('Use single press of Caps Lock to quickly switch language. When disabled, standard system shortcuts apply (Super+Space, Alt+Shift, etc.)'),
            active: checkCapsActive(),
        });

        rowCapsToggle.connect('notify::active', () => {
            const target = rowCapsToggle.get_active();
            const currentOpts = inputSettings.get_strv('xkb-options');
            const hasCaps = currentOpts.includes('grp:caps_toggle');

            if (target && !hasCaps) {
                inputSettings.set_strv('xkb-options', [...currentOpts, 'grp:caps_toggle']);
                settings.set_boolean('caps-lock-switch-enabled', true);
            } else if (!target && hasCaps) {
                inputSettings.set_strv('xkb-options', currentOpts.filter(opt => opt !== 'grp:caps_toggle'));
                settings.set_boolean('caps-lock-switch-enabled', false);
            }
        });
        groupSwitching.add(rowCapsToggle);

        // Фиксация раскладки удержанием Caps Lock
        const rowCapsHold = new Adw.SwitchRow({
            title: _('Lock layout by holding Caps Lock'),
            subtitle: _('Hold Caps Lock to temporarily lock current layout and disable auto-return. Single tap unlocks.'),
            active: settings.get_boolean('caps-lock-hold-enabled'),
        });
        settings.bind('caps-lock-hold-enabled', rowCapsHold, 'active', Gio.SettingsBindFlags.DEFAULT);
        groupSwitching.add(rowCapsHold);

        const rowCapsHoldDuration = new Adw.SpinRow({
            title: _('Hold duration to lock (ms)'),
            subtitle: _('Duration in milliseconds Caps Lock must be held down to lock the layout'),
            adjustment: new Gtk.Adjustment({
                lower: 150,
                upper: 2000,
                step_increment: 50,
                page_increment: 100,
                value: settings.get_int('caps-lock-hold-duration'),
            }),
        });
        settings.bind('caps-lock-hold-duration', rowCapsHoldDuration, 'value', Gio.SettingsBindFlags.DEFAULT);

        const updateCapsHoldSubtitle = () => {
            const val = Math.round(rowCapsHoldDuration.get_value());
            rowCapsHoldDuration.subtitle = `${val} ${_('ms')} — ${_('Duration to hold Caps Lock before locking the layout')}`;
        };
        updateCapsHoldSubtitle();
        rowCapsHoldDuration.connect('notify::value', updateCapsHoldSubtitle);

        const syncHoldSensitivity = () => {
            rowCapsHoldDuration.sensitive = rowCapsHold.active;
        };
        syncHoldSensitivity();
        rowCapsHold.connect('notify::active', syncHoldSensitivity);
        groupSwitching.add(rowCapsHoldDuration);

        // --- Group 2: Master Auto-Switch Toggles ---
        const groupMaster = new Adw.PreferencesGroup({
            title: _('Automatic Layout Return'),
            description: _('Return to primary language after typing inactivity and indicator bar display'),
        });
        pageBehavior.add(groupMaster);

        // Master Auto-Switch
        const rowAutoSwitch = new Adw.SwitchRow({
            title: _('Auto-return to primary layout'),
            subtitle: _('Switch back to primary language after typing pause (master switch)'),
            active: settings.get_boolean('auto-switch-enabled'),
        });
        settings.bind('auto-switch-enabled', rowAutoSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        groupMaster.add(rowAutoSwitch);

        // Show Indicator Bar
        const rowShowIndicator = new Adw.SwitchRow({
            title: _('Show on-screen indicator'),
            subtitle: _('Visual animated bar (when disabled, auto-switch works silently in background)'),
            active: settings.get_boolean('show-indicator'),
        });
        settings.bind('show-indicator', rowShowIndicator, 'active', Gio.SettingsBindFlags.DEFAULT);
        groupMaster.add(rowShowIndicator);

        // --- Group 3: Timer & Parameters ---
        const groupTimer = new Adw.PreferencesGroup({
            title: _('Timer &amp; Switch Parameters'),
            description: _('Inactivity pause and target layout selection'),
        });
        pageBehavior.add(groupTimer);

        // Timeout (seconds)
        const rowTimeout = new Adw.SpinRow({
            title: _('Timeout (seconds)'),
            subtitle: _('Delay of typing inactivity before switching back to primary layout'),
            adjustment: new Gtk.Adjustment({
                lower: 0.5,
                upper: 30.0,
                step_increment: 0.5,
                page_increment: 1.0,
                value: settings.get_double('timeout-seconds'),
            }),
            digits: 1,
        });
        settings.bind('timeout-seconds', rowTimeout, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupTimer.add(rowTimeout);

        // Target Layout Index
        const rowTargetIndex = new Adw.SpinRow({
            title: _('Target layout index'),
            subtitle: _('0 — first language in GNOME input list (usually English)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 5,
                step_increment: 1,
                page_increment: 1,
                value: settings.get_int('switch-to-source-index'),
            }),
        });
        settings.bind('switch-to-source-index', rowTargetIndex, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupTimer.add(rowTargetIndex);

        // Only on Primary Monitor
        const rowPrimaryMonitor = new Adw.SwitchRow({
            title: _('Only on primary monitor'),
            subtitle: _('Show countdown bar exclusively on the main display'),
            active: settings.get_boolean('only-on-primary-monitor'),
        });
        settings.bind('only-on-primary-monitor', rowPrimaryMonitor, 'active', Gio.SettingsBindFlags.DEFAULT);
        groupTimer.add(rowPrimaryMonitor);

        const updateBehaviorSensitivity = () => {
            const enabled = settings.get_boolean('auto-switch-enabled');
            rowShowIndicator.sensitive = enabled;
            rowTimeout.sensitive = enabled;
            rowTargetIndex.sensitive = enabled;
            rowPrimaryMonitor.sensitive = enabled;
        };
        updateBehaviorSensitivity();
        settings.connect('changed::auto-switch-enabled', updateBehaviorSensitivity);

        // ══════════════════════════════════════════════════════════════
        // PAGE 2: APPEARANCE
        // ══════════════════════════════════════════════════════════════
        const pageAppearance = new Adw.PreferencesPage({
            title: _('Appearance'),
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(pageAppearance);

        // --- Group 1: Live Preview (Pinned hero element at top) ---
        const topClamp = new Adw.Clamp({
            maximum_size: 600,
            tightening_threshold: 400,
            margin_top: 4,
            margin_bottom: 4,
            margin_start: 12,
            margin_end: 12,
        });

        const groupPreview = new Adw.PreferencesGroup({
            title: _('Live Preview'),
            description: _('Visual demonstration of the on-screen countdown indicator'),
        });

        // --- Live Preview Card ---
        const rowPreview = new Adw.PreferencesRow({
            title: _('Live Preview'),
        });

        const previewContainer = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 12,
            margin_end: 12,
        });

        const previewDrawingArea = new Gtk.DrawingArea({
            height_request: 155,
            hexpand: true,
        });
        previewDrawingArea.set_cursor_from_name('pointer');

        const lblHint = new Gtk.Label({
            label: _('Click screen to test animation'),
            css_classes: ['dim-label', 'caption'],
            halign: Gtk.Align.CENTER,
        });

        previewContainer.append(previewDrawingArea);
        previewContainer.append(lblHint);

        let animProgress = 1.0;
        let animOpacity = 1.0;
        let animTickId = null;
        let activeAnimMode = settings.get_string('animation-mode');

        const stopAnimation = () => {
            if (animTickId !== null) {
                previewDrawingArea.remove_tick_callback(animTickId);
                animTickId = null;
            }
        };

        const playPreviewAnimation = (targetMode) => {
            if (targetMode) {
                activeAnimMode = targetMode;
            } else {
                activeAnimMode = settings.get_string('animation-mode');
            }

            stopAnimation();

            const motionDurationUs = 950 * 1000;  // 0.95s motion
            const pauseDurationUs = 150 * 1000;   // 0.15s pause
            const isSplitFade = settings.get_boolean('split-fade-durations');
            const isReverseMode = (activeAnimMode === 'fill-from-center' || activeAnimMode === 'from-edges-to-center');
            const targetFadeMs = isSplitFade
                ? (isReverseMode ? settings.get_int('fade-out-duration') : settings.get_int('fade-in-duration'))
                : settings.get_int('fade-duration');
            const transitionDurationUs = Math.max(60, Math.min(1500, targetFadeMs)) * 1000;
            const cycleDurationUs = motionDurationUs + pauseDurationUs + transitionDurationUs;
            const totalIterations = 3;

            let cycleStartTime = GLib.get_monotonic_time();
            let iteration = 0;

            animTickId = previewDrawingArea.add_tick_callback((widget, frameClock) => {
                const now = frameClock ? frameClock.get_frame_time() : GLib.get_monotonic_time();
                const elapsed = now - cycleStartTime;

                if (elapsed >= cycleDurationUs) {
                    iteration++;
                    if (iteration >= totalIterations) {
                        // All 3 iterations finished: restore full idle bar
                        animProgress = 1.0;
                        animOpacity = 1.0;
                        previewDrawingArea.queue_draw();
                        animTickId = null;
                        return false;
                    }
                    cycleStartTime = now;
                }

                const cycleElapsed = now - cycleStartTime;

                if (activeAnimMode === 'fill-from-center' || activeAnimMode === 'from-edges-to-center') {
                    if (cycleElapsed < motionDurationUs) {
                        animProgress = cycleElapsed / motionDurationUs;
                        animOpacity = 1.0;
                    } else if (cycleElapsed < motionDurationUs + pauseDurationUs) {
                        animProgress = 1.0;
                        animOpacity = 1.0;
                    } else {
                        animProgress = 1.0;
                        const fadeP = (cycleElapsed - (motionDurationUs + pauseDurationUs)) / transitionDurationUs;
                        animOpacity = Math.max(0, 1.0 - fadeP);
                    }
                } else {
                    if (cycleElapsed < motionDurationUs) {
                        const p = cycleElapsed / motionDurationUs;
                        animProgress = Math.max(0, 1.0 - p);
                        animOpacity = 1.0;
                    } else if (cycleElapsed < motionDurationUs + pauseDurationUs) {
                        animProgress = 0.0;
                        animOpacity = 0.0;
                    } else {
                        animProgress = 1.0;
                        const fadeP = (cycleElapsed - (motionDurationUs + pauseDurationUs)) / transitionDurationUs;
                        animOpacity = Math.min(1.0, Math.max(0, fadeP));
                    }
                }

                previewDrawingArea.queue_draw();
                return true;
            });
        };

        const clickGesture = new Gtk.GestureClick();
        clickGesture.connect('pressed', () => {
            playPreviewAnimation();
        });
        previewDrawingArea.add_controller(clickGesture);

        previewDrawingArea.set_draw_func((area, cr, width, height) => {
            const fraction = settings.get_double('bar-length-fraction');
            const thickness = Math.max(2, Math.min(settings.get_int('bar-thickness'), 12));
            const radius = settings.get_int('bar-radius');
            const colorStr = settings.get_string('bar-color');
            const position = settings.get_string('bar-position');
            const mode = activeAnimMode || settings.get_string('animation-mode');

            const rgba = new Gdk.RGBA();
            if (!rgba.parse(colorStr)) {
                rgba.parse('#3584e4');
            }

            // Centered 16:9 monitor screen
            const padY = 8;
            const maxH = Math.max(60, height - padY * 2);
            const targetAspect = 16 / 9;
            let mockH = maxH;
            let mockW = Math.round(mockH * targetAspect);
            if (mockW > width - 24) {
                mockW = width - 24;
                mockH = Math.round(mockW / targetAspect);
            }
            const mockX = Math.round((width - mockW) / 2);
            const mockY = Math.round((height - mockH) / 2);

            // 1. Subtle drop-shadow behind monitor
            const viewRadius = 8;
            drawRoundedRect(cr, mockX - 2, mockY - 1, mockW + 4, mockH + 4, viewRadius + 2);
            cr.setSourceRGBA(0, 0, 0, 0.08);
            cr.fill();

            // 2. Mock screen display surface
            drawRoundedRect(cr, mockX, mockY, mockW, mockH, viewRadius);
            cr.setSourceRGBA(0.12, 0.13, 0.16, 1.0);
            cr.fillPreserve();

            // 3. Sleek bezel stroke
            cr.setSourceRGBA(0.4, 0.45, 0.55, 0.35);
            cr.setLineWidth(1.0);
            cr.stroke();

            // 4. Indicator bar geometry inside mock screen
            if (animOpacity <= 0.001) return;

            const mockMonitor = { x: mockX, y: mockY, width: mockW, height: mockH };

            const mTopRaw = settings.get_int('margin-top');
            const mBottomRaw = settings.get_int('margin-bottom');
            const mLeftRaw = settings.get_int('margin-left');
            const mRightRaw = settings.get_int('margin-right');

            // Относительное масштабирование отступов (эталонный монитор 1920x1080)
            const scaleX = mockW / 1920;
            const scaleY = mockH / 1080;
            const mTop = mTopRaw > 0 ? Math.max(1, Math.round(mTopRaw * scaleY * 2.5)) : 0;
            const mBottom = mBottomRaw > 0 ? Math.max(1, Math.round(mBottomRaw * scaleY * 2.5)) : 0;
            const mLeft = mLeftRaw > 0 ? Math.max(1, Math.round(mLeftRaw * scaleX * 2.5)) : 0;
            const mRight = mRightRaw > 0 ? Math.max(1, Math.round(mRightRaw * scaleX * 2.5)) : 0;

            const arms = getArmsForPosition(position, mockMonitor, fraction, thickness, {
                top: mTop,
                bottom: mBottom,
                left: mLeft,
                right: mRight,
            });

            for (const arm of arms) {
                const maxLen = arm.end - arm.start;
                const mid = Math.round((arm.start + arm.end) / 2);

                if (mode === 'to-edges' || mode === 'from-edges-to-center') {
                    const halfA = Math.floor(maxLen / 2);
                    const halfB = maxLen - halfA;
                    const lenA = Math.round(halfA * animProgress);
                    const lenB = Math.round(halfB * animProgress);

                    if (animProgress >= 0.99) {
                        const barR = Math.min(radius, Math.floor(thickness / 2), Math.floor(maxLen / 2));
                        if (arm.isVertical) {
                            drawRoundedRect(cr, arm.fixedCoord, arm.start, thickness, maxLen, barR);
                        } else {
                            drawRoundedRect(cr, arm.start, arm.fixedCoord, maxLen, thickness, barR);
                        }
                        cr.setSourceRGBA(rgba.red, rgba.green, rgba.blue, rgba.alpha * animOpacity);
                        cr.fill();
                    } else {
                        if (lenA > 0) {
                            const rA = Math.min(radius, Math.floor(thickness / 2), Math.floor(lenA / 2));
                            if (arm.isVertical) {
                                drawRoundedRect(cr, arm.fixedCoord, arm.start, thickness, lenA, rA);
                            } else {
                                drawRoundedRect(cr, arm.start, arm.fixedCoord, lenA, thickness, rA);
                            }
                            cr.setSourceRGBA(rgba.red, rgba.green, rgba.blue, rgba.alpha * animOpacity);
                            cr.fill();
                        }
                        if (lenB > 0) {
                            const coordB = arm.end - lenB;
                            const rB = Math.min(radius, Math.floor(thickness / 2), Math.floor(lenB / 2));
                            if (arm.isVertical) {
                                drawRoundedRect(cr, arm.fixedCoord, coordB, thickness, lenB, rB);
                            } else {
                                drawRoundedRect(cr, coordB, arm.fixedCoord, lenB, thickness, rB);
                            }
                            cr.setSourceRGBA(rgba.red, rgba.green, rgba.blue, rgba.alpha * animOpacity);
                            cr.fill();
                        }
                    }
                } else {
                    let len = 0;
                    let coord = 0;

                    if (mode === 'fill-from-center') {
                        len = Math.round(maxLen * animProgress);
                        coord = Math.round(mid - len / 2);
                    } else {
                        len = Math.round(maxLen * animProgress);
                        if (mode === 'to-start') {
                            coord = arm.start;
                        } else if (mode === 'to-end') {
                            coord = arm.end - len;
                        } else {
                            // to-center
                            coord = Math.round(mid - len / 2);
                        }
                    }

                    if (len > 0) {
                        const barR = Math.min(radius, Math.floor(thickness / 2), Math.floor(len / 2));
                        if (arm.isVertical) {
                            drawRoundedRect(cr, arm.fixedCoord, coord, thickness, len, barR);
                        } else {
                            drawRoundedRect(cr, coord, arm.fixedCoord, len, thickness, barR);
                        }
                        cr.setSourceRGBA(rgba.red, rgba.green, rgba.blue, rgba.alpha * animOpacity);
                        cr.fill();
                    }
                }
            }
        });

        const queuePreview = () => {
            stopAnimation();
            animProgress = 1.0;
            animOpacity = 1.0;
            previewDrawingArea.queue_draw();
        };

        settings.connect('changed::bar-length-fraction', queuePreview);
        settings.connect('changed::bar-thickness', queuePreview);
        settings.connect('changed::bar-radius', queuePreview);
        settings.connect('changed::bar-color', queuePreview);
        settings.connect('changed::fade-duration', queuePreview);
        settings.connect('changed::split-fade-durations', queuePreview);
        settings.connect('changed::fade-in-duration', queuePreview);
        settings.connect('changed::fade-out-duration', queuePreview);
        settings.connect('changed::margin-top', queuePreview);
        settings.connect('changed::margin-bottom', queuePreview);
        settings.connect('changed::margin-left', queuePreview);
        settings.connect('changed::margin-right', queuePreview);
        settings.connect('changed::bar-position', () => {
            queuePreview();
            playPreviewAnimation();
        });

        rowPreview.set_child(previewContainer);
        groupPreview.add(rowPreview);
        topClamp.set_child(groupPreview);

        const scrolled = pageAppearance.get_first_child();
        topClamp.insert_before(pageAppearance, scrolled);

        // --- Group 2: Placement & Dimensions ---
        const groupGeometry = new Adw.PreferencesGroup({
            title: _('Placement &amp; Dimensions'),
            description: _('Screen position, length, thickness, shape and color'),
        });
        pageAppearance.add(groupGeometry);

        // Position ComboRow
        const positionModel = Gtk.StringList.new([
            _('Top of screen (horizontal)'),
            _('Bottom of screen (horizontal)'),
            _('Top + Bottom (two horizontal bars)'),
            _('Left of screen (vertical)'),
            _('Right of screen (vertical)'),
            _('Left + Right (two vertical bars)'),
            _('Top-left corner'),
            _('Top-right corner'),
            _('Bottom-left corner'),
            _('Bottom-right corner'),
            _('All 4 corners simultaneously'),
        ]);
        const positionKeys = [
            'top',
            'bottom',
            'top-bottom',
            'left',
            'right',
            'left-right',
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'all-corners',
        ];

        const rowPosition = new Adw.ComboRow({
            title: _('Indicator Position'),
            subtitle: _('Determines bar orientation and screen edges'),
            model: positionModel,
        });

        const currentPos = settings.get_string('bar-position');
        const posIndex = positionKeys.indexOf(currentPos);
        rowPosition.set_selected(posIndex >= 0 ? posIndex : 0);

        rowPosition.connect('notify::selected', () => {
            const idx = rowPosition.get_selected();
            if (idx >= 0 && idx < positionKeys.length) {
                settings.set_string('bar-position', positionKeys[idx]);
            }
        });
        groupGeometry.add(rowPosition);

        // Bar Length Fraction
        const rowLength = new Adw.SpinRow({
            title: _('Bar length (% of screen)'),
            subtitle: _('Percentage of screen width (or height in vertical mode)'),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 100,
                step_increment: 5,
                page_increment: 10,
                value: Math.round(settings.get_double('bar-length-fraction') * 100),
            }),
        });

        const updateLengthSubtitle = () => {
            const val = Math.round(rowLength.get_value());
            rowLength.subtitle = `${val}% — ${_('Percentage of screen width (or height in vertical mode)')}`;
        };
        updateLengthSubtitle();

        rowLength.connect('notify::value', () => {
            settings.set_double('bar-length-fraction', rowLength.get_value() / 100.0);
            updateLengthSubtitle();
        });
        groupGeometry.add(rowLength);

        // Bar Thickness
        const rowThickness = new Adw.SpinRow({
            title: _('Indicator thickness'),
            subtitle: _('Height of horizontal bar or width of vertical bar (pixels)'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 40,
                step_increment: 1,
                page_increment: 2,
                value: settings.get_int('bar-thickness'),
            }),
        });
        settings.bind('bar-thickness', rowThickness, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupGeometry.add(rowThickness);

        // Corner Radius
        const rowRadius = new Adw.SpinRow({
            title: _('Corner radius'),
            subtitle: _('Corner radius in pixels (0 — sharp corners, higher — rounded capsule)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 25,
                step_increment: 1,
                page_increment: 2,
                value: settings.get_int('bar-radius'),
            }),
        });
        settings.bind('bar-radius', rowRadius, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupGeometry.add(rowRadius);

        // Indicator Color
        const rowColor = new Adw.ActionRow({
            title: _('Indicator color'),
            subtitle: _('Click button to choose color or opacity'),
        });

        const colorDialog = new Gtk.ColorDialog({
            with_alpha: true,
            title: _('Choose SwitchBack bar color'),
        });

        const colorButton = new Gtk.ColorDialogButton({
            dialog: colorDialog,
            valign: Gtk.Align.CENTER,
        });

        const initialColor = settings.get_string('bar-color');
        const rgba = new Gdk.RGBA();
        if (rgba.parse(initialColor)) {
            colorButton.set_rgba(rgba);
        }

        colorButton.connect('notify::rgba', () => {
            const chosen = colorButton.get_rgba();
            const r = Math.round(chosen.red * 255);
            const g = Math.round(chosen.green * 255);
            const b = Math.round(chosen.blue * 255);
            const a = Number(chosen.alpha.toFixed(2));
            const colorStr = (chosen.alpha < 1)
                ? `rgba(${r}, ${g}, ${b}, ${a})`
                : `rgb(${r}, ${g}, ${b})`;
            settings.set_string('bar-color', colorStr);
        });

        settings.connect('changed::bar-color', () => {
            const updated = settings.get_string('bar-color');
            const c = new Gdk.RGBA();
            if (c.parse(updated)) {
                colorButton.set_rgba(c);
            }
        });

        rowColor.add_suffix(colorButton);
        groupGeometry.add(rowColor);

        // --- Group 4: Animation & Transitions ---
        const groupAnimation = new Adw.PreferencesGroup({
            title: _('Animation &amp; Transition Effects'),
            description: _('Indicator motion style, smooth appearance and disappearance'),
        });
        pageAppearance.add(groupAnimation);

        const animModel = Gtk.StringList.new([
            _('To center (symmetric from both sides)'),
            _('To edges (split from center outward)'),
            _('Fill from center (expand to edges)'),
            _('From edges to center (from both sides)'),
            _('To start (left / top)'),
            _('To end (right / bottom)'),
        ]);
        const animKeys = ['to-center', 'to-edges', 'fill-from-center', 'from-edges-to-center', 'to-start', 'to-end'];

        const rowAnim = new Adw.ComboRow({
            title: _('Indicator animation style'),
            subtitle: _('Motion of the bar during countdown'),
            model: animModel,
        });

        const currentAnim = settings.get_string('animation-mode');
        const animIndex = animKeys.indexOf(currentAnim);
        rowAnim.set_selected(animIndex >= 0 ? animIndex : 0);

        rowAnim.connect('notify::selected', () => {
            const idx = rowAnim.get_selected();
            if (idx >= 0 && idx < animKeys.length) {
                const selectedMode = animKeys[idx];
                if (settings.get_string('animation-mode') !== selectedMode) {
                    settings.set_string('animation-mode', selectedMode);
                } else {
                    playPreviewAnimation(selectedMode);
                }
            }
        });

        settings.connect('changed::animation-mode', () => {
            const newMode = settings.get_string('animation-mode');
            const idx = animKeys.indexOf(newMode);
            if (idx >= 0 && rowAnim.get_selected() !== idx) {
                rowAnim.set_selected(idx);
            }
            playPreviewAnimation(newMode);
        });

        const btnPlayAnim = new Gtk.Button({
            icon_name: 'media-playback-start-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Test shrink animation'),
            css_classes: ['flat'],
        });
        btnPlayAnim.connect('clicked', () => {
            const idx = rowAnim.get_selected();
            const mode = (idx >= 0 && idx < animKeys.length) ? animKeys[idx] : settings.get_string('animation-mode');
            playPreviewAnimation(mode);
        });
        rowAnim.add_suffix(btnPlayAnim);
        groupAnimation.add(rowAnim);

        // Smooth Fade Duration (ms)
        const rowFade = new Adw.SpinRow({
            title: _('Smooth appearance and fade duration (ms)'),
            subtitle: _('Duration of fade-in and fade-out animations (0 — disabled)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 2000,
                step_increment: 50,
                page_increment: 100,
                value: settings.get_int('fade-duration'),
            }),
        });

        const updateFadeSubtitle = () => {
            const val = Math.round(rowFade.get_value());
            if (val === 0) {
                rowFade.subtitle = _('0 ms — instant (smooth fading disabled)');
            } else if (val === 300) {
                rowFade.subtitle = _('300 ms (default) — balanced smooth transition');
            } else {
                rowFade.subtitle = `${val} ${_('ms')} — ${_('Smooth fade-in and fade-out duration')}`;
            }
        };
        updateFadeSubtitle();

        rowFade.connect('notify::value', () => {
            settings.set_int('fade-duration', Math.round(rowFade.get_value()));
            updateFadeSubtitle();
        });
        groupAnimation.add(rowFade);

        // Option B: Separate Fade-In and Fade-Out Expander
        const isSplitInitial = settings.get_boolean('split-fade-durations');
        const rowSplitFade = new Adw.ExpanderRow({
            title: _('Separate appearance and fade timing'),
            subtitle: _('Configure different durations for fade-in and fade-out'),
            show_enable_switch: true,
            enable_expansion: isSplitInitial,
            expanded: isSplitInitial,
        });

        const rowFadeIn = new Adw.SpinRow({
            title: _('Fade-in appearance duration (ms)'),
            subtitle: _('Smooth appearance when switching to secondary layout'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 1000,
                step_increment: 25,
                page_increment: 50,
                value: settings.get_int('fade-in-duration'),
            }),
        });

        const updateFadeInSubtitle = () => {
            const val = Math.round(rowFadeIn.get_value());
            if (val === 0) {
                rowFadeIn.subtitle = _('0 ms — instant appearance');
            } else if (val === 150) {
                rowFadeIn.subtitle = _('150 ms (default) — quick crisp entrance');
            } else {
                rowFadeIn.subtitle = `${val} ${_('ms')} — ${_('Smooth fade-in duration')}`;
            }
        };
        updateFadeInSubtitle();

        rowFadeIn.connect('notify::value', () => {
            settings.set_int('fade-in-duration', Math.round(rowFadeIn.get_value()));
            updateFadeInSubtitle();
        });
        rowSplitFade.add_row(rowFadeIn);

        const rowFadeOut = new Adw.SpinRow({
            title: _('Fade-out dissolution duration (ms)'),
            subtitle: _('Smooth fade when countdown timer expires'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 2000,
                step_increment: 50,
                page_increment: 100,
                value: settings.get_int('fade-out-duration'),
            }),
        });

        const updateFadeOutSubtitle = () => {
            const val = Math.round(rowFadeOut.get_value());
            if (val === 0) {
                rowFadeOut.subtitle = _('0 ms — instant disappearance');
            } else if (val === 800) {
                rowFadeOut.subtitle = _('800 ms (default) — soft cinematic dissolution');
            } else {
                rowFadeOut.subtitle = `${val} ${_('ms')} — ${_('Smooth fade-out duration')}`;
            }
        };
        updateFadeOutSubtitle();

        rowFadeOut.connect('notify::value', () => {
            settings.set_int('fade-out-duration', Math.round(rowFadeOut.get_value()));
            updateFadeOutSubtitle();
        });
        rowSplitFade.add_row(rowFadeOut);

        const syncSplitState = () => {
            const isSplit = rowSplitFade.enable_expansion;
            settings.set_boolean('split-fade-durations', isSplit);
            rowFade.set_sensitive(!isSplit);
            rowSplitFade.expanded = isSplit;
        };

        rowSplitFade.connect('notify::enable-expansion', syncSplitState);
        rowFade.set_sensitive(!isSplitInitial);

        groupAnimation.add(rowSplitFade);

        // --- Group 4: Screen Edge Margins ---
        const groupMargins = new Adw.PreferencesGroup({
            title: _('Screen Edge Margins'),
            description: _('Custom margins in pixels for each side of the display'),
        });
        pageAppearance.add(groupMargins);

        const rowMarginTop = new Adw.SpinRow({
            title: _('Top margin (px)'),
            subtitle: _('Gap from the top screen edge (top panel)'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 200, step_increment: 1, page_increment: 5, value: settings.get_int('margin-top') }),
        });
        settings.bind('margin-top', rowMarginTop, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupMargins.add(rowMarginTop);

        const rowMarginBottom = new Adw.SpinRow({
            title: _('Bottom margin (px)'),
            subtitle: _('Gap from the bottom screen edge (dock)'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 200, step_increment: 1, page_increment: 5, value: settings.get_int('margin-bottom') }),
        });
        settings.bind('margin-bottom', rowMarginBottom, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupMargins.add(rowMarginBottom);

        const rowMarginLeft = new Adw.SpinRow({
            title: _('Left margin (px)'),
            subtitle: _('Gap from the left screen edge'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 200, step_increment: 1, page_increment: 5, value: settings.get_int('margin-left') }),
        });
        settings.bind('margin-left', rowMarginLeft, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupMargins.add(rowMarginLeft);

        const rowMarginRight = new Adw.SpinRow({
            title: _('Right margin (px)'),
            subtitle: _('Gap from the right screen edge'),
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 200, step_increment: 1, page_increment: 5, value: settings.get_int('margin-right') }),
        });
        settings.bind('margin-right', rowMarginRight, 'value', Gio.SettingsBindFlags.DEFAULT);
        groupMargins.add(rowMarginRight);

        const updateAppearanceSensitivity = () => {
            const isVisualActive = settings.get_boolean('auto-switch-enabled') && settings.get_boolean('show-indicator');
            pageAppearance.sensitive = isVisualActive;
        };
        updateAppearanceSensitivity();
        settings.connect('changed::show-indicator', updateAppearanceSensitivity);
        settings.connect('changed::auto-switch-enabled', updateAppearanceSensitivity);

        // ══════════════════════════════════════════════════════════════
        // PAGE 3: SERVICE & SYSTEM
        // ══════════════════════════════════════════════════════════════
        const pageService = new Adw.PreferencesPage({
            title: _('Service'),
            icon_name: 'system-run-symbolic',
        });
        window.add(pageService);

        const groupDaemon = new Adw.PreferencesGroup({
            title: _('Background Service Management'),
            description: _('Systemd user service status and control for switchback-daemon'),
        });
        pageService.add(groupDaemon);

        // 1. Service Status
        const rowDaemonStatus = new Adw.ActionRow({
            title: _('Service Status'),
        });
        const iconDaemonStatus = new Gtk.Image({
            pixel_size: 20,
            valign: Gtk.Align.CENTER,
        });
        rowDaemonStatus.add_prefix(iconDaemonStatus);
        groupDaemon.add(rowDaemonStatus);

        // 2. Switch: Service Active (Start / Stop)
        const rowDaemonActive = new Adw.SwitchRow({
            title: _('Run background service'),
            subtitle: _('Start or stop the hardware event monitoring daemon'),
        });
        groupDaemon.add(rowDaemonActive);

        // 3. Switch: Service Autostart
        const rowDaemonAutostart = new Adw.SwitchRow({
            title: _('Service autostart'),
            subtitle: _('Start daemon automatically when logging into Ubuntu'),
        });
        groupDaemon.add(rowDaemonAutostart);

        // 4. Button: Restart Service
        const rowRestart = new Adw.ActionRow({
            title: _('Restart Service'),
            subtitle: _('Force restart daemon to re-scan hardware devices'),
        });
        const btnRestart = new Gtk.Button({
            label: _('Restart'),
            valign: Gtk.Align.CENTER,
        });
        rowRestart.add_suffix(btnRestart);
        groupDaemon.add(rowRestart);

        const refreshDaemonUI = () => {
            const activeStr = getCmdOutput('systemctl --user is-active switchback-daemon.service');
            const enabledStr = getCmdOutput('systemctl --user is-enabled switchback-daemon.service');
            const isActive = (activeStr === 'active');
            const isEnabled = (enabledStr === 'enabled');

            rowDaemonStatus.subtitle = isActive
                ? _('Service is active and monitoring physical keyboard via /dev/input')
                : _('Service is stopped (timer cannot detect typing)');

            iconDaemonStatus.icon_name = isActive ? 'emblem-ok-symbolic' : 'dialog-warning-symbolic';

            rowDaemonActive.set_active(isActive);
            rowDaemonAutostart.set_active(isEnabled);
        };

        refreshDaemonUI();

        rowDaemonActive.connect('notify::active', () => {
            const currentActive = (getCmdOutput('systemctl --user is-active switchback-daemon.service') === 'active');
            const targetActive = rowDaemonActive.get_active();
            if (currentActive !== targetActive) {
                runCmd(targetActive
                    ? 'systemctl --user start switchback-daemon.service'
                    : 'systemctl --user stop switchback-daemon.service');
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                    refreshDaemonUI();
                    return GLib.SOURCE_REMOVE;
                });
            }
        });

        rowDaemonAutostart.connect('notify::active', () => {
            const currentEnabled = (getCmdOutput('systemctl --user is-enabled switchback-daemon.service') === 'enabled');
            const targetEnabled = rowDaemonAutostart.get_active();
            if (currentEnabled !== targetEnabled) {
                runCmd(targetEnabled
                    ? 'systemctl --user enable switchback-daemon.service'
                    : 'systemctl --user disable switchback-daemon.service');
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                    refreshDaemonUI();
                    return GLib.SOURCE_REMOVE;
                });
            }
        });

        btnRestart.connect('clicked', () => {
            runCmd('systemctl --user restart switchback-daemon.service');
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                refreshDaemonUI();
                return GLib.SOURCE_REMOVE;
            });
        });

        // --- Group 2: Security & Privacy ---
        const groupSecurity = new Adw.PreferencesGroup({
            title: _('Security &amp; Privacy'),
        });
        pageService.add(groupSecurity);

        const rowSecurityInfo = new Adw.ActionRow({
            title: _('Data Privacy &amp; Zero Logging'),
            subtitle: _('SwitchBack DOES NOT record, store, or analyze typed text. The daemon strictly tracks the timestamp of physical keypresses to reset the timer.'),
        });
        const iconSec = new Gtk.Image({
            icon_name: 'channel-secure-symbolic',
            pixel_size: 20,
            valign: Gtk.Align.CENTER,
        });
        rowSecurityInfo.add_prefix(iconSec);
        groupSecurity.add(rowSecurityInfo);

        const rowIsoInfo = new Adw.ActionRow({
            title: _('Hardware Mouse Isolation'),
            subtitle: _('Clicks, cursor movement, and mouse wheels (including horizontal wheels) are filtered at the kernel level and do not affect the typing timer.'),
        });
        const iconMouse = new Gtk.Image({
            icon_name: 'input-mouse-symbolic',
            pixel_size: 20,
            valign: Gtk.Align.CENTER,
        });
        rowIsoInfo.add_prefix(iconMouse);
        groupSecurity.add(rowIsoInfo);

        // --- Group 3: About ---
        const groupAbout = new Adw.PreferencesGroup({
            title: _('About'),
        });
        pageService.add(groupAbout);

        const rowVersion = new Adw.ActionRow({
            title: 'SwitchBack Ubuntu',
            subtitle: _('For GNOME Shell 45 – 51, Wayland &amp; X11'),
        });

        // App Icon
        const extIconPath = GLib.build_filenamev([this.path, 'icons', 'switchback.svg']);
        const sysIconPath = GLib.build_filenamev([GLib.get_home_dir(), '.local/share/icons/hicolor/scalable/apps/switchback.svg']);
        const chosenIconPath = GLib.file_test(extIconPath, GLib.FileTest.EXISTS)
            ? extIconPath
            : (GLib.file_test(sysIconPath, GLib.FileTest.EXISTS) ? sysIconPath : null);

        let appIcon;
        if (chosenIconPath) {
            appIcon = Gtk.Image.new_from_file(chosenIconPath);
            appIcon.pixel_size = 40;
            appIcon.valign = Gtk.Align.CENTER;
        } else {
            appIcon = new Gtk.Image({
                icon_name: 'preferences-desktop-keyboard-symbolic',
                pixel_size: 28,
                valign: Gtk.Align.CENTER,
            });
        }
        rowVersion.add_prefix(appIcon);

        const currentVersion = this.metadata?.['version-name'] || (this.metadata?.version ? String(this.metadata.version) : '2.4.0');
        const labelVersion = new Gtk.Label({
            label: currentVersion,
            css_classes: ['dim-label', 'title-4'],
            valign: Gtk.Align.CENTER,
        });
        rowVersion.add_suffix(labelVersion);
        groupAbout.add(rowVersion);

        const rowCredits = new Adw.ActionRow({
            title: _('Developers &amp; Contributors'),
            subtitle: 'Romanov E. (@Romanov-E), Antigravity (Google DeepMind)',
        });
        const iconCredits = new Gtk.Image({
            icon_name: 'avatar-default-symbolic',
            valign: Gtk.Align.CENTER,
        });
        rowCredits.add_prefix(iconCredits);
        groupAbout.add(rowCredits);

        const rowGithub = new Adw.ActionRow({
            title: _('GitHub Repository'),
            subtitle: 'https://github.com/Romanov-E/SwitchBack-Ubuntu',
        });
        const btnLink = new Gtk.LinkButton({
            uri: 'https://github.com/Romanov-E/SwitchBack-Ubuntu',
            icon_name: 'web-browser-symbolic',
            valign: Gtk.Align.CENTER,
        });
        rowGithub.add_suffix(btnLink);
        groupAbout.add(rowGithub);

        window.connect('close-request', () => {
            stopAnimation();
            return false;
        });
    }
}
