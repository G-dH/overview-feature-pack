// Window Search Provider
// GPL v3 ©G-dH@Github.com
'use strict';

const { GObject, Gio, Gtk, Meta, St, Shell } = imports.gi;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const _ = Me.imports.settings._;

let windowSearchProvider = null;

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

function match(pattern, string) {
    // remove diacritics and accents from letters
    let s = string.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let p = pattern.toLowerCase();
    let ps = p.split(/ +/);

    // allows to use multiple exact paterns separated by space in arbitrary order
    for (let w of ps) {
        if (!s.match(w)) {
            return false;
        }
    }
    return true;
}

function makeResult(window, i) {
    const app = Shell.WindowTracker.get_default().get_window_app(window);
    const appName = app ? app.get_name() : 'Unknown';
    const windowTitle = window.get_title();
    const wsIndex = window.get_workspace().index();

    return {
      'id': i,
      // convert all accented chars to their basic form and lower case for search
      'name': `${wsIndex + 1}: ${appName}: ${windowTitle}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
      'appName': appName,
      'windowTitle': windowTitle,
      'window': window
    }
}

var WindowSearchProvider = class WindowSearchProvider {
    constructor() {
        this.appInfo = Gio.DesktopAppInfo.new('org.gnome.Nautilus.desktop');
        this.appInfo.get_description = () => 'List of open windows';
        this.appInfo.get_name = () => 'Open Windows';
        this.appInfo.get_id = () => Me.metadata.uuid;
        this.appInfo.get_icon = () => Gio.icon_new_for_string('focus-windows-symbolic');
        this.appInfo.should_show = () => true;
        this.appInfo.canLaunchSearch = () => false;
        this.appInfo.isRemoteProvider = () => true;
    }

    _getResultSet (terms) {
        if (terms[0] === 'wq' || terms[0] === 'wq:') {
            terms.splice(0,1);
            if (!terms.length) {
                terms = [' '];
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
        
    activateResult (resultId, terms) {
            const result = this.windows[resultId]
            Main.activateWindow(result.window)
            //Main.overview.hide();
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
        return this.getInitialResultSet(terms, callback, cancellable);
        //return previousResults;
    }

    createResultOjbect(resultMeta) {
        const app = Shell.WindowTracker.get_default().get_window_app(resultMeta.id);
        return new AppIcon(app);
    }
}

function init() {
}

function getOverviewSearchResult() {
        return Main.overview._overview.controls._searchController._searchResults;
}

function enable() {
    if (windowSearchProvider == null) {
        windowSearchProvider = new WindowSearchProvider();

        getOverviewSearchResult()._registerProvider(
            windowSearchProvider
        );
    }
}

function disable() {
    if (windowSearchProvider) {
        getOverviewSearchResult()._unregisterProvider(
            windowSearchProvider
        );
        windowSearchProvider = null;
    }
}
