// Workspace Switcher Manager
// GPL v3 ©G-dH@Github.com
'use strict';

const { GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
var   shellVersion = parseFloat(Config.PACKAGE_VERSION);

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
var _ = Gettext.gettext;

const _schema = 'org.gnome.shell.extensions.overview-feature-pack';

var Options = class Options {
    constructor() {
        this._gsettings = ExtensionUtils.getSettings(_schema);
        this._connectionIds = [];
        this.options = {
            dashShiftClickMovesAppToCurrentWs: ['boolean', 'dash-shift-click-moves-app-to-current-ws'],
            dashHoverIconHighlitsWindows: ['boolean', 'dash-hover-icon-highlights-windows'],
            dashShowWindowsBeforeActivation: ['boolean', 'dash-show-windows-before-activation'],
            dashClickFollowsRecentWindow: ['boolean', 'dash-click-follows-recent-window'],
            dashScrollSwitchesAppWindowsWs: ['boolean', 'dash-scroll-switches-app-windows-ws'],
            spaceActivatesDash: ['boolean', 'space-activates-dash'],
            moveTitlesIntoWindows: ['boolean', 'move-titles-into-windows'],
            addReorderWs: ['boolean', 'add-reorder-ws'],
            hoverActivatesWindowOnLeave: ['boolean', 'hover-activates-window-on-leave'],
            appMenuMoveAppToWs: ['boolean', 'app-menu-move-app-to-ws'],
            appMenuForceQuit:['boolean', 'app-menu-force-quit'],
            fullscreenHotCorner: ['boolean', 'fullscreen-hot-corner']
        }
    }

    connect(name, callback) {
        const id = this._gsettings.connect(name, callback);
        this._connectionIds.push(id);
        return id;
    }

    destroy() {
        this._connectionIds.forEach(id => this._gsettings.disconnect(id));
        if (this._writeTimeoutId) {
            GLib.source_remove(this._writeTimeoutId);
            this._writeTimeoutId = 0;
        }
    }

    get(option) {
        const [format, key, settings] = this.options[option];

        let gSettings = this._gsettings;

        if (settings !== undefined) {
            gSettings = settings();
        }

        return gSettings.get_value(key).deep_unpack();
    }

    set(option, value) {
        const [format, key, settings] = this.options[option];

        let gSettings = this._gsettings;

        if (settings !== undefined) {
            gSettings = settings();
        }

        switch (format) {
            case 'boolean':
                gSettings.set_boolean(key, value);
                break;
            case 'int':
                gSettings.set_int(key, value);
                break;
            case 'string':
                gSettings.set_string(key, value);
                break;
            case 'strv':
                gSettings.set_strv(key, value);
                break;
        }
    }

    getDefault(option) {
        const [format, key, settings] = this.options[option];

        let gSettings = this._gsettings;

        if (settings !== undefined) {
            gSettings = settings();
        }

        return gSettings.get_default_value(key).deep_unpack();
    }
};
