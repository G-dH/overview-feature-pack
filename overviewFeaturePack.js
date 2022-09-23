/**
 * OFP - Overview Feature Pack
 * OverviewFeaturePack
 *
 * @author     GdH <G-dH@github.com>
 * @copyright  2022
 * @license    GPL-3.0
 */

'use strict';

const { Clutter, GLib, Meta, Shell, St, Pango, Graphene, GObject } = imports.gi;

const { AppMenu } = imports.ui.appMenu;
const PopupMenu = imports.ui.popupMenu;
const BoxPointer = imports.ui.boxpointer;
const Layout = imports.ui.layout;
const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;
const IconGrid = imports.ui.iconGrid;
const Dash = imports.ui.dash;
const OverviewControls = imports.ui.overviewControls;
const WorkspacesView = imports.ui.workspacesView;
const WindowPreview = imports.ui.windowPreview;
const Workspace = imports.ui.workspace;
const WorkspaceThumbnail = imports.ui.workspaceThumbnail;
const Background = imports.ui.background;
const DND = imports.ui.dnd;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;
const shellVersion = Settings.shellVersion;

const WindowSearchProvider = Me.imports.windowSearchProvider;

const _Util = Me.imports.util;


let _appIconInjections = {};
let _windowPreviewInjections = {};
let _featurePackOverrides = {};
let _workspaceInjections = {};
//let _appViewItemInjections = {};
let _dashRedisplayTimeoutId = 0;
let _hoverActivatesWindowSigId = 0;
let _appSystemStateSigId = 0;
let _switchWsOnHoverDelayId = 0;
let _showAppsIconBtnPressId = 0;
let _origAppDisplayAcceptDrop;
let _origAppViewItemHandleDragOver;
let _origAppViewItemAcceptDrop;
let _appGridLayoutSettings;
let _appGridLayoutSigId;

let SEARCH_WINDOWS_ENABLED;
let SEARCH_WINDOWS_SPACE;
let SEARCH_WIN_CLICK_APPS_ICON;
let SPACE_ACTIVATES_DASH;
let SHIFT_REORDERS_WS;
let APP_MENU_MV_TO_WS;
let APP_MENU_CLOSE_WS;
let APP_MENU_FORCE_QUIT;
let DASH_SHIFT_CLICK_MV;
let DASH_SHOW_WINS_BEFORE;
let DASH_FOLLOW_RECENT_WIN;
let DASH_SCROLL_SWITCH_APP_WS;
let DASH_HOVER_HIGHLIGHT_WINS;
let FULLSCREEN_HOT_CORNER;
let HOVER_ACTIVATES_ON_LEAVE;
let ALWAYS_SHOW_WIN_TITLES;
let MOVE_WIN_TITLES
let SHOW_WS_TMB_BG;
let WS_TMB_HOVER_SWITCH;
let SHOW_WST_LABELS;
let APP_GRID_ORDER;
let APP_GRID_FAV_RUN;
let APP_GRID_COLUMNS;
let APP_GRID_ROWS;
let APP_GRID_ICON_SIZE;
let APP_GRID_FOLDER_ICON_SIZE;
let APP_GRID_NAMES_MODE;
let APP_GRID_ALLOW_INCOMPLETE_PAGES;
let APP_GRID_ALLOW_CUSTOM;

let gOptions;


function activate() {
    gOptions = new Settings.Options();

    gOptions.connect('changed', _updateSettings);

    //AppDisplay.FolderGrid = FolderGrid;
    _updateSettings();
}

function reset() {
    if (!gOptions)
        return;

    const reset = true;
    _updateAppIcon(reset);
    _updateHotCorner(reset);
    _updateWindowPreview(reset);
    _updateWorkspaceThumbnail(reset);
    _updateWorkspacesDisplay(reset);
    _updateAppGrid(reset);
    _updateWindowSearchProvider(reset);
    _moveDashShowAppsIconLeft(reset);
    _updateDash(reset);
    _updateAppGrid(reset);
    _updateWindowSearchProvider(reset);

    _featurePackOverrides = {};

    if (_dashRedisplayTimeoutId) {
        GLib.source_remove(_dashRedisplayTimeoutId);
        _dashRedisplayTimeoutId = 0;
    }

    gOptions.destroy();
    gOptions = null;
}

//---------------------------------------------------

function _updateSettings(settings, key) {
    SEARCH_WINDOWS_ENABLED = gOptions.get('searchWindowsEnable', true);
    SEARCH_WINDOWS_SPACE = gOptions.get('searchWindowsSpaceKey', true);
    SPACE_ACTIVATES_DASH = gOptions.get('spaceActivatesDash', true);
    SHIFT_REORDERS_WS = gOptions.get('shiftReordersWs', true);

    SEARCH_WIN_CLICK_APPS_ICON = gOptions.get('searchWindowsClickAppsIcon', true);

    APP_MENU_MV_TO_WS = gOptions.get('appMenuMoveAppToWs', true);
    APP_MENU_CLOSE_WS = gOptions.get('appMenuCloseWindowsOnCurrentWs', true);
    APP_MENU_FORCE_QUIT = gOptions.get('appMenuForceQuit', true);
    DASH_SHIFT_CLICK_MV = gOptions.get('dashShiftClickMovesAppToCurrentWs', true);
    DASH_SHOW_WINS_BEFORE = gOptions.get('dashShowWindowsBeforeActivation', true);
    DASH_FOLLOW_RECENT_WIN = gOptions.get('dashClickFollowsRecentWindow', true);

    DASH_SCROLL_SWITCH_APP_WS = gOptions.get('dashScrollSwitchesAppWindowsWs', true);

    DASH_HOVER_HIGHLIGHT_WINS = gOptions.get('dashHoverIconHighlitsWindows', true);

    FULLSCREEN_HOT_CORNER = gOptions.get('fullscreenHotCorner', true);

    HOVER_ACTIVATES_ON_LEAVE = gOptions.get('hoverActivatesWindowOnLeave', true);
    ALWAYS_SHOW_WIN_TITLES = gOptions.get('alwaysShowWindowTitles', true);

    MOVE_WIN_TITLES = gOptions.get('moveTitlesIntoWindows', true);

    SHOW_WS_TMB_BG = gOptions.get('showWsSwitcherBg', true);
    WS_TMB_HOVER_SWITCH = gOptions.get('wsTmbSwitchOnHover', true);
    SHOW_WST_LABELS = gOptions.get('showWsTmbLabels', true);

    APP_GRID_ORDER = gOptions.get('appGridOrder', true);
    APP_GRID_FAV_RUN = gOptions.get('appGridIncludeDash', true);

    APP_GRID_NAMES_MODE = gOptions.get('appGridNamesMode', true);

    APP_GRID_COLUMNS = gOptions.get('appGridColumns', true);
    APP_GRID_ROWS = gOptions.get('appGridRows', true);
    APP_GRID_ICON_SIZE = gOptions.get('appGridIconSize', true);
    APP_GRID_FOLDER_ICON_SIZE = gOptions.get('appGridFolderIconSize', true);
    APP_GRID_ALLOW_INCOMPLETE_PAGES = gOptions.get('appGridIncompletePages', true);
    APP_GRID_ALLOW_CUSTOM = gOptions.get('appGridAllowCustom', true);


    _updateWorkspacesDisplay();
    _updateWindowPreview();
    _updateWorkspaceThumbnail();
    _updateAppIcon();
    _updateDash();
    _updateAppViewItem();
    _updateAppGrid();
    _updateHotCorner();
    _updateWindowSearchProvider();

    // update app icon labels in case APP_GRID FULL_NAMES changed
    Main.overview._overview._controls._appDisplay._orderedItems.forEach(icon => icon._updateMultiline());
}

function _updateWindowSearchProvider(reset = false) {
    if (!reset && SEARCH_WINDOWS_ENABLED) {
        WindowSearchProvider.enable(gOptions);
    } else {
        WindowSearchProvider.disable();
    }
}

function _updateWorkspacesDisplay(reset = false) {
    if (!reset && ((SEARCH_WINDOWS_ENABLED && SEARCH_WINDOWS_SPACE) || SPACE_ACTIVATES_DASH || SHIFT_REORDERS_WS)) {
        _featurePackOverrides['WorkspacesDisplay'] = _Util.overrideProto(WorkspacesView.WorkspacesDisplay.prototype, WorkspacesDisplayOverride);
    } else if (_featurePackOverrides['WorkspacesDisplay']) {
        _Util.overrideProto(WorkspacesView.WorkspacesDisplay.prototype, _featurePackOverrides['WorkspacesDisplay']);
    }
}

/*function _updateWorkspace(reset = false) {
    if (!reset && SEARCH_WINDOWS_ENABLED && SEARCH_WIN_CLICK_EMPTY) {
        _injectWorkspace();
    } else {
        for (let name in _workspaceInjections) {
            _Util.removeInjection(Workspace.Workspace.prototype, _workspaceInjections, name);
        }
        _workspaceInjections = {};
    }
}*/

function _updateWindowPreview(reset = false) {
    if (!reset && (ALWAYS_SHOW_WIN_TITLES || HOVER_ACTIVATES_ON_LEAVE)) {
        _featurePackOverrides['WindowPreview'] = _Util.overrideProto(WindowPreview.WindowPreview.prototype, WindowPreviewOverride);
        _updateHoverActivatesWindow();
    } else if (_featurePackOverrides['WindowPreview']) {
        _Util.overrideProto(WindowPreview.WindowPreview.prototype, _featurePackOverrides['WindowPreview']);
    }

    if (!reset && (MOVE_WIN_TITLES || ALWAYS_SHOW_WIN_TITLES)) {
        _injectWindowPreview();
    } else {
        for (let name in _windowPreviewInjections) {
            _Util.removeInjection(WindowPreview.WindowPreview.prototype, _windowPreviewInjections, name);
        }
        _windowPreviewInjections = {};
    }
}

function _updateAppIcon(reset = false) {
    if (!reset && (APP_MENU_MV_TO_WS || APP_MENU_CLOSE_WS || APP_MENU_FORCE_QUIT || DASH_SHIFT_CLICK_MV || DASH_SHOW_WINS_BEFORE || DASH_FOLLOW_RECENT_WIN)) {
        _featurePackOverrides['AppIcon'] = _Util.overrideProto(AppDisplay.AppIcon.prototype, AppIconOverride);
    } else if (_featurePackOverrides['AppIcon']) {
        _Util.overrideProto(AppDisplay.AppIcon.prototype, _featurePackOverrides['AppIcon']);
    }

    if (!reset && (DASH_SCROLL_SWITCH_APP_WS || DASH_HOVER_HIGHLIGHT_WINS || APP_GRID_NAMES_MODE)) {
        for (let name in _appIconInjections) {
            _Util.removeInjection(AppDisplay.AppIcon.prototype, _appIconInjections, name);
        }
        _injectAppIcon();
        //reset dash icons
        _updateDash(true);
        _updateDash();
    } else {
        for (let name in _appIconInjections) {
            _Util.removeInjection(AppDisplay.AppIcon.prototype, _appIconInjections, name);
        }
        _appIconInjections = {};
        //reset dash icons
        _updateDash(true);
    }
}

function _updateWorkspaceThumbnail(reset = false) {
    if (!reset && (WS_TMB_HOVER_SWITCH || SHOW_WST_LABELS || SHOW_WS_TMB_BG)) {
        _featurePackOverrides['WorkspaceThumbnail'] = _Util.overrideProto(WorkspaceThumbnail.WorkspaceThumbnail.prototype, WorkspaceThumbnailOverride);
    } else if (_featurePackOverrides['WorkspaceThumbnail']) {
        _Util.overrideProto(WorkspaceThumbnail.WorkspaceThumbnail.prototype, _featurePackOverrides['WorkspaceThumbnail']);
    }
}

function _updateHotCorner(reset = false) {
    if (!reset && FULLSCREEN_HOT_CORNER) {
        _featurePackOverrides['HotCorner'] = _Util.overrideProto(Layout.HotCorner.prototype, HotCornerOverride);
    } else if (_featurePackOverrides['HotCorner']) {
        _Util.overrideProto(Layout.HotCorner.prototype, _featurePackOverrides['HotCorner']);
    }

    Main.layoutManager._updateHotCorners();
}

function _updateAppGrid(reset = false) {
    if (reset) {
        if (_featurePackOverrides['AppDisplay']) {
            _Util.overrideProto(AppDisplay.AppDisplay.prototype, _featurePackOverrides['AppDisplay']);
            _featurePackOverrides['AppDisplay'] = null;
        }
        if (_featurePackOverrides['BaseAppView']) {
            _Util.overrideProto(AppDisplay.BaseAppView.prototype, _featurePackOverrides['BaseAppView']);
            _featurePackOverrides['BaseAppView'] = null;
        }

        if (_featurePackOverrides['FolderView']) {
            _Util.overrideProto(AppDisplay.FolderView.prototype, _featurePackOverrides['FolderView']);
            _featurePackOverrides['FolderView'] = null;
        }
        if (_featurePackOverrides['FolderView']) {
            _Util.overrideProto(AppDisplay.FolderView.prototype, _featurePackOverrides['FolderView']);
            _featurePackOverrides['FolderView'] = null;
        }
        if (_featurePackOverrides['IconGrid']) {
            _Util.overrideProto(IconGrid.IconGrid.prototype, _featurePackOverrides['IconGrid']);
        }
    } else if (!_featurePackOverrides['BaseAppView']) {
        // redisplay(), canAccept()
        _featurePackOverrides['BaseAppView'] = _Util.overrideProto(AppDisplay.BaseAppView.prototype, BaseAppViewOverride);
        // loadApps(), ensureDefaultFolders()
        _featurePackOverrides['AppDisplay'] = _Util.overrideProto(AppDisplay.AppDisplay.prototype, AppDisplayOverride);
        // fixed icon size for folder icons
        _featurePackOverrides['FolderView'] = _Util.overrideProto(AppDisplay.FolderView.prototype, FolderViewOverrides);
        if (shellVersion >= 43) {
            _featurePackOverrides['IconGrid'] = _Util.overrideProto(IconGrid.IconGrid.prototype, IconGridOverrides);
        }
    }

    if (!APP_GRID_ORDER || reset) {
        if (_appSystemStateSigId) {
            Shell.AppSystem.get_default().disconnect(_appSystemStateSigId);
            _appSystemStateSigId = 0;
        }
        if (_origAppDisplayAcceptDrop)
            AppDisplay.AppDisplay.prototype.acceptDrop = _origAppDisplayAcceptDrop;

        if (_origAppViewItemHandleDragOver)
            AppDisplay.AppViewItem.prototype.handleDragOver = _origAppViewItemHandleDragOver;

        if (_origAppViewItemAcceptDrop)
            AppDisplay.AppViewItem.prototype.acceptDrop = _origAppViewItemAcceptDrop;
    } else {
        if (!_appSystemStateSigId)
            _appSystemStateSigId = Shell.AppSystem.get_default().connect('app-state-changed', () => Main.overview._overview._controls._appDisplay._redisplay());

        // deny dnd from dash to appgrid
        if (!_origAppDisplayAcceptDrop)
            _origAppDisplayAcceptDrop = AppDisplay.AppDisplay.prototype.acceptDrop;
        AppDisplay.AppDisplay.prototype.acceptDrop = function() { return false; };

        // deny creating folders by dnd on other icon
        if (!_origAppViewItemHandleDragOver)
            _origAppViewItemHandleDragOver = AppDisplay.AppViewItem.prototype.handleDragOver;
        AppDisplay.AppViewItem.prototype.handleDragOver = () => DND.DragMotionResult.NO_DROP;

        if (!_origAppViewItemAcceptDrop)
            _origAppViewItemAcceptDrop = AppDisplay.AppViewItem.prototype.acceptDrop;
        AppDisplay.AppViewItem.prototype.acceptDrop = () => false;
    }

    _updateAppGridProperties(reset);

    Main.overview._overview._controls._appDisplay._redisplay();
}

function _updateAppGridProperties(reset) {
    // columns, rows, icon size
    const appDisplay = Main.overview._overview._controls._appDisplay;
    appDisplay.visible = true;

    if (reset) {
        appDisplay._grid.layout_manager.fixedIconSize = -1;
        appDisplay._grid.layoutManager.allow_incomplete_pages = true;
        appDisplay._grid.setGridModes();
        if (_appGridLayoutSettings) {
            _appGridLayoutSettings.disconnect(_appGridLayoutSigId);
            _appGridLayoutSigId = null;
            _appGridLayoutSettings = null;
        }
    } else {
        // update grid on layout reset
        if (!_appGridLayoutSettings) {
           _appGridLayoutSettings = ExtensionUtils.getSettings('org.gnome.shell');
           _appGridLayoutSigId = _appGridLayoutSettings.connect('changed::app-picker-layout', _resetAppGrid);
        }

        _resetAppGrid();

        const updateGrid = function(rows, columns) {
            if (rows === -1 || columns === -1) {
                appDisplay._grid.setGridModes();
            } else {
                appDisplay._grid.setGridModes(
                    [{ rows, columns }]
                );
            }
            appDisplay._grid._setGridMode(0);
        }

        appDisplay._grid._currentMode = -1;
        if (APP_GRID_ALLOW_CUSTOM) {
            updateGrid(APP_GRID_ROWS, APP_GRID_COLUMNS);
        } else {
            appDisplay._grid.setGridModes();
            updateGrid(-1, -1);
        }
        appDisplay._grid.layoutManager.fixedIconSize = APP_GRID_ICON_SIZE;
        appDisplay._grid.layoutManager.allow_incomplete_pages = APP_GRID_ALLOW_INCOMPLETE_PAGES;

        // force rebuild icons. size shouldn't be the same as the current one, otherwise can be arbitrary
        appDisplay._grid.layoutManager.adaptToSize(200, 200);
    }
}

function _resetAppGrid(settings = null, key = null) {
    if (settings) {
        const currentValue = JSON.stringify(settings.get_value('app-picker-layout').deep_unpack());
        const emptyValue = JSON.stringify([]);
        if (key === 'app-picker-layout' && currentValue != emptyValue)
            return;
    }
    const appDisplay = Main.overview._overview._controls._appDisplay;
    const items = appDisplay._orderedItems;
    for (let i = items.length - 1; i > -1; i--) {
        Main.overview._overview._controls._appDisplay._removeItem(items[i]);
    }
    // redisplay only from callback
    if (settings)
        appDisplay._redisplay();
}

function _updateAppViewItem(reset = false) {
    if (!reset && APP_GRID_NAMES_MODE) {
        _featurePackOverrides['AppViewItem'] = _Util.overrideProto(AppDisplay.AppViewItem.prototype, AppViewItemOverride);
    } else {
        _Util.overrideProto(AppDisplay.AppViewItem.prototype, _featurePackOverrides['AppViewItem']);
    }
}

function _updateHoverActivatesWindow(reset = false) {
    const state = HOVER_ACTIVATES_ON_LEAVE;
    if (!reset && state) {
        if (!_hoverActivatesWindowSigId) {
            _hoverActivatesWindowSigId = Main.overview.connect('hiding', () => {
                if (global.windowToActivate) {
                    global.windowToActivate.activate(global.get_current_time());
                }
            });
        }
    } else if (_hoverActivatesWindowSigId) {
        Main.overview.disconnect(_hoverActivatesWindowSigId);
        _hoverActivatesWindowSigId = 0;
    }
}

function _moveDashShowAppsIconLeft(reset = false) {
    // move dash app grid icon to the front
    const dash = Main.overview.dash;
    if (reset)
        dash._dashContainer.set_child_at_index(dash._showAppsIcon, 1);
    else
        dash._dashContainer.set_child_at_index(dash._showAppsIcon, 0);
}

function _updateDash(remove = false) {
    // destroying dash icons and redisplay has consequences - error nessages in log and placeholders whilde DND icons in Dash

    Main.overview.dash._box.get_children().forEach(c => {
        const appIcon = c.child;

        if (remove) {
            if (appIcon && appIcon._scrollConnectionID) {
                appIcon.disconnect(appIcon._scrollConnectionID);
                appIcon._scrollConnectionID = 0;
            }
            if (appIcon && appIcon._enterConnectionID) {
                appIcon.disconnect(appIcon._enterConnectionID);
                appIcon._enterConnectionID = 0;
            }
            if (appIcon && appIcon._leaveConnectionID) {
                appIcon.disconnect(appIcon._leaveConnectionID);
                appIcon._leaveConnectionID = 0;
            }
        } else if ((DASH_HOVER_HIGHLIGHT_WINS || DASH_SCROLL_SWITCH_APP_WS) && appIcon) {
            _connectAppIconScrollEnterLeave(null, null, appIcon);
        }
    });

    // After resetting the Shell, some running apps don't appear in Dash, _redisplay() helps
    _dashRedisplayTimeoutId =  GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        3000,
        () => {
            Main.overview.dash._redisplay();
            _dashRedisplayTimeoutId = 0;
            return GLib.SOURCE_REMOVE;
        }
    );

    if (SEARCH_WINDOWS_ENABLED && SEARCH_WIN_CLICK_APPS_ICON && !remove) {
        if (_showAppsIconBtnPressId) {
            Main.overview.dash._showAppsIcon.disconnect(_showAppsIconBtnPressId);
        }
        Main.overview.dash._showAppsIcon.reactive = true;
        _showAppsIconBtnPressId = Main.overview.dash._showAppsIcon.connect('button-press-event', (actor, event) => {
            if (event.get_button() !== 3)
                return Clutter.EVENT_PROPAGATE;
            if (Main.overview.searchEntry.get_text())
                Main.overview.searchEntry.set_text('');
            else
                _activateWindowSearchProvider();

            return Clutter.EVENT_STOP;
        });
    } else {
        if (_showAppsIconBtnPressId) {
            Main.overview.dash._showAppsIcon.disconnect(_showAppsIconBtnPressId);
            _showAppsIconBtnPressId = 0;
        }
        Main.overview.dash._showAppsIcon.reactive = false;
    }

}

//***********************************************************************************/

function _activateWindowSearchProvider() {
    const prefix = _('wq: ');
    const position = prefix.length;
    Main.overview._overview._controls._searchEntry.set_text(prefix);
    Main.overview._overview._controls._searchEntry.grab_key_focus();
    Main.overview._overview._controls._searchEntry.get_first_child().set_cursor_position(position);
    Main.overview._overview._controls._searchEntry.get_first_child().set_selection(position, position);
}

//---Workspace--------

/*function _injectWorkspace() {
    _workspaceInjections['_init'] = _Util.injectToFunction(
        Workspace.Workspace.prototype, '_init', function() {
            if (SEARCH_WINDOWS_ENABLED && SEARCH_WIN_CLICK_EMPTY) {
                const clickAction2 = new Clutter.ClickAction();
                clickAction2.connect('clicked', action => {
                    if (SEARCH_WINDOWS_ENABLED && SEARCH_WIN_CLICK_EMPTY) {
                        // Activate Window Search
                        if (action.get_button() === Clutter.BUTTON_SECONDARY) {
                            _activateWindowSearchProvider();
                        }
                    }
                });
                this._container.add_action(clickAction2);
            }
        }
    );
}*/


// WorkspacesDisplay
// add reorder workspace using Shift + (mouse wheel / PageUP/PageDown)
// needed for options shiftReordersWs, spaceActivatesDash, searchWindowsEnable, searchWindowsSpaceKey
let WorkspacesDisplayOverride = {
    _onScrollEvent: function(actor, event) {
        if (this._swipeTracker.canHandleScrollEvent(event))
            return Clutter.EVENT_PROPAGATE;

        if (!this.mapped)
            return Clutter.EVENT_PROPAGATE;

        if (this._workspacesOnlyOnPrimary &&
            this._getMonitorIndexForEvent(event) != this._primaryIndex)
            return Clutter.EVENT_PROPAGATE;

        if (SHIFT_REORDERS_WS && global.get_pointer()[2] & Clutter.ModifierType.SHIFT_MASK) {
            let direction = event.get_scroll_direction();
            if (direction === Clutter.ScrollDirection.UP) {
                direction = -1;
            }
            else if (direction === Clutter.ScrollDirection.DOWN) {
                direction = 1;
            } else {
                direction = 0;
            }

            if (direction) {
                _reorderWorkspace(direction);
                // make all workspaces on primary monitor visible for case the new position is hiden
                Main.overview._overview._controls._workspacesDisplay._workspacesViews[0]._workspaces.forEach(w => w.visible = true);
                return Clutter.EVENT_STOP;
            }
        }

        return Main.wm.handleWorkspaceScroll(event);
    },

    _onKeyPressEvent: function(actor, event) {
        const symbol = event.get_key_symbol();
        const { ControlsState } = OverviewControls;
        if (this._overviewAdjustment.value !== ControlsState.WINDOW_PICKER && symbol !== Clutter.KEY_space)
            return Clutter.EVENT_PROPAGATE;

        if (!this.reactive)
            return Clutter.EVENT_PROPAGATE;
        const isCtrlPressed = (event.get_state() & Clutter.ModifierType.CONTROL_MASK) != 0;
        const { workspaceManager } = global;
        const vertical = workspaceManager.layout_rows === -1;
        const rtl = this.get_text_direction() === Clutter.TextDirection.RTL;

        let which;
        switch (symbol) {
        case Clutter.KEY_Page_Up:
            if (vertical)
                which = Meta.MotionDirection.UP;
            else if (rtl)
                which = Meta.MotionDirection.RIGHT;
            else
                which = Meta.MotionDirection.LEFT;
            break;
        case Clutter.KEY_Page_Down:
            if (vertical)
                which = Meta.MotionDirection.DOWN;
            else if (rtl)
                which = Meta.MotionDirection.LEFT;
            else
                which = Meta.MotionDirection.RIGHT;
            break;
        case Clutter.KEY_Home:
            which = 0;
            break;
        case Clutter.KEY_End:
            which = workspaceManager.n_workspaces - 1;
            break;
        case Clutter.KEY_space:
            if (isCtrlPressed && SPACE_ACTIVATES_DASH) {
                Main.ctrlAltTabManager._items.forEach(i => {if (i.sortGroup === 1 && i.name === 'Dash') Main.ctrlAltTabManager.focusGroup(i)});
            } else if (SEARCH_WINDOWS_ENABLED && SEARCH_WINDOWS_SPACE) {
                _activateWindowSearchProvider();
            }
            return Clutter.EVENT_STOP;
        default:
            return Clutter.EVENT_PROPAGATE;
        }

        let ws;
        if (which < 0)
            // Negative workspace numbers are directions
            // with respect to the current workspace
            ws = workspaceManager.get_active_workspace().get_neighbor(which);
        else
            // Otherwise it is a workspace index
            ws = workspaceManager.get_workspace_by_index(which);

        if (SHIFT_REORDERS_WS && event.get_state() & Clutter.ModifierType.SHIFT_MASK) {
            let direction;
            if (which === Meta.MotionDirection.UP || which === Meta.MotionDirection.LEFT)
                direction = -1;
            else if (which === Meta.MotionDirection.DOWN || which === Meta.MotionDirection.RIGHT)
                direction = 1;
            if (direction)
                _reorderWorkspace(direction);
                // make all workspaces on primary monitor visible for case the new position is hiden
                Main.overview._overview._controls._workspacesDisplay._workspacesViews[0]._workspaces.forEach(w => w.visible = true);
                return Clutter.EVENT_STOP;
        }

        if (ws)
            Main.wm.actionMoveWorkspace(ws);

        return Clutter.EVENT_STOP;
    }
}

function _reorderWorkspace(direction = 0) {
    let activeWs = global.workspace_manager.get_active_workspace();
    let activeWsIdx = activeWs.index();
    let targetIdx = activeWsIdx + direction;
    if (targetIdx > -1 && targetIdx < (global.workspace_manager.get_n_workspaces())) {
        global.workspace_manager.reorder_workspace(activeWs, targetIdx);
    }
}

//-------------- layout ---------------------------------------------------

let HotCornerOverride = {
    _toggleOverview: function(){
        if (!FULLSCREEN_HOT_CORNER && this._monitor.inFullscreen && !Main.overview.visible)
            return;
        if (Main.overview.shouldToggleByCornerOrButton()) {
            Main.overview.toggle();
            if (Main.overview.animationInProgress)
                this._ripples.playAnimation(this._x, this._y);
        }
    }
}

//----- WindowPreview ------------------------------------------------------------------

function _injectWindowPreview() {
    _windowPreviewInjections['_init'] = _Util.injectToFunction(
        WindowPreview.WindowPreview.prototype, '_init', function() {
            if (MOVE_WIN_TITLES) {
                // try to adapt to the icon size adjusted by the Vertical Workspaces extension
                const WIN_PREVIEW_ICON_SIZE = this._iconSize ? this._iconSize : WindowPreview.ICON_SIZE;

                const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);
                const iconOverlap = WIN_PREVIEW_ICON_SIZE * WindowPreview.ICON_OVERLAP;
                //const iconOverlap = WindowPreview.ICON_SIZE * WindowPreview.ICON_OVERLAP;
                // we cannot get propper title height before it gets to the stage, so 35 is estimated height + spacing
                this._title.get_constraints()[1].offset = scaleFactor * (- iconOverlap - 35);
            }

            if (ALWAYS_SHOW_WIN_TITLES) {
                this._title.show();
                this._title.opacity = 255;
            }
        }
    );
}

// add fading in/out window title for option always show titles
let WindowPreviewOverride = {
    _updateIconScale: function() {
        const { ControlsState } = OverviewControls;
        const { currentState, initialState, finalState } =
            this._overviewAdjustment.getStateTransitionParams();
        const visible =
            initialState === ControlsState.WINDOW_PICKER ||
            finalState === ControlsState.WINDOW_PICKER;
        const scale = visible
            ? 1 - Math.abs(ControlsState.WINDOW_PICKER - currentState) : 0;

        this._icon.set({
            scale_x: scale,
            scale_y: scale,
        });
        if (ALWAYS_SHOW_WIN_TITLES) {
            this._title.set({
                opacity: scale * 255
            });
        }
        if (DASH_HOVER_HIGHLIGHT_WINS) {
            this._closeButton.set({
                opacity: scale * 255
            });
        }
    },

    showOverlay: function(animate) {
        if (!this._overlayEnabled)
            return;

        if (this._overlayShown)
            return;

        this._overlayShown = true;
        //this._restack();

        // If we're supposed to animate and an animation in our direction
        // is already happening, let that one continue
        /*const ongoingTransition = this._title.get_transition('opacity');
        if (animate &&
            ongoingTransition &&
            ongoingTransition.get_interval().peek_final_value() === 255)
            return;*/

        const toShow = this._windowCanClose()
            ? [this._closeButton]
            : [];

        if (!ALWAYS_SHOW_WIN_TITLES) {
            toShow.push(this._title);
        }

        toShow.forEach(a => {
            a.opacity = 0;
            a.show();
            a.ease({
                opacity: 255,
                duration: animate ? WindowPreview.WINDOW_OVERLAY_FADE_TIME : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        });

        const [width, height] = this.window_container.get_size();
        const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);
        const activeExtraSize = WindowPreview.WINDOW_ACTIVE_SIZE_INC * 2 * scaleFactor;
        const origSize = Math.max(width, height);
        const scale = (origSize + activeExtraSize) / origSize;

        this.window_container.ease({
            scale_x: scale,
            scale_y: scale,
            duration: animate ? WindowPreview.WINDOW_SCALE_TIME : 0,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });

        this.emit('show-chrome');

        if (HOVER_ACTIVATES_ON_LEAVE && Main.overview._shown) {
            this._focusWindowSet = true;
            global.windowToActivate = this.metaWindow;
        }
    },

    hideOverlay: function(animate) {
        if (!this._overlayShown)
            return;
        this._overlayShown = false;
        //this._restack();

        // If we're supposed to animate and an animation in our direction
        // is already happening, let that one continue
        /*const ongoingTransition = this._title.get_transition('opacity');
        if (animate &&
            ongoingTransition &&
            ongoingTransition.get_interval().peek_final_value() === 0)
            return;*/

        const toHide = [this._closeButton];

        if (!ALWAYS_SHOW_WIN_TITLES) {
            toHide.push(this._title);
        }
        toHide.forEach(a => {
            a.opacity = 255;
            a.ease({
                opacity: 0,
                duration: animate ? WindowPreview.WINDOW_OVERLAY_FADE_TIME : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => a.hide(),
            });
        });

        if (this.window_container) {
            this.window_container.ease({
                scale_x: 1,
                scale_y: 1,
                duration: animate ? WindowPreview.WINDOW_SCALE_TIME : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }

        if (HOVER_ACTIVATES_ON_LEAVE && this._focusWindowSet) {
            this._focusWindowSet = false;
            global.windowToActivate = null;
        }
    }
}

//-----AppDisplay -----------------------------------------------------------------------

function _injectAppIcon() {
    _appIconInjections['_init'] = _Util.injectToFunction(
        AppDisplay.AppIcon.prototype, '_init', function() {
            if (DASH_SCROLL_SWITCH_APP_WS || DASH_HOVER_HIGHLIGHT_WINS)
                _connectAppIconScrollEnterLeave(null, null, this);
            if (APP_GRID_NAMES_MODE && this.icon.label) {
                const clutterText = this.icon.label.clutterText;
                clutterText.set({
                    line_wrap: true,
                    line_wrap_mode: Pango.WrapMode.WORD_CHAR,
                    ellipsize: Pango.EllipsizeMode.NONE,
                });
            }
            if (APP_GRID_NAMES_MODE === 2 && this.icon.label) {
                this.icon.label.opacity = 0;
            }
        }
    );
}

let AppIconOverride = {
    activate: function(button) {
        let event = Clutter.get_current_event();
        let modifiers = event ? event.get_state() : 0;
        let isMiddleButton = button && button == Clutter.BUTTON_MIDDLE;
        let isCtrlPressed = (modifiers & Clutter.ModifierType.CONTROL_MASK) != 0;
        let isShiftPressed = (modifiers & Clutter.ModifierType.SHIFT_MASK) != 0;
        let openNewWindow = this.app.can_open_new_window() &&
                            this.app.state == Shell.AppState.RUNNING &&
                            (isCtrlPressed || isMiddleButton);

        const currentWS = global.workspace_manager.get_active_workspace();
        const appRecentWorkspace = _getAppRecentWorkspace(this.app);

        let targetWindowOnCurrentWs = false;
        if (DASH_FOLLOW_RECENT_WIN) {
            targetWindowOnCurrentWs = appRecentWorkspace === currentWS;
        } else {
            this.app.get_windows().forEach(
                w => targetWindowOnCurrentWs = targetWindowOnCurrentWs || (w.get_workspace() === currentWS)
            );
        }

        if ((this.app.state == Shell.AppState.STOPPED || openNewWindow) && !isShiftPressed)
            this.animateLaunch();

        if (openNewWindow) {
            this.app.open_new_window(-1);
        // if the app has more than one window (option: and has no window on the current workspace),
        // don't activate the app, only move the overview to the workspace with the app's recent window
        } else if (DASH_SHOW_WINS_BEFORE && !isShiftPressed && this.app.get_n_windows() > 1 && !targetWindowOnCurrentWs) {
            this._scroll = true;
            this._scrollTime = Date.now();
            //const appWS = this.app.get_windows()[0].get_workspace();
            Main.wm.actionMoveWorkspace(appRecentWorkspace);
            Main.overview.dash.showAppsButton.checked = false;
            return;
        } else if (DASH_SHIFT_CLICK_MV && isShiftPressed && this.app.get_windows().length) {
            this._moveAppToCurrentWorkspace();
            return;
        } else if (isShiftPressed) {
            return;
        } else {
            this.app.activate();
        }

        Main.overview.hide();
    },

    _moveAppToCurrentWorkspace: function() {
        this.app.get_windows().forEach(w => w.change_workspace(global.workspace_manager.get_active_workspace()));
    },

    popupMenu: function(side = St.Side.LEFT) {
        if (shellVersion >= 42)
            this.setForcedHighlight(true);
        this._removeMenuTimeout();
        this.fake_release();

        if (!this._getWindowsOnCurrentWs) {
            this._getWindowsOnCurrentWs = function() {
                const winList = [];
                this.app.get_windows().forEach(w => {
                    if(w.get_workspace() === global.workspace_manager.get_active_workspace()) winList.push(w)
                });
                return winList;
            };

            this._windowsOnOtherWs = function() {
                return (this.app.get_windows().length - this._getWindowsOnCurrentWs().length) > 0;
            };
        }

        if (!this._menu) {
            this._menu = new AppMenu(this, side, {
                favoritesSection: true,
                showSingleWindows: true,
            });

            this._menu.setApp(this.app);
            this._openSigId = this._menu.connect('open-state-changed', (menu, isPoppedUp) => {
                if (!isPoppedUp)
                    this._onMenuPoppedDown();
            });
            //Main.overview.connectObject('hiding',
            this._hidingSigId = Main.overview.connect('hiding',
                () => this._menu.close(), this);

            Main.uiGroup.add_actor(this._menu.actor);
            this._menuManager.addMenu(this._menu);
        }

        // once the menu is created, it stays unchanged and we need to modify our items based on current situation
        if (this._addedMenuItems && this._addedMenuItems.length) {
            this._addedMenuItems.forEach(i => i.destroy());
        }

        const popupItems =[];

        const separator = new PopupMenu.PopupSeparatorMenuItem();
        this._menu.addMenuItem(separator);

        if (this.app.get_n_windows()) {
            if (APP_MENU_FORCE_QUIT) {
                popupItems.push([_('Force Quit'), () => this.app.get_windows()[0].kill()]);
            }

            if (APP_MENU_CLOSE_WS) {
                const nWin = this._getWindowsOnCurrentWs().length;
                if (nWin) {
                    popupItems.push([_(`Close ${nWin} Windows on Current Workspace`), () => {
                        const windows = this._getWindowsOnCurrentWs();
                        let time = global.get_current_time();
                        for (let win of windows) {
                            // increase time by 1 ms for each window to avoid errors from GS
                            win.delete(time++);
                        }
                    }]);
                }
            }

            if (APP_MENU_MV_TO_WS && this._windowsOnOtherWs()) {
                popupItems.push([_('Move App to Current Workspace'), this._moveAppToCurrentWorkspace]);
            }
        }

        this._addedMenuItems = [];
        this._addedMenuItems.push(separator);
        popupItems.forEach(i => {
            let item = new PopupMenu.PopupMenuItem(i[0]);
            this._menu.addMenuItem(item);
            item.connect('activate', i[1].bind(this));
            this._addedMenuItems.push(item);
        });

        this.emit('menu-state-changed', true);

        this._menu.open(BoxPointer.PopupAnimation.FULL);
        this._menuManager.ignoreRelease();
        this.emit('sync-tooltip');

        return false;
    }
}

let AppDisplayOverride = {
    _ensureDefaultFolders: function() {
        // disable creation of default folders if user deleted them
    },

    _loadApps: function() {
        let appIcons = [];
        this._appInfoList = Shell.AppSystem.get_default().get_installed().filter(appInfo => {
            try {
                appInfo.get_id(); // catch invalid file encodings
            } catch (e) {
                return false;
            }
            return this._parentalControlsManager.shouldShowApp(appInfo);
        });

        let apps = this._appInfoList.map(app => app.get_id());

        let appSys = Shell.AppSystem.get_default();

        const appsInsideFolders = new Set();
        this._folderIcons = [];
        if (!APP_GRID_ORDER) {

            let folders = this._folderSettings.get_strv('folder-children');
            folders.forEach(id => {
                let path = `${this._folderSettings.path}folders/${id}/`;
                let icon = this._items.get(id);
                if (!icon) {
                    icon = new AppDisplay.FolderIcon(id, path, this);
                    icon.connect('apps-changed', () => {
                        this._redisplay();
                        this._savePages();
                    });
                    icon.connect('notify::pressed', () => {
                        if (icon.pressed)
                            this.updateDragFocus(icon);
                    });
                }

                // Don't try to display empty folders
                if (!icon.visible) {
                    icon.destroy();
                    return;
                }

                appIcons.push(icon);
                this._folderIcons.push(icon);

                icon.getAppIds().forEach(appId => appsInsideFolders.add(appId));
            });
        }

        // Allow dragging of the icon only if the Dash would accept a drop to
        // change favorite-apps. There are no other possible drop targets from
        // the app picker, so there's no other need for a drag to start,
        // at least on single-monitor setups.
        // This also disables drag-to-launch on multi-monitor setups,
        // but we hope that is not used much.
        const isDraggable =
            global.settings.is_writable('favorite-apps') ||
            global.settings.is_writable('app-picker-layout');

        apps.forEach(appId => {
            if (!APP_GRID_ORDER && appsInsideFolders.has(appId))
                return;

            let icon = this._items.get(appId);
            if (!icon) {
                let app = appSys.lookup_app(appId);

                icon = new AppDisplay.AppIcon(app, { isDraggable });
                icon.connect('notify::pressed', () => {
                    if (icon.pressed)
                        this.updateDragFocus(icon);
                });
            }

            appIcons.push(icon);
        });

        // At last, if there's a placeholder available, add it
        if (this._placeholder)
            appIcons.push(this._placeholder);

        const runningIDs = Shell.AppSystem.get_default().get_running().map(app => app.get_id());

        // remove running apps
        if (!APP_GRID_FAV_RUN) { // !icon.app means folder
            appIcons = appIcons.filter((icon) => this._folderIcons.includes(icon) || !(runningIDs.includes(icon.app.id) || this._appFavorites.isFavorite(icon.id)));
        }

        return appIcons;
    },
}

let BaseAppViewOverride = {
    _redisplay: function() {
        let oldApps = this._orderedItems.slice();
        let oldAppIds = oldApps.map(icon => icon.id);

        let newApps = this._loadApps().sort(this._compareItems.bind(this));
        let newAppIds = newApps.map(icon => icon.id);

        let addedApps = newApps.filter(icon => !oldAppIds.includes(icon.id));
        let removedApps = oldApps.filter(icon => !newAppIds.includes(icon.id));

        // Remove old app icons
        removedApps.forEach(icon => {
            this._removeItem(icon);
            icon.destroy();
        });

        // Add new app icons, or move existing ones
        newApps.forEach(icon => {
            const [page, position] = this._getItemPosition(icon);
            if (addedApps.includes(icon))
                this._addItem(icon, page, position);
            else if (page !== -1 && position !== -1)
                this._moveItem(icon, page, position);
        });

        // Reorder App Grid by usage
        // sort all alphabetically
        if(APP_GRID_ORDER > 0) {
            const { itemsPerPage } = this._grid;
            let appIcons = this._orderedItems;
            appIcons.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            // then sort used apps by usage
            if (APP_GRID_ORDER === 2)
                appIcons.sort((a, b) => Shell.AppUsage.get_default().compare(a.app.id, b.app.id));
            // sort running first
            //appIcons.sort((a, b) => a.app.get_state() !== Shell.AppState.RUNNING && b.app.get_state() === Shell.AppState.RUNNING);
            appIcons.forEach((icon, i) => {
                const page = Math.floor(i / itemsPerPage);
                const position = i % itemsPerPage;
                this._moveItem(icon, page, position);
            });
            this._orderedItems = appIcons;
        }

        this.emit('view-loaded');
    },

    _canAccept: function(source) {
        return (APP_GRID_ORDER ? false : source instanceof AppDisplay.AppViewItem);
    }
}

// Always Show Full App Names
let AppViewItemOverride = {
    _updateMultiline() {
        if (!this._expandTitleOnHover || !this.icon.label)
            return;

        const { label } = this.icon;
        const { clutterText } = label;

        const isHighlighted = this.has_key_focus() || this.hover || this._forcedHighlight;

        label.opacity = 255;
        if (APP_GRID_NAMES_MODE === 2) {
            label.opacity = (isHighlighted || !this.app) ? 255 : 0;
        }
        if (isHighlighted)
            this.get_parent().set_child_above_sibling(this, null);

        const layout = clutterText.get_layout();
        if (!layout.is_wrapped() && !layout.is_ellipsized())
            return;

        label.remove_transition('allocation');

        const id = label.connect('notify::allocation', () => {
            label.restore_easing_state();
            label.disconnect(id);
        });

        const expand = APP_GRID_NAMES_MODE == 1 || this._forcedHighlight || this.hover || this.has_key_focus();

        label.save_easing_state();
        label.set_easing_duration(expand
            ? AppDisplay.APP_ICON_TITLE_EXPAND_TIME
            : AppDisplay.APP_ICON_TITLE_COLLAPSE_TIME);
        clutterText.set({
            line_wrap: expand,
            line_wrap_mode: expand ? Pango.WrapMode.WORD_CHAR : Pango.WrapMode.NONE,
            ellipsize: expand ? Pango.EllipsizeMode.NONE : Pango.EllipsizeMode.END,
        });
    }
}

// force fixed icon size to app grid's folder view
const FolderViewOverrides = {
    _createGrid: function() {
        const grid = new AppDisplay.FolderGrid();
        grid.layoutManager.fixedIconSize = APP_GRID_FOLDER_ICON_SIZE;
        return grid;
    }
}

// workaroung - silence page -2 error on gnome 43 during cleaning appgrid
const IconGridOverrides = {
    getItemsAtPage: function(page) {
        if (page < 0 || page > this.nPages)
            return [];
            //throw new Error(`Page ${page} does not exist at IconGrid`);

        const layoutManager = this.layout_manager;
        return layoutManager.getItemsAtPage(page);
    }
}

// this function switches workspaces with windows of the scrolled app and lowers opacity of other windows in the overview to quickly find its windows
function _connectAppIconScrollEnterLeave(app, something, appIcon = null) {
    appIcon = appIcon ? appIcon : this;
    if (!appIcon._scrollConnectionID)
        appIcon._scrollConnectionID = appIcon.connect_after('scroll-event', switchToNextAppWS);

    if (!appIcon._leaveConnectionID)
        appIcon._leaveConnectionID = appIcon.connect('leave-event', () => _onAppLeave(appIcon));

    if (!appIcon._enterConnectionID && DASH_HOVER_HIGHLIGHT_WINS)
        appIcon._enterConnectionID = appIcon.connect('enter-event', () => _onAppEnter(appIcon));
}

function _onAppEnter(appIcon) {
    // allow window highlighting only in overview WINDOW_PICKER state
    if (Main.overview._overview._controls._stateAdjustment.get_value() != 1)
        return Clutter.EVENT_PROPAGATE;

    if (_switchWsOnHoverDelayId)
        GLib.source_remove(_switchWsOnHoverDelayId);
    _switchWsOnHoverDelayId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        200,
        () => {
            _highlightMyWindows(appIcon);
            appIcon._highlightedTime = Date.now();
            _switchWsOnHoverDelayId = 0;
            return GLib.SOURCE_REMOVE;
        }
    );
}

function _onAppLeave(appIcon) {
    // even if the mouse pointer is still above the app icon, the 'leave' signals are emited during switching workspace
    // this timeout should prevent unwanted calls
    if (appIcon._switchWsTime && ((Date.now() - appIcon._switchWsTime) < 200)) {
        return;
     }

     if(!_switchWsOnHoverDelayId) {
        if (!appIcon._highlightedTime || ((Date.now() - appIcon._highlightedTime) > 50))
            _highlightMyWindows(appIcon, 255);
    } else {
        GLib.source_remove(_switchWsOnHoverDelayId);
        _switchWsOnHoverDelayId = 0;
    }
}

function switchToNextAppWS(appIcon, event) {
    if (!DASH_SCROLL_SWITCH_APP_WS)
        return Clutter.EVENT_PROPAGATE;

    // this signal should work only for icons in the Dash, not for the App Display
    if (Main.overview._overview._controls._stateAdjustment.get_value() != 1)
        return Clutter.EVENT_PROPAGATE;

    if (appIcon._scrollTime && (Date.now() - appIcon._scrollTime) < 200) {
        return Clutter.EVENT_STOP;
    }

    const direction = event ? event.get_scroll_direction() : -1;
    if (direction === Clutter.ScrollDirection.UP || direction === Clutter.ScrollDirection.DOWN || direction === -1) {
        appIcon._scroll = true;
        if (appIcon.app.get_n_windows()) {
            const appWorkspaces = [];
            appIcon.app.get_windows().forEach( w => {
                const ws = w.get_workspace();
                if (!appWorkspaces.includes(ws)) {
                    appWorkspaces.push(ws);
                }
            });
            appWorkspaces.sort((a,b) => b.index() < a.index());
            let targetWsIdx;
            const currentWS = global.workspace_manager.get_active_workspace();
            let currIdx = appWorkspaces.indexOf(currentWS);
            if (currIdx < 0) {
                for (let i = 0; i < appWorkspaces.length; i++) {
                    if (appWorkspaces[i].index() > currentWS.index()) {
                        currIdx = i;
                        break;
                    }
                }
            }
            if (direction === Clutter.ScrollDirection.UP) {
                targetWsIdx = (currIdx + appWorkspaces.length - 1) % appWorkspaces.length;
            } else if (direction === Clutter.ScrollDirection.DOWN) {
                targetWsIdx = (currIdx + 1) % appWorkspaces.length;
            } else {

            }

            //const appWS = appIcon.app.get_windows()[0].get_workspace();
            Main.wm.actionMoveWorkspace(appWorkspaces[targetWsIdx]);
            Main.overview.dash.showAppsButton.checked = false;
            appIcon._scrollTime = Date.now();

            // dimm windows of other apps
            _highlightMyWindows(appIcon, 50, true);
        }
        return Clutter.EVENT_STOP;
    }
    // activate app's workspace
    // and hide windows of other apps
}

function _highlightMyWindows (appIcon, othersOpacity = 50, forceOpacity = false) {
    if (_switchWsOnHoverDelayId) {
        GLib.source_remove(_switchWsOnHoverDelayId);
        _switchWsOnHoverDelayId = 0;
    }
    /*if (!DASH_HOVER_HIGHLIGHT_WINS)
        return;*/

    // this signal should work only for icons in the Dash, not for the App Display
    if (Main.overview.dash.showAppsButton.checked) {
        return Clutter.EVENT_PROPAGATE;
    }

    if (!appIcon) {
        appIcon = Main.overview.dash._box.get_first_child();
        if (!appIcon)
        return;
    }

    const OPACITY_HIGHLIGHT_ENABLED = (DASH_HOVER_HIGHLIGHT_WINS == 2 || forceOpacity);

    let onlyShowTitles = false;
    if (othersOpacity === 255) {
        // even if the mouse pointer is still over the application icon, "leave" signals are emitted when switching workspaces
        // this timeout should prevent unwanted calls
        if (appIcon._scrollTime && (Date.now() - appIcon._scrollTime) < 200) {
            return;
        }
        appIcon._scroll = false;
    } /*else if (!appIcon._scroll) {
        onlyShowTitles = true;
    }*/

    const app = appIcon.app;
    const currentWS = global.workspace_manager.get_active_workspace();

    // if selected app hovered and has no window on the current workspace, switch workspace
    //---------------------------------------------------------------------------
    if (othersOpacity !== 255 && !appIcon._scroll) {
        const appRecentWorkspace = _getAppRecentWorkspace(app);

        if (!appRecentWorkspace)
            return;

            let targetWindowOnCurrentWs = false;
        if (DASH_FOLLOW_RECENT_WIN) {
            targetWindowOnCurrentWs = appRecentWorkspace === currentWS;
        } else {
            app.get_windows().forEach(
                w => targetWindowOnCurrentWs = targetWindowOnCurrentWs || (w.get_workspace() === currentWS)
            );
        }
        if (!targetWindowOnCurrentWs) {
            Main.overview._overview._controls._workspaceAdjustment.set_value(appRecentWorkspace.index());
            appIcon._switchWsTime = Date.now();
            Main.wm.actionMoveWorkspace(appRecentWorkspace);
        }
    }
    //---------------------------------------------------------------------------

    //const currentWS = global.workspace_manager.get_active_workspace();
    let lastUsedWinForWs = null;
    app.get_windows().forEach(w => {
        if (!lastUsedWinForWs && w.get_workspace() === currentWS) {
            lastUsedWinForWs = w;
        }
    });

    //const appRecentWorkspace = _getAppRecentWorkspace(app);
    const appLastUsedWindow = _getAppLastUsedWindow(app);

    const views = Main.overview._overview.controls._workspacesDisplay._workspacesViews;
    const viewsIter = [views[0]];
    // socondary monitors use different structure
    views.forEach(v => {
        if (v._workspacesView)
            viewsIter.push(v._workspacesView)
    });

    viewsIter.forEach(view => {
        // if workspaces are on primary monitor only
        if (!view || !view._workspaces)
            return;

        view._workspaces.forEach(ws => {
            ws._windows.forEach(windowPreview => {
                try {
                    windowPreview._title.opacity;
                } catch {
                    return;
                }

                let opacity, titleOpacity;
                if (app.get_windows().includes(windowPreview.metaWindow)) {
                    opacity = 255;
                    titleOpacity = othersOpacity === 255 ? 0 : 255;
                    if (windowPreview.metaWindow === appLastUsedWindow) {
                        windowPreview._closeButton.show();
                        windowPreview._closeButton.opacity = opacity;
                        //windowPreview._closeButton.set_style('background-color: green');
                    }
                } else {
                    opacity = othersOpacity;
                    titleOpacity = 0;
                }

                titleOpacity = ALWAYS_SHOW_WIN_TITLES ? 255 : titleOpacity;
                // If we're supposed to animate and an animation in our direction
                // is already happening, let that one continue
                const ongoingTransition = windowPreview._title.get_transition('opacity');
                if (!(ongoingTransition &&
                    ongoingTransition.get_interval().peek_final_value() === titleOpacity)) {
                        windowPreview._title.ease({
                            opacity: titleOpacity,
                            duration: WindowPreview.WINDOW_OVERLAY_FADE_TIME,
                            onComplete: () => {
                                if (titleOpacity === 0) {
                                    if(ALWAYS_SHOW_WIN_TITLES) {
                                        windowPreview._title.opacity = 255;
                                    }
                                    //windowPreview._closeButton.opacity = 0;
                                } else {
                                    windowPreview._title.show();
                                }
                            }
                        });
                        windowPreview._closeButton.ease({
                            opacity: titleOpacity,
                            duration: WindowPreview.WINDOW_OVERLAY_FADE_TIME,
                            onComplete: othersOpacity === 255 && windowPreview._closeButton.hide()
                        });
                    }

                if (onlyShowTitles) return;

                if (OPACITY_HIGHLIGHT_ENABLED || opacity == 255) {
                    windowPreview.ease({
                        opacity: opacity,
                        duration: WindowPreview.WINDOW_OVERLAY_FADE_TIME,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                    });
                }
            });
        });
    });
}

// WorkspaceThumbnail
let WorkspaceThumbnailOverride = {
    after__init: function () {
        // add workspace thumbnails labels if enabled
        if (SHOW_WST_LABELS) { // 0 - disable
            // layout manager allows aligning widget childs
            this.layout_manager = new Clutter.BinLayout();
            const wsIndex = this.metaWorkspace.index();

            let label = `${wsIndex + 1}`;

            if (SHOW_WST_LABELS === 2) { // 2 - index + workspace name
                const settings = ExtensionUtils.getSettings('org.gnome.desktop.wm.preferences');
                const wsLabels = settings.get_strv('workspace-names');
                if (wsLabels.length > wsIndex && wsLabels[wsIndex]) {
                    label += `: ${wsLabels[wsIndex]}`;
                }
            } else if (SHOW_WST_LABELS === 3) { // 3- index + app name
                // global.display.get_tab_list offers workspace filtering using the second argument, but...
                // ... it sometimes includes windows from other workspaces, like minimized VBox machines, after shell restarts
                const metaWin = global.display.get_tab_list(0, null).filter(
                    w => w.get_monitor() === this.monitorIndex && w.get_workspace().index() === wsIndex
                )[0];

                if (metaWin) {
                    let tracker = Shell.WindowTracker.get_default();
                    label += `: ${tracker.get_window_app(metaWin).get_name()}`;
                }
            }
            this._wstLabel = new St.Label({
                text: label,
                style_class: 'dash-label',//'window-caption',// 'ws-tmb-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.END,
                x_expand: true,
                y_expand: true,
            });
            this._wstLabel.set_style('padding-top: 5px; padding-bottom: 5px;');
            this._wstLabel._maxOpacity = 255;
            this._wstLabel.opacity = this._wstLabel._maxOpacity;
            //this.add_child(this._wstLabel);
            //this.set_child_above_sibling(this._wstLabel, null);
            if (SHOW_WST_LABELS) {
                this.reactive = true;
                this._wstLabel.opacity = 0;
                Main.layoutManager.addChrome(this._wstLabel);
                this._wstLabel.hide();

                this.connect('enter-event', ()=> {
                    this._wstLabel.show();
                    let [stageX, stageY] = this.get_transformed_position();
                    const itemWidth = this.allocation.get_width();
                    const itemHeight = this.allocation.get_height();

                    const labelWidth = this._wstLabel.get_width();
                    //const labelHeight = this._wstLabel.get_height();
                    const xOffset = Math.floor((itemWidth - labelWidth) / 2);
                    let x = Math.clamp(stageX + xOffset, 0, global.stage.width - labelWidth);

                    let node = this._wstLabel.get_theme_node();

                    const yOffset = itemHeight + node.get_length('-y-offset');
                    let y = stageY + yOffset;

                    this._wstLabel.set_position(x, y);

                    this._wstLabel.ease({
                        duration: 100,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                        opacity: this._wstLabel._maxOpacity,
                    });
                });

                this.connect('leave-event', ()=> {
                    this._wstLabel.ease({
                        duration: 100,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                        opacity: 0,
                        onComplete: () => this._wstLabel.hide()
                    })
                });
            }
        }

        if (WS_TMB_HOVER_SWITCH) {
            this.reactive = true;
            this.connect('enter-event', () => Main.wm.actionMoveWorkspace(this.metaWorkspace));
        }

        if (!SHOW_WS_TMB_BG)
            return;

        this._bgManager = new Background.BackgroundManager({
            monitorIndex: this.monitorIndex,
            container: this._viewport,
            vignette: false,
            controlPosition: false,
        });

        this._viewport.set_child_below_sibling(this._bgManager.backgroundActor, null);

        this.connect('destroy', function () {
            if (this._bgManager)
                this._bgManager.destroy();
            this._bgManager = null;
        }.bind(this));

        this._bgManager.backgroundActor.opacity = 220;
    }
}

// --------------------------------------------------------------------------------------------------------------------

function _getWindowApp(metaWin) {
    const tracker = Shell.WindowTracker.get_default();
    return tracker.get_window_app(metaWin);
}

function _getAppLastUsedWindow(app) {
    let recentWin;
    global.display.get_tab_list(Meta.TabList.NORMAL_ALL, null).forEach(metaWin => {
        const winApp = _getWindowApp(metaWin);
        if (!recentWin && winApp == app) {
            recentWin = metaWin;
        }
    });
    return recentWin;
}

function _getAppRecentWorkspace(app) {
    const recentWin = _getAppLastUsedWindow(app)
    if (recentWin)
        return recentWin.get_workspace();

    return null;
}

// not used at the moment. custom folder size
var FolderGrid = GObject.registerClass(
class FolderGrid extends IconGrid.IconGrid {
    _init() {
        super._init({
            allow_incomplete_pages: false,
            columns_per_page: 10,
            rows_per_page: 4,
            page_halign: Clutter.ActorAlign.CENTER,
            page_valign: Clutter.ActorAlign.CENTER,
        });
    }

    adaptToSize(width, height) {
        this.layout_manager.adaptToSize(width, height);
    }
});
