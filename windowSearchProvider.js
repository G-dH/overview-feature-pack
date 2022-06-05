// Window Search Provider
// GPL v3 ©G-dH@Github.com
'use strict';

const { GLib, GObject, Gio, Gtk, Meta, St, Shell } = imports.gi;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;
const _ = Me.imports.settings._;

const ModifierType = imports.gi.Clutter.ModifierType;

let gOptions;
let windowSearchProvider = null;
let _enableTimeoutId = 0;

const Action = {
    NONE: 0,
    CLOSE: 1,
    CLOSE_ALL: 2,
    MOVE_TO_WS: 3,
    MOVE_ALL_TO_WS: 4
}

function init() {
}

function getOverviewSearchResult() {
        return Main.overview._overview.controls._searchController._searchResults;
}

function enable(options) {
    gOptions = options;
    // delay because Fedora had problem to register a new provider soon after Shell restarts
    _enableTimeoutId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        2000,
        () => {
            if (windowSearchProvider == null) {
                windowSearchProvider = new WindowSearchProvider();
                getOverviewSearchResult()._registerProvider(
                    windowSearchProvider
                );
            }
            _enableTimeoutId = 0;
            return GLib.SOURCE_REMOVE;
        }
    );
}

function disable() {
    if (windowSearchProvider) {
        getOverviewSearchResult()._unregisterProvider(
            windowSearchProvider
        );
        windowSearchProvider = null;
    }
    if (_enableTimeoutId) {
        GLib.source_remove(_enableTimeoutId);
        _enableTimeoutId = 0;
    }
    gOptions = null;
}

function fuzzyMatch(term, text) {
    let pos = -1;
    const matches = [];
    // convert all accented chars to their basic form and to lower case
    const _text = text;//.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const _term =  term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // if term matches the substring exactly, gains the heighest weight
   if (_text.includes(_term)) {
      return 0;
    }

    for (let i = 0; i < _term.length; i++) {
        let c = _term[i];
        let p;
        if (pos > 0)
            p = _term[i - 1];
        while (true) {
            pos += 1;
            if (pos >= _text.length) {
                return -1;
            }
            if (_text[pos] == c) {
                matches.push(pos);
                break;
            } else if (_text[pos] == p) {
                matches.pop();
                matches.push(pos);
            }
        }
    }

    // add all position to get a waight of the result
    // results closer to the beginning of the text and term characters closer to each other will gain more weigt.
    return matches.reduce((r, p) => r + p) - matches.length * matches[0] + matches[0];
}

function makeResult(window, i) {
    const app = Shell.WindowTracker.get_default().get_window_app(window);
    const appName = app ? app.get_name() : 'Unknown';
    const windowTitle = window.get_title();
    const wsIndex = window.get_workspace().index();

    return {
      'id': i,
      // convert all accented chars to their basic form and lower case for search
      'name': `${wsIndex + 1}: ${windowTitle} ${appName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
      'appName': appName,
      'windowTitle': windowTitle,
      'window': window
    }
}

const closeSelectedRegex = /^\/x!$/;
const closeAllResultsRegex = /^\/xa!$/;
const moveToWsRegex = /^\/m[0-9]+$/;
const moveAllToWsRegex = /^\/ma[0-9]+$/;

var WindowSearchProvider = class WindowSearchProvider {
    constructor() {
        this.appInfo = Gio.AppInfo.create_from_commandline('true', 'Open Windows', null);
        this.appInfo.get_description = () => 'List of open windows';
        this.appInfo.get_name = () => 'Open Windows';
        this.appInfo.get_id = () => Me.metadata.uuid;
        this.appInfo.get_icon = () => Gio.icon_new_for_string('focus-windows-symbolic');
        this.appInfo.should_show = () => true;
        this.id = Me.metadata.uuid;
        this.title = 'Window Search Provider',
        this.canLaunchSearch = true;
        this.isRemoteProvider = false;

        this.action = 0;
        this.prefix = 'wq:';
    }

    _getResultSet (terms) {
        if (terms[0] === this.prefix.replace(':', '') || terms[0] === this.prefix) {
            terms.splice(0,1);
            if (!terms.length) {
                terms = [' '];
            }
        }

        if (gOptions.get('searchWindowsCommands')) {
            this.action = 0;
            this.targetWs = 0;

            const lastTerm = terms[terms.length - 1];
            if (lastTerm.match(closeSelectedRegex)) {
                this.action = Action.CLOSE;
            } else if (lastTerm.match(closeAllResultsRegex)) {
                this.action = Action.CLOSE_ALL;
            } else if (lastTerm.match(moveToWsRegex)) {
                this.action = Action.MOVE_TO_WS;
            } else if (lastTerm.match(moveAllToWsRegex)) {
                this.action = Action.MOVE_ALL_TO_WS;
            }
            if (this.action) {
                terms.pop();
                if (this.action === Action.MOVE_TO_WS || this.action === Action.MOVE_ALL_TO_WS) {
                    this.targetWs = parseInt(lastTerm.replace(/^[^0-9]+/, ''));
                }
            } else if (lastTerm.startsWith('/')) {
                terms.pop();
            }
        }

        const candidates = this.windows;
        const _terms = [].concat(terms);
        let match = null;

        const term = _terms.join(' ');
        match = (s) => {
            return fuzzyMatch(term, s);
        }

        const results = [];
        let m;
        for (let key in candidates) {
            m = fuzzyMatch(term, candidates[key].name);
            if (m !== -1) {
                results.push({ weight: m, id: key });
            }
        }

        results.sort((a, b) => a.weight > b.weight);
        const currentWs = global.workspace_manager.get_active_workspace_index();
        // prefer current workspace
        results.sort((a, b) => (this.windows[a.id].window.get_workspace().index() !== currentWs) && (this.windows[b.id].window.get_workspace().index() === currentWs));
        results.sort((a, b) => ((_terms != ' ') && (a.weight > 0 && b.weight === 0)));

        this.resultIds = results.map((item) => item.id);
        return this.resultIds;
    }
    
    getResultMetas (resultIds, callback) {
        const metas = resultIds.map((id) => this.getResultMeta(id));
        callback(metas);
    }

    getResultMeta (resultId) {
        const result = this.windows[resultId];
        const wsIndex = result.window.get_workspace().index();
        const app = Shell.WindowTracker.get_default().get_window_app(result.window);
        return {
            'id': resultId,
            'name': `${wsIndex + 1}: ${result.windowTitle}`,
            'description': result.appName,
            'createIcon': (size) => {
                return app
                    ? app.create_icon_texture(size)
                    : new St.Icon({ icon_name: 'icon-missing', icon_size: size });
            }
        }
    }

    launchSearch(terms, timeStamp) {
    }

    activateResult (resultId, terms, timeStamp) {
        const [,,state] = global.get_pointer();

        const isCtrlPressed = (state & ModifierType.CONTROL_MASK) != 0;
        const isShiftPressed = (state & ModifierType.SHIFT_MASK) != 0;

        if (!this.action) {
            const currentWs = global.workspaceManager.get_active_workspace().index() + 1;
            if (isShiftPressed && !isCtrlPressed && gOptions.get('searchWindowsShiftMoves')) {
                this.action = Action.MOVE_TO_WS;
                this.targetWs = currentWs;
            } else if (isShiftPressed && isCtrlPressed) {
                this.action = Action.MOVE_ALL_TO_WS;
                this.targetWs = currentWs;
            }
        }


        if (!this.action) {
            const result = this.windows[resultId];
            Main.activateWindow(result.window);
            return;
        }

        switch (this.action) {
        case Action.CLOSE:
            this._closeWindows([resultId]);
            break;
        case Action.CLOSE_ALL:
            this._closeWindows(this.resultIds);
            break;
        case Action.MOVE_TO_WS:
            this._moveWindowsToWs(resultId, [resultId], this.targetWs);
            break;
        case Action.MOVE_ALL_TO_WS:
            this._moveWindowsToWs(resultId, this.resultIds, this.targetWs);
            break;
        }
    }

    _closeWindows(ids) {
        let time = global.get_current_time();
        for (let i = 0; i < ids.length; i++) {
            this.windows[ids[i]].window.delete(time + i);
        }
        Main.notify('Window Search Provider', `Closed ${ids.length} windows.`);
    }

    _moveWindowsToWs(selectedId, resultIds, wsIndex) {
        if (!wsIndex || wsIndex > global.workspaceManager.n_workspaces) {
            return false;
        }
        const ws = global.workspaceManager.get_workspace_by_index(wsIndex - 1);
        for (let i = 0; i < resultIds.length; i++) {
            this.windows[resultIds[i]].window.change_workspace(ws);
        }
        const selectedWin = this.windows[selectedId].window;
        Main.activateWindow(selectedWin);
    }

    getInitialResultSet (terms, callback, cancellable) {
        let windows;
        this.windows = windows = {};
        global.display.get_tab_list(Meta.TabList.NORMAL, null).map(
            (v, i) => windows[`${i}-${v.get_id()}`] = makeResult(v, `${i}-${v.get_id()}`)
        );
        callback(this._getResultSet(terms));
    }

    filterResults (results, maxResults) {
        //return results.slice(0, maxResults);
        return results;
    }
    
    getSubsearchResultSet (previousResults, terms, callback, cancellable) {
        // if we return previous results, quick typers get non-actual results
        callback(this._getResultSet(terms));
    }

    createResultOjbect(resultMeta) {
        const app = Shell.WindowTracker.get_default().get_window_app(resultMeta.id);
        return new AppIcon(app);
    }
}
