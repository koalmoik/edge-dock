// Edge Dock — the stock GNOME dash as an auto-hiding dock on the bottom edge.
// Fully event driven: no polling, no per-frame work while hidden.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Dash} from 'resource:///org/gnome/shell/ui/dash.js';

const SHOW_DELAY_MS = 80;     // dwell at the edge before showing
const HIDE_DELAY_MS = 400;    // grace period after the pointer leaves
const ANIM_MS = 180;
const DASH_HEIGHT_RATIO = 0.16; // same as the overview -> same icon size

export default class EdgeDockExtension extends Extension {
    enable() {
        this._shown = false;
        this._menuOpen = false;
        this._dragging = false;
        this._showId = 0;
        this._hideId = 0;

        // 1px hot strip on the bottom edge (hidden in fullscreen), stacked below the dock
        this._trigger = new St.Widget({reactive: true, track_hover: true, height: 1});
        this._trigger.connectObject('notify::hover', () => {
            if (this._trigger.hover)
                this._scheduleShow();
            else {
                this._cancelShow();
                this._scheduleHide();
            }
        }, this);
        Main.layoutManager.addChrome(this._trigger, {trackFullscreen: true});

        // The dock itself
        this._dash = new Dash();
        const origMenuChanged = this._dash._itemMenuStateChanged.bind(this._dash);
        this._dash._itemMenuStateChanged = (item, opened) => {
            origMenuChanged(item, opened);
            this._menuOpen = opened;
            if (!opened)
                this._scheduleHide();
        };
        this._dash.showAppsButton.connectObject('notify::checked', btn => {
            if (!btn.checked)
                return;
            btn.checked = false;
            this._hide(true);
            Main.overview.showApps();
        }, this);

        this._dock = new St.Bin({
            style_class: 'edge-dock',
            reactive: true,
            track_hover: true,
            child: this._dash,
            visible: false,
        });
        this._dock.connectObject(
            'notify::hover', () => this._dock.hover ? this._cancelHide() : this._scheduleHide(),
            'notify::width', () => this._reposition(),
            'notify::height', () => this._reposition(),
            this);
        Main.layoutManager.addChrome(this._dock);

        Main.layoutManager.connectObject('monitors-changed', () => this._reposition(), this);
        Main.overview.connectObject(
            'showing', () => this._hide(true),
            'item-drag-begin', () => {
                this._dragging = true;
            },
            'item-drag-end', () => this._endDrag(),
            'item-drag-cancelled', () => this._endDrag(),
            this);

        this._reposition();
    }

    disable() {
        this._cancelShow();
        this._cancelHide();
        Main.layoutManager.disconnectObject(this);
        Main.overview.disconnectObject(this);
        this._trigger?.destroy();
        this._dock?.destroy();   // destroys the dash too
        this._trigger = this._dock = this._dash = null;
    }

    _reposition() {
        const m = Main.layoutManager.primaryMonitor;
        if (!m || !this._dock)
            return;
        this._dash.setMaxSize(m.width, Math.round(m.height * DASH_HEIGHT_RATIO));
        this._trigger.set_position(m.x, m.y + m.height - 1);
        this._trigger.set_width(m.width);
        const [, natW] = this._dock.get_preferred_width(-1);
        const [, natH] = this._dock.get_preferred_height(natW);
        this._dock.set_position(
            Math.round(m.x + (m.width - natW) / 2),
            m.y + m.height - natH);
    }

    _scheduleShow() {
        if (this._shown || this._showId || Main.overview.visible)
            return;
        this._showId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SHOW_DELAY_MS, () => {
            this._showId = 0;
            this._show();
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelShow() {
        if (this._showId)
            GLib.source_remove(this._showId);
        this._showId = 0;
    }

    _scheduleHide() {
        if (!this._shown || this._hideId)
            return;
        this._hideId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HIDE_DELAY_MS, () => {
            this._hideId = 0;
            if (!this._dock.hover && !this._trigger.hover && !this._menuOpen && !this._dragging)
                this._hide();
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelHide() {
        if (this._hideId)
            GLib.source_remove(this._hideId);
        this._hideId = 0;
    }

    _endDrag() {
        this._dragging = false;
        this._scheduleHide();
    }

    _show() {
        if (this._shown)
            return;
        this._shown = true;
        this._dock.show();
        this._reposition();
        this._dock.remove_all_transitions();
        this._dock.translation_y = this._dock.height;
        this._dock.ease({
            translation_y: 0,
            duration: ANIM_MS,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
        this._scheduleHide(); // hides again if the pointer never enters the dock
    }

    _hide(instant = false) {
        this._cancelShow();
        this._cancelHide();
        if (!this._shown)
            return;
        this._shown = false;
        this._menuOpen = false;
        this._dock.remove_all_transitions();
        if (instant) {
            this._dock.hide();
            return;
        }
        this._dock.ease({
            translation_y: this._dock.height,
            duration: ANIM_MS,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => this._dock?.hide(),
        });
    }
}
