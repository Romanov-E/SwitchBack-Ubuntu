import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Graphene from 'gi://Graphene';

Adw.init();
const res = Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource');
res._register();

const {ExtensionPreferences} = await import('resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js');

const extPath = '/home/romanov/.local/share/gnome-shell/extensions/switchback@local';
const metadata = {
    uuid: 'switchback@local',
    dir: Gio.File.new_for_path(extPath),
    path: extPath,
    'settings-schema': 'org.gnome.shell.extensions.switchback',
    'gettext-domain': 'switchback'
};

const SwitchBackPreferences = (await import(`file://${extPath}/prefs.js`)).default;
const prefs = new SwitchBackPreferences(metadata);
ExtensionPreferences.lookupByUUID = (uuid) => prefs;

const isEn = ARGV.includes('--en');
const suffix = isEn ? '-en.png' : '.png';
const outDir = '/home/romanov/Документы/Antygravity projects/switchback-ubuntu/docs/screenshots';

const app = new Adw.Application({
    application_id: 'org.gnome.PrefsCapture_' + (isEn ? 'en_' : 'ru_') + Date.now(),
    flags: Gio.ApplicationFlags.NON_UNIQUE
});

function captureWindow(win, outPath) {
    const w = win.get_width();
    const h = win.get_height();
    const paintable = Gtk.WidgetPaintable.new(win);
    const snapshot = new Gtk.Snapshot();
    paintable.snapshot(snapshot, w, h);
    const node = snapshot.to_node();
    if (node) {
        const renderer = win.get_renderer();
        const rect = new Graphene.Rect();
        rect.init(0, 0, w, h);
        const texture = renderer.render_texture(node, rect);
        texture.save_to_png(outPath);
        console.log(`Saved screenshot to: ${outPath} (${w}x${h})`);
    }
}

app.connect('activate', () => {
    const win = new Adw.PreferencesWindow({
        application: app,
    });
    win.set_size_request(680, 1120);

    const pages = [];
    const origAdd = win.add.bind(win);
    win.add = (page) => {
        pages.push(page);
        origAdd(page);
    };

    prefs.fillPreferencesWindow(win);
    win.present();

    // Tab 1: Behavior
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
        win.set_visible_page(pages[0]);
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            captureWindow(win, `${outDir}/tab1-behavior${suffix}`);

            // Tab 2: Appearance
            win.set_visible_page(pages[1]);
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                captureWindow(win, `${outDir}/tab2-appearance${suffix}`);

                // Tab 3: Service
                win.set_visible_page(pages[2]);
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                    captureWindow(win, `${outDir}/tab3-service${suffix}`);
                    console.log(`All tabs captured for suffix ${suffix}!`);
                    app.quit();
                    return GLib.SOURCE_REMOVE;
                });
                return GLib.SOURCE_REMOVE;
            });
            return GLib.SOURCE_REMOVE;
        });
        return GLib.SOURCE_REMOVE;
    });
});

app.run([]);
