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

export default class SwitchBackPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this.initTranslations();
        window.set_default_size(680, 740);
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
            title: _('Timer & Switch Parameters'),
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

        // --- Group 1: Screen Position ---
        const groupPosition = new Adw.PreferencesGroup({
            title: _('Indicator Position'),
            description: _('Screen edge and display mode (single or paired)'),
        });
        pageAppearance.add(groupPosition);

        const positionModel = Gtk.StringList.new([
            _('Top of screen (horizontal)'),
            _('Bottom of screen (horizontal)'),
            _('Top + Bottom (two horizontal bars)'),
            _('Left of screen (vertical)'),
            _('Right of screen (vertical)'),
            _('Left + Right (two vertical bars)'),
        ]);
        const positionKeys = ['top', 'bottom', 'top-bottom', 'left', 'right', 'left-right'];

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
        groupPosition.add(rowPosition);

        // --- Group 2: Individual Screen Margins ---
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

        // --- Group 3: Dimensions & Geometry ---
        const groupGeometry = new Adw.PreferencesGroup({
            title: _('Dimensions & Style'),
            description: _('Length, thickness, shape and color of the bar'),
        });
        pageAppearance.add(groupGeometry);

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
        rowLength.connect('notify::value', () => {
            settings.set_double('bar-length-fraction', rowLength.get_value() / 100.0);
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

        // --- Group 4: Animation ---
        const groupAnimation = new Adw.PreferencesGroup({
            title: _('Shrink Animation'),
            description: _('Direction of bar shrinking during countdown'),
        });
        pageAppearance.add(groupAnimation);

        const animModel = Gtk.StringList.new([
            _('To center (symmetric from both sides)'),
            _('To start (left / top)'),
            _('To end (right / bottom)'),
        ]);
        const animKeys = ['to-center', 'to-start', 'to-end'];

        const rowAnim = new Adw.ComboRow({
            title: _('Shrink animation style'),
            subtitle: _('Where the indicator collapses as time expires'),
            model: animModel,
        });

        const currentAnim = settings.get_string('animation-mode');
        const animIndex = animKeys.indexOf(currentAnim);
        rowAnim.set_selected(animIndex >= 0 ? animIndex : 0);

        rowAnim.connect('notify::selected', () => {
            const idx = rowAnim.get_selected();
            if (idx >= 0 && idx < animKeys.length) {
                settings.set_string('animation-mode', animKeys[idx]);
            }
        });
        groupAnimation.add(rowAnim);

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
            title: _('Security & Privacy'),
        });
        pageService.add(groupSecurity);

        const rowSecurityInfo = new Adw.ActionRow({
            title: _('Data Privacy & Zero Logging'),
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
            title: _('SwitchBack Ubuntu Version'),
            subtitle: _('For GNOME Shell 45 – 51, Wayland & X11'),
        });
        const labelVersion = new Gtk.Label({
            label: '2.2.0',
            css_classes: ['dim-label', 'title-4'],
            valign: Gtk.Align.CENTER,
        });
        rowVersion.add_suffix(labelVersion);
        groupAbout.add(rowVersion);

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
    }
}
