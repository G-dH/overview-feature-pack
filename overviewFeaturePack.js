/**
 * OFP - Overview Feature Pack
 * OverviewFeaturePack
 *
 * @author     GdH <G-dH@github.com>
 * @copyright  2022
 * @license    GPL-3.0
 */

'use strict';

const { Clutter, GLib, Meta, Shell, St } = imports.gi;
const { AppMenu } = imports.ui.appMenu;
const PopupMenu = imports.ui.popupMenu;
const BoxPointer = imports.ui.boxpointer;
const Layout = imports.ui.layout;
const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;
const Dash = imports.ui.dash;
const OverviewControls = imports.ui.overviewControls;
const WorkspacesView = imports.ui.workspacesView;
const WindowPreview = imports.ui.windowPreview;
const Workspace = imports.ui.workspace;
const WorkspaceThumbnail = imports.ui.workspaceThumbnail;
const Background = imports.ui.background;

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
let _dashRedisplayTimeoutId = 0;
let _hoverActivatesWindowSigId = 0;

let gOptions;


function activate() {
    gOptions = new Settings.Options();

    gOptions.connect('changed', _updateSettings);

    if (gOptions.get('searchWindowsEnable')) {
        WindowSearchProvider.enable(gOptions);
    }

    if (Object.keys(_featurePackOverrides).length != 0)
        reset();

    _featurePackOverrides['WorkspacesDisplay'] = _Util.overrideProto(WorkspacesView.WorkspacesDisplay.prototype, WorkspacesDisplayOverride);
    _featurePackOverrides['AppIcon'] = _Util.overrideProto(AppDisplay.AppIcon.prototype, AppIconOverride);
    _featurePackOverrides['HotCorner'] = _Util.overrideProto(Layout.HotCorner.prototype, HotCornerOverride);
    _featurePackOverrides['WindowPreview'] = _Util.overrideProto(WindowPreview.WindowPreview.prototype, WindowPreviewOverride);
    _featurePackOverrides['WorkspaceThumbnail'] = _Util.overrideProto(WorkspaceThumbnail.WorkspaceThumbnail.prototype, WorkspaceThumbnailOverride);

    Main.layoutManager._updateHotCorners();
    _injectAppIcon();
    _injectWindowPreview();
    _injectWorkspace();
    _updateDash();
    _updateSettings();
}

function reset() {
    if (!gOptions)
        return;

    for (let name in _appIconInjections) {
        _Util.removeInjection(AppDisplay.AppIcon.prototype, _appIconInjections, name);
    }
    _appIconInjections = {};

    for (let name in _windowPreviewInjections) {
        _Util.removeInjection(WindowPreview.WindowPreview.prototype, _windowPreviewInjections, name);
    }

    for (let name in _workspaceInjections) {
        _Util.removeInjection(Workspace.Workspace.prototype, _workspaceInjections, name);
    }

    _Util.overrideProto(AppDisplay.AppIcon.prototype, _featurePackOverrides['AppIcon']);
    _Util.overrideProto(WorkspacesView.WorkspacesDisplay.prototype, _featurePackOverrides['WorkspacesDisplay']);
    _Util.overrideProto(Layout.HotCorner.prototype, _featurePackOverrides['HotCorner']);
    _Util.overrideProto(WindowPreview.WindowPreview.prototype, _featurePackOverrides['WindowPreview']);
    _Util.overrideProto(WorkspaceThumbnail.WorkspaceThumbnail.prototype, _featurePackOverrides['WorkspaceThumbnail']);
    _featurePackOverrides = {};

    const removeConnections = true;
    _updateDash(removeConnections);

    if (_dashRedisplayTimeoutId) {
        GLib.source_remove(_dashRedisplayTimeoutId);
        _dashRedisplayTimeoutId = 0;
    }

    WindowSearchProvider.disable();

    gOptions.destroy();
    gOptions = null;
}

//---------------------------------------------------

function _updateSettings(settings, key) {
    switch (key) {
    case 'search-windows-enable':
        if (gOptions.get('searchWindowsEnable'))
                WindowSearchProvider.enable(gOptions);
            else
                WindowSearchProvider.disable();
        break;
    case 'hover-activates-window-on-leave':
        _updateHoverActivatesWindow();
        break;
    }
}

function _updateHoverActivatesWindow() {
    const state = gOptions.get('hoverActivatesWindowOnLeave');
    if (state) {
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

function _moveDashAppGridIconLeft(reset = false) {
    // move dash app grid icon to the front
    const dash = Main.overview.dash;
    let target;
    if (reset)
        target = dash._showAppsIcon;
    else
        target = dash._box;
    const container = dash._dashContainer;
    container.remove_actor(target);
    container.add_actor(target);
}

function _updateDash(remove = false) {
    // destroying dash icons and redisplay has consequences - error nessages in log and placeholders whilde DND icons in Dash

    // sometimes Dash missing some icons, _redisplay can add them. But this executes too early after shell restarts so it has no effect here in this case
    //Main.overview.dash._redisplay();
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
        } else if (appIcon && !appIcon._scrollConnectionID) {
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
}

function _activateWindowSearchProvider() {
    const prefix = _('wq: ');
    const position = prefix.length;
    Main.overview._overview._controls._searchEntry.set_text(prefix);
    Main.overview._overview._controls._searchEntry.grab_key_focus();
    Main.overview._overview._controls._searchEntry.get_first_child().set_cursor_position(position);
    Main.overview._overview._controls._searchEntry.get_first_child().set_selection(position, position);
}

//---Workspace--------

function _injectWorkspace() {
    _workspaceInjections['_init'] = _Util.injectToFunction(
        Workspace.Workspace.prototype, '_init', function() {
            if (gOptions.get('searchWindowsEnable') && gOptions.get('searchWindowsClickEmptySpace')) {
                const clickAction2 = new Clutter.ClickAction();
                clickAction2.connect('clicked', action => {
                    if (gOptions.get('searchWindowsEnable') && gOptions.get('searchWindowsClickEmptySpace')) {
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
}


// WorkspacesDisplay
// add reorder workspace using Shift + (mouse wheel / PageUP/PageDown)
// needed for options shiftReordersWs, spaceActivatesDash, searchWindowsEnable, searchWindowsSpaceKey
var WorkspacesDisplayOverride = {
    _onScrollEvent: function(actor, event) {
        if (this._swipeTracker.canHandleScrollEvent(event))
            return Clutter.EVENT_PROPAGATE;

        if (!this.mapped)
            return Clutter.EVENT_PROPAGATE;

        if (this._workspacesOnlyOnPrimary &&
            this._getMonitorIndexForEvent(event) != this._primaryIndex)
            return Clutter.EVENT_PROPAGATE;

        if (gOptions.get('shiftReordersWs') && global.get_pointer()[2] & Clutter.ModifierType.SHIFT_MASK) {
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
            if (isCtrlPressed && gOptions.get('spaceActivatesDash')) {
                Main.ctrlAltTabManager._items.forEach(i => {if (i.sortGroup === 1 && i.name === 'Dash') Main.ctrlAltTabManager.focusGroup(i)});
            } else if (gOptions.get('searchWindowsEnable') && gOptions.get('searchWindowsSpaceKey')) {
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

        if (gOptions.get('shiftReordersWs') && event.get_state() & Clutter.ModifierType.SHIFT_MASK) {
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

var HotCornerOverride = {
    _toggleOverview: function(){
        if (!gOptions.get('fullscreenHotCorner') && this._monitor.inFullscreen && !Main.overview.visible)
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
            if (gOptions.get('moveTitlesIntoWindows')) {
                this._title.get_constraints()[1].offset = - 1.3 * WindowPreview.ICON_SIZE;
                this.set_child_above_sibling(this._title, null);
            }
            if (gOptions.get('alwaysShowWindowTitles'))
                this._title.show();
                this._title.opacity = 255;
        }
    );
}
// add fading in/out window title for option always show titles
var WindowPreviewOverride = {
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
        if (gOptions.get('alwaysShowWindowTitles')) {
            this._title.set({
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
        const ongoingTransition = this._title.get_transition('opacity');
        if (animate &&
            ongoingTransition &&
            ongoingTransition.get_interval().peek_final_value() === 255)
            return;

        const toShow = this._windowCanClose()
            ? [this._closeButton]
            : [];

        if (!gOptions.get('alwaysShowWindowTitles')) {
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

        if (gOptions.get('hoverActivatesWindowOnLeave') && Main.overview._shown) {
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
        const ongoingTransition = this._title.get_transition('opacity');
        if (animate &&
            ongoingTransition &&
            ongoingTransition.get_interval().peek_final_value() === 0)
            return;

        const toHide = [this._closeButton];

        if (!gOptions.get('alwaysShowWindowTitles')) {
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

        if (gOptions.get('hoverActivatesWindowOnLeave') && this._focusWindowSet) {
            this._focusWindowSet = false;
            global.windowToActivate = null;
        }
    }
}

//----- AppIcon -----------------------------------------------------------------------

function _injectAppIcon() {
    _appIconInjections['_init'] = _Util.injectToFunction(
        AppDisplay.AppIcon.prototype, '_init', _connectAppIconScrollEnterLeave
    );
}

var AppIconOverride = {
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
        if (gOptions.get('dashClickFollowsRecentWindow')) {
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
        } else if (gOptions.get('dashShowWindowsBeforeActivation') && !isShiftPressed && this.app.get_n_windows() > 1 && !targetWindowOnCurrentWs) {
            this._scroll = true;
            this._scrollTime = new Date();
            //const appWS = this.app.get_windows()[0].get_workspace();
            Main.wm.actionMoveWorkspace(appRecentWorkspace);
            Main.overview.dash.showAppsButton.checked = false;
            return;
        } else if (gOptions.get('dashShiftClickMovesAppToCurrentWs') && isShiftPressed && this.app.get_windows().length) {
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

            this._getWindowsOnCurrentWs = function() {
                const winList = [];
                this.app.get_windows().forEach(w => {
                    if(w.get_workspace() === global.workspace_manager.get_active_workspace()) winList.push(w)
                });
                return winList;
            }
            this._windowsOnOtherWs = function() {
                return (this.app.get_windows().length - this._getWindowsOnCurrentWs().length) > 0;
            }
        }

        // once the menu is created, it stays unchanged and we need to modify our items based on current situation
        if (this._addedMenuItems && this._addedMenuItems.length) {
            this._addedMenuItems.forEach(i => i.destroy());
        }

        const popupItems =[];

        const separator = new PopupMenu.PopupSeparatorMenuItem();
        this._menu.addMenuItem(separator);

        if (this.app.get_n_windows()) {
            if (gOptions.get('appMenuForceQuit')) {
                popupItems.push([_('Force Quit'), () => this.app.get_windows()[0].kill()]);
            }

            if (gOptions.get('appMenuCloseWindowsOnCurrentWs')) {
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

            if (gOptions.get('appMenuMoveAppToWs') && this._windowsOnOtherWs()) {
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

// this function switches workspaces with windows of the scrolled app and lowers opacity of other windows in the overview to quickly find its windows
function _connectAppIconScrollEnterLeave(app, something, appIcon = null) {
    const _delegate = appIcon ? appIcon : this;
    _delegate._enterConnectionID = _delegate.connect('enter-event', () => _highlightMyWindows(_delegate, _delegate.app));
    _delegate._leaveConnectionID = _delegate.connect('leave-event', () => _highlightMyWindows(_delegate, _delegate.app, 255));
    _delegate._scrollConnectionID = _delegate.connect_after('scroll-event', (actor, event) => {

        if (!gOptions.get('dashScrollSwitchesAppWindowsWs'))
            return Clutter.EVENT_PROPAGATE;

        // this signal should work only for icons in the Dash, not for the App Display
        if (Main.overview.dash.showAppsButton.checked)
            return Clutter.EVENT_PROPAGATE;

        if (_delegate._scrollTime && (new Date() - _delegate._scrollTime) < 200) {
            return Clutter.EVENT_STOP;
        }

        const direction = event.get_scroll_direction();
        if (direction === Clutter.ScrollDirection.UP || direction === Clutter.ScrollDirection.DOWN) {
            _delegate._scroll = true;
            if (_delegate.app.get_n_windows()) {
                const appWorkspaces = [];
                _delegate.app.get_windows().forEach( w => {
                    const ws = w.get_workspace();
                    if (!appWorkspaces.includes(ws)) {
                        appWorkspaces.push(ws);
                    }
                });
                appWorkspaces.sort((a,b) => b.index() < a.index());
                let targetWsIdx;
                const currentWS = global.workspace_manager.get_active_workspace();
                const currIdx = appWorkspaces.indexOf(currentWS);
                if (direction === Clutter.ScrollDirection.UP) {
                    targetWsIdx = (currIdx + appWorkspaces.length - 1) % appWorkspaces.length;
                } else {
                    targetWsIdx = (currIdx + 1) % appWorkspaces.length;
                }

                //const appWS = _delegate.app.get_windows()[0].get_workspace();
                Main.wm.actionMoveWorkspace(appWorkspaces[targetWsIdx]);
                Main.overview.dash.showAppsButton.checked = false;
                _delegate._scrollTime = new Date();

                // dimm windows of other apps
                _highlightMyWindows(_delegate, _delegate.app);
            }
            return Clutter.EVENT_STOP;
        }
        // activate app's workspace
        // and hide windows of other apps
    });
}

function _highlightMyWindows (delegate, app, othersOpacity = 50) {
    if (!gOptions.get('dashHoverIconHighlitsWindows'))
        return;

    // this signal should work only for icons in the Dash, not for the App Display
    if (Main.overview.dash.showAppsButton.checked)
        return Clutter.EVENT_PROPAGATE;

    const _delegate = delegate;
    let onlyShowTitles = false;
    if (othersOpacity === 255) {
        // even if the mouse pointer is still above the app icon, the 'leave' signals are emited during switching workspace
        // this timeout should prevent unwanted calls
        if (_delegate._scrollTime && (new Date() - _delegate._scrollTime) < 200) {
            return;
        }
        _delegate._scroll = false;
    } else if (!_delegate._scroll) {
        onlyShowTitles = true;
    }

    const currentWS = global.workspace_manager.get_active_workspace();
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

                titleOpacity = gOptions.get('alwaysShowWindowTitles') ? 255 : titleOpacity;
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
                                    if(gOptions.get('alwaysShowWindowTitles')) {
                                        windowPreview._title.opacity = 255;
                                    }
                                    //windowPreview._closeButton.opacity = 0;
                                } else {
                                    windowPreview._title.show();
                                }
                            }
                        });
                    }


                if (onlyShowTitles)
                    return;

                windowPreview.ease({
                    opacity: opacity,
                    duration: WindowPreview.WINDOW_OVERLAY_FADE_TIME,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                });
            });
        });
    });
}

// WorkspaceThumbnail
var WorkspaceThumbnailOverride = {
    after__init: function () {
        const SHOW_WST_LABELS = gOptions.get('showWsTmbLabels');
        const SHOW_WST_LABELS_ON_HOVER = true;//gOptions.get('showWsTmbLabelsOnHover');
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
                const metaWin = global.display.get_tab_list(0, this.metaWorkspace).filter(w => w.get_monitor() === this.monitorIndex)[0];

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
            if (SHOW_WST_LABELS_ON_HOVER) {
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
                    const labelHeight = this._wstLabel.get_height();
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

                this.connect('destroy', () => {
                    Main.layoutManager.removeChrome(this._wstLabel);
                    this._wstLabel.destroy();
                });
            }
        }

        if (!gOptions.get('showWsSwitcherBg'))
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
