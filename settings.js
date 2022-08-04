/**
 * OFP - Overview Feature Pack
 * Settings
 *
 * @author     GdH <G-dH@github.com>
 * @copyright  2022
 * @license    GPL-3.0
 */

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
        this._gsettings.connect('changed', this._updateCachedSettings.bind(this));
        this._connectionIds = [];
        this.options = {
            dashShiftClickMovesAppToCurrentWs: ['boolean', 'dash-shift-click-moves-app-to-current-ws'],
            dashHoverIconHighlitsWindows: ['boolean', 'dash-hover-icon-highlights-windows'],
            dashShowWindowsBeforeActivation: ['boolean', 'dash-show-windows-before-activation'],
            dashClickFollowsRecentWindow: ['boolean', 'dash-click-follows-recent-window'],
            dashScrollSwitchesAppWindowsWs: ['boolean', 'dash-scroll-switches-app-windows-ws'],
            spaceActivatesDash: ['boolean', 'space-activates-dash'],
            moveTitlesIntoWindows: ['boolean', 'move-titles-into-windows'],
            shiftReordersWs: ['boolean', 'shift-reorders-ws'],
            hoverActivatesWindowOnLeave: ['boolean', 'hover-activates-window-on-leave'],
            appMenuMoveAppToWs: ['boolean', 'app-menu-move-app-to-ws'],
            appMenuForceQuit:['boolean', 'app-menu-force-quit'],
            appMenuCloseWindowsOnCurrentWs: ['boolean', 'app-menu-close-windows-on-current-ws'],
            fullscreenHotCorner: ['boolean', 'fullscreen-hot-corner'],
            alwaysShowWindowTitles: ['boolean', 'always-show-window-titles'],
            searchWindowsEnable: ['boolean', 'search-windows-enable'],
            searchWindowsSpaceKey: ['boolean', 'search-windows-space-key'],
            searchWindowsCommands: ['boolean', 'search-windows-commands'],
            searchWindowsShiftMoves: ['boolean', 'search-windows-shift-moves'],
            searchWindowsClickEmptySpace: ['boolean', 'search-windows-click-empty-space'],
            searchWindowsFuzzy: ['boolean', 'search-windows-fuzzy'],
            showWsTmbLabels: ['int', 'show-wst-labels'],
            showWsTmbLabelsOnHover: ['boolean', 'show-wst-labels-on-hover'],
            showWsSwitcherBg: ['boolean', 'show-ws-switcher-bg'],
            wsTmbSwitchOnHover: ['boolean', 'ws-tmb-switch-on-hover'],
            appGridOrder: ['int', 'app-grid-order'],
            appGridIncludeDash: ['boolean', 'app-grid-fav-run'],
        }
        this.cachedOptions = {};
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

    _updateCachedSettings(settings, key) {
        Object.keys(this.options).forEach(v => this.get(v, true));
    }

    get(option, updateCache = false) {
        if (updateCache || this.cachedOptions[option] === undefined) {
            const [format, key, settings] = this.options[option];
            let gSettings;
            if (settings !== undefined) {
                gSettings = settings();
            } else {
                gSettings = this._gsettings;
            }

            this.cachedOptions[option] = gSettings.get_value(key).deep_unpack();
        }

        return this.cachedOptions[option];
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
