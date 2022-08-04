/**
 * OFP - Overview Feature Pack
 * Prefs
 *
 * @author     GdH <G-dH@github.com>
 * @copyright  2022
 * @license    GPL-3.0
 */

'use strict';

const { Gtk, GLib, Gio, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const Settings       = Me.imports.settings;

// gettext
const _  = Settings._;

// libadwaita is available starting with GNOME Shell 42.
let Adw = null;
try { Adw = imports.gi.Adw; } catch (e) {}

let gOptions;
let stackSwitcher;
let stack;
let windowWidget;

const GENERAL_TITLE = _('General');
const GENERAL_ICON = 'preferences-system-symbolic';
const DASH_TITLE = _('Dash');
const DASH_ICON = 'user-bookmarks-symbolic';
const SEARCH_TITLE = _('Search');
const SEARCH_ICON = 'edit-find-symbolic';
const APPGRID_TITLE = _('App Grid');
const APPGRID_ICON = 'view-app-grid-symbolic';

function _newImageFromIconName(name) {
    return Gtk.Image.new_from_icon_name(name);
}


function init() {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
    gOptions = new Settings.Options();
}

// this function is called by GS42 if available and returns libadwaita prefes window
function fillPreferencesWindow(window) {
    const overviewOptionsPage = getAdwPage(_getGeneralOptionList(), {
        title: GENERAL_TITLE,
        icon_name: GENERAL_ICON,
    });
    const dashOptionsPage = getAdwPage(_getDashOptionList(), {
        title: DASH_TITLE,
        icon_name: DASH_ICON
    });
    const appGridPage = getAdwPage(_getAppGridOptionList(), {
        title: APPGRID_TITLE,
        icon_name: APPGRID_ICON
    });
    const searchPage = getAdwPage(_getSearchOptionList(), {
        title: SEARCH_TITLE,
        icon_name: SEARCH_ICON
    });

    window.add(overviewOptionsPage);
    window.add(dashOptionsPage);
    window.add(appGridPage);
    window.add(searchPage);

    window.set_search_enabled(true);

    windowWidget = window;

    window.connect('close-request', _onDestroy);

    const width = 600;
    const height = 700;
    window.set_default_size(width, height);

    return window;
}

function _onDestroy() {
    gOptions.destroy();
    gOptions = null;
    windowWidget = null;
}


// this function is called by GS prior to 42 and also by 42 if fillPreferencesWindow not available
function buildPrefsWidget() {
    const prefsWidget = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
    });

    stack = new Gtk.Stack({
        hexpand: true
    });

    stackSwitcher = new Gtk.StackSwitcher({
        halign: Gtk.Align.CENTER,
        hexpand: true,
    });

    const context = stackSwitcher.get_style_context();
    context.add_class('caption');

    stackSwitcher.set_stack(stack);
    stack.set_transition_duration(300);
    stack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT_RIGHT);

    stack.add_named(getLegacyPage(_getGeneralOptionList()), 'general');
    stack.add_named(getLegacyPage(_getDashOptionList()), 'dash');
    stack.add_named(getLegacyPage(_getAppGridOptionList()), 'appgrid');
    stack.add_named(getLegacyPage(_getSearchOptionList()), 'search');

    const pagesBtns = [
        [new Gtk.Label({ label: GENERAL_TITLE}), _newImageFromIconName(GENERAL_ICON, Gtk.IconSize.BUTTON)],
        [new Gtk.Label({ label: DASH_TITLE}), _newImageFromIconName(DASH_ICON, Gtk.IconSize.BUTTON)],
        [new Gtk.Label({ label: APPGRID_TITLE}), _newImageFromIconName(APPGRID_ICON, Gtk.IconSize.BUTTON)],
        [new Gtk.Label({ label: SEARCH_TITLE}), _newImageFromIconName(SEARCH_ICON, Gtk.IconSize.BUTTON)],
    ];

    let stBtn = stackSwitcher.get_first_child ? stackSwitcher.get_first_child() : null;
    for (let i = 0; i < pagesBtns.length; i++) {
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 6, visible: true});
        const icon = pagesBtns[i][1];
        icon.margin_start = 30;
        icon.margin_end = 30;
        box.append(icon);
        box.append(pagesBtns[i][0]);
        if (stackSwitcher.get_children) {
            stBtn = stackSwitcher.get_children()[i];
            stBtn.add(box);
        } else {
            stBtn.set_child(box);
            stBtn.visible = true;
            stBtn = stBtn.get_next_sibling();
        }
    }

    stack.show_all && stack.show_all();
    stackSwitcher.show_all && stackSwitcher.show_all();

    prefsWidget.append(stack);
    prefsWidget.show_all && prefsWidget.show_all();

    prefsWidget.connect('realize', (widget) => {
        const window = widget.get_root ? widget.get_root() : widget.get_toplevel();
        const width = 600;
        const height = 700;
        window.set_default_size(width, height);

        const headerbar = window.get_titlebar();
        headerbar.title_widget = stackSwitcher;

        window.connect('close-request', _onDestroy);
    });

    return prefsWidget;
}

///////////////////////////////////////////////////
function getAdwPage(optionList, pageProperties = {}) {
    /*const groupWidth = 800;
    pageProperties.width_request = groupWidth + 100;*/
    const page = new Adw.PreferencesPage(pageProperties);
    let group;
    for (let item of optionList) {
        // label can be plain text for Section Title
        // or GtkBox for Option
        const option = item[0];
        const widget = item[1];

        if (!widget) {
            if (group) {
                page.add(group);
            }
            group = new Adw.PreferencesGroup({
                title: option,
                hexpand: true,
            });
            continue;
        }

        const row = new Adw.PreferencesRow({
            title: option._title,
        });

        const grid = new Gtk.Grid({
            column_homogeneous: false,
            column_spacing: 10,
            margin_start: 8,
            margin_end: 8,
            margin_top: 8,
            margin_bottom: 8,
            hexpand: true,
        })

        grid.attach(option, 0, 0, 6, 1);
        if (widget) {
            grid.attach(widget, 6, 0, 3, 1);
        }
        row.set_child(grid);
        group.add(row);
    }
    page.add(group);
    return page;
}

function getLegacyPage(optionList) {
    const page = new Gtk.ScrolledWindow({
        hscrollbar_policy: Gtk.PolicyType.NEVER,
        vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
        vexpand: true,
        hexpand: true,
    });

    const context = page.get_style_context();
    context.add_class('background');

    const mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 5,
        homogeneous: false,
        margin_start: 16,
        margin_end: 16,
        margin_top: 16,
        margin_bottom: 16,
    });

    let frame;
    let frameBox;

    for (let item of optionList) {
        // item structure: [labelBox, control widget]
        const option = item[0];
        const widget = item[1];
        if (!widget) {
            // new section
            let lbl = new Gtk.Label({
                xalign: 0,
                margin_top: 4,
                margin_bottom: 2
            });
            lbl.set_markup(option); // option is plain text if item is section title
            mainBox.append(lbl);
            frame = new Gtk.Frame({
                margin_bottom: 10,
            });
            frameBox = new Gtk.ListBox({
                selection_mode: null,
            });
            mainBox.append(frame);
            frame.set_child(frameBox);
            continue;
        }
        const grid = new Gtk.Grid({
            column_homogeneous: true,
            column_spacing: 10,
            margin_start: 8,
            margin_end: 8,
            margin_top: 8,
            margin_bottom: 8,
            hexpand: true,
        })

        grid.attach(option, 0, 0, 6, 1);
        if (widget) {
            grid.attach(widget, 6, 0, 3, 1);
        }

        frameBox.append(grid);
    }

    page.set_child(mainBox);
    page.show_all && page.show_all();

    return page;
}

/////////////////////////////////////////////////////////////////////

function _newSwitch() {
    let sw = new Gtk.Switch({
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
        hexpand: true,
    });
    sw.is_switch = true;
    return sw;
}

function _newSpinButton(adjustment) {
    let spinButton = new Gtk.SpinButton({
        halign: Gtk.Align.END,
        hexpand: true,
        xalign: 0.5,
    });
    spinButton.set_adjustment(adjustment);
    spinButton.is_spinbutton = true;
    return spinButton;
}

function _newComboBox() {
    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);
    const comboBox = new Gtk.ComboBox({
        model,
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
        hexpand: true,
    });
    const renderer = new Gtk.CellRendererText();
    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);
    comboBox.is_combo_box = true;
    return comboBox;
}

function _newEntry() {
    const entry = new Gtk.Entry({
        width_chars: 25,
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
        hexpand: true,
        xalign: 0,
    });
    entry.set_icon_from_icon_name(Gtk.EntryIconPosition.SECONDARY, 'edit-clear-symbolic');
    entry.set_icon_activatable(Gtk.EntryIconPosition.SECONDARY, true);
    entry.connect('icon-press', (e) => e.set_text(''));
    entry.is_entry = true;
    return entry;
}

function _newScale(adjustment) {
    const scale = new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        draw_value:  true,
        has_origin:  false,
        value_pos:   Gtk.PositionType.LEFT,
        digits:      0,
        halign:      Gtk.Align.FILL,
        valign:      Gtk.Align.CENTER,
        hexpand:     true,
        vexpand:     false,
    });
    scale.set_adjustment(adjustment);
    scale.is_scale = true;
    return scale;
}

function _newColorButton() {
    const colorBtn = new Gtk.ColorButton({
        hexpand: true,
    });
    colorBtn.set_use_alpha(true);
    colorBtn.is_color_btn = true;

    return colorBtn;
}

function _newColorResetBtn(colIndex, colorBtn) {
    const colorReset = new Gtk.Button({
        hexpand: false,
        halign: Gtk.Align.END,
    });
    colorReset.set_tooltip_text(_('Reset color to default value'));

    if (colorReset.set_icon_name) {
        colorReset.set_icon_name('edit-clear-symbolic');
    } else {
        colorReset.add(Gtk.Image.new_from_icon_name('edit-clear-symbolic', Gtk.IconSize.BUTTON));
    }
    colorReset.connect('clicked', () =>{
        const color = gOptions.get('defaultColors')[colIndex];
        if (!color) return;
        const rgba = colorBtn.get_rgba();
        const success = rgba.parse(color);
        if (success)
            colorBtn.set_rgba(rgba);
        gOptions.set(colorBtn._gsettingsVar, rgba.to_string());
    });

    return colorReset;
}

function _newColorButtonBox() {
    const box = new Gtk.Box({
        hexpand: true,
        spacing: 4,
    });

    box.is_color_box = true;
    return box;
}

function _newButton() {
    const button = new Gtk.Button({
        label: 'Apply',
        hexpand: false,
        vexpand: false,
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER
    });
    button.is_button = true;

    return button;
}

function _optionsItem(text, tooltip, widget, variable, options = []) {
    let item = [];
    let label;
    if (widget) {
        label = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            halign: Gtk.Align.START,
            valign: Gtk.Align.CENTER,
        });

        label._title = text;
        const option = new Gtk.Label({
            halign: Gtk.Align.START,
        });
        option.set_markup(text);

        label.append(option);

        if (tooltip) {
            const caption = new Gtk.Label({
                halign: Gtk.Align.START,
                wrap: true,
                xalign: 0
            })
            const context = caption.get_style_context();
            context.add_class('dim-label');
            context.add_class('caption');
            caption.set_text(tooltip);
            label.append(caption);
        }

    } else {
        label = text;
    }
    item.push(label);
    item.push(widget);

    let settings;
    let key;

    if (variable && gOptions.options[variable]) {
        const opt = gOptions.options[variable];
        key = opt[1];
        settings = opt[2] ? opt[2]() : gOptions._gsettings;
    }
    if (widget && widget.is_switch) {
        settings.bind(key, widget, 'active', Gio.SettingsBindFlags.DEFAULT);

    } else if (widget && widget.is_combo_box) {
        let model = widget.get_model();
        for (const [label, value] of options) {
            let iter;
            model.set(iter = model.append(), [0, 1], [label, value]);
        }
        settings.bind(key, widget, 'active', Gio.SettingsBindFlags.DEFAULT);

    } else if (widget && widget.is_entry) {
        if (options) {
            const names = gOptions.get(variable);
            if (names[options - 1])
                widget.set_text(names[options - 1]);

            widget.set_placeholder_text(_('Workspace') + ` ${options}`);

            widget.connect('changed', () => {
                const names = [];
                wsEntries.forEach(e => {
                if (e.get_text())
                    names.push(e.get_text());
                })
                gOptions.set('wsNames', names);
            });

            wsEntries.push(widget);
        }

    } else if (widget && widget.is_scale) {
        settings.bind(key, widget.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);

    } else if (widget && (widget.is_color_btn || widget.is_color_box)) {
        let colorBtn;
        if (widget.is_color_box) {
            colorBtn = widget.colorBtn;
        } else {
            colorBtn = widget;
        }
        const rgba = colorBtn.get_rgba();
        rgba.parse(gOptions.get(variable));
        colorBtn.set_rgba(rgba);

        colorBtn.connect('color_set', () => {
            gOptions.set(variable, `${colorBtn.get_rgba().to_string()}`);
        });

        settings.connect(`changed::${key}`,() => {
            const rgba = colorBtn.get_rgba();
            rgba.parse(gOptions.get(variable));
            colorBtn.set_rgba(rgba);
        });

    }

    return item;
}

//////////////////////////////////////////////////////////////////////

function _getGeneralOptionList() {
    const optionList = [];
    // options item format:
    // [text, tooltip, widget, settings-variable, options for combo]

    optionList.push(
        _optionsItem(
            _('Overview'),
        )
    );

    optionList.push(
        _optionsItem(
            _('Shift Reorders Workspace'),
            _('Allows you to reorder the current workspace using Shift + Scroll or Shift + PageUP/PageDown keys.'),
            _newSwitch(),
            'shiftReordersWs'
        )
    );

    optionList.push(
        _optionsItem(
            _('Ctrl + Space Activates Dash'),
            _('Pressing Ctrl + Space bar in the overview activates Dash. You can navigate between app icons using Tab, left/right arrow keys and activate the app using Space or Enter key.'),
            _newSwitch(),
            'spaceActivatesDash'
        )
    );

    optionList.push(
        _optionsItem(
            _('Move Titles Into Windows'),
            _('Moves captions with window titles up into the window previews to make them more visible and associated with the window.'),
            _newSwitch(),
            'moveTitlesIntoWindows'
        )
    );

    optionList.push(
        _optionsItem(
            _('Always Show Window Titles'),
            _('Window titles will always be visible, not only when you hover the mouse pointer over the window preview. Enable also previous option "Move Titles Into Windows" to make all titles visible.'),
            _newSwitch(),
            'alwaysShowWindowTitles'
        )
    );

    optionList.push(
        _optionsItem(
            _('Hover Selects Window For Activation'),
            _('When active, window under the mouse pointer will be activated when leaving the Overview even without clicking. Press Super, place mouse pointer over a window, press Super again to activate it.'),
            _newSwitch(),
            'hoverActivatesWindowOnLeave'
        )
    );

    optionList.push(
        _optionsItem(
            _('Show Workspace Label on Hover'),
            _('Each workspace thumbnail in the workspace switcher can show its index and name (if defined in the system settings) or name of its most recently used app in a caption on mouse hover. '),
            _newComboBox(),
            //_newDropDown(),
            'showWsTmbLabels',
            [   [_('Disable'), 0],
                [_('Index'), 1],
                [_('Index + WS Name'), 2],
                [_('Index + App Name'), 3],
            ]
        )
    );

    optionList.push(
        _optionsItem(
            _('Hovering Over WS Thumbnail Switches Workspace'),
            _('Just hover the mouse pointer over a workspace thumbnail to switch to the workspace, no clicking needed.'),
            _newSwitch(),
            'wsTmbSwitchOnHover'
        )
    );

    optionList.push(
        _optionsItem(
            _('Show Wallpaper in Workspace Switcher Thumbnails'),
            _('Each workspace switcher thumbnail backround will show the current wallpaper (if not covered by windows).'),
            _newSwitch(),
            'showWsSwitcherBg'
        )
    );

    optionList.push(
        _optionsItem(
            _('Hot Corner'),
        )
    );

    optionList.push(
        _optionsItem(
            _('Fullscreen Hot Corner'),
            _('Allows hot corner in fullscreen mode.'),
            _newSwitch(),
            'fullscreenHotCorner'
        )
    );

    return optionList;
}

//-----------------------------------------------------
function _getDashOptionList() {
    const optionList = [];
    // options item format:
    // [text, tooltip, widget, settings-variable, options for combo]

    optionList.push(
        _optionsItem(
            _('Dash'),
        )
    );

    optionList.push(
        _optionsItem(
            _('Shift + Click Moves App To Current Workspace'),
            _('Clicking on app icon while holding down the Shift key will move all windows of the app to the current workspace.'),
            _newSwitch(),
            'dashShiftClickMovesAppToCurrentWs'
        )
    );

    optionList.push(
        _optionsItem(
            _('Hovering Over Icon Highlights App Windows'),
            'When hovering over an app icon, all app window previews will show their titles and the recently used window will be marked by the close button.',
            _newSwitch(),
            'dashHoverIconHighlitsWindows'
        )
    );

    optionList.push(
        _optionsItem(
            _('Scroll Switches App Windows Workspaces'),
            "Scrolling over an app icon will move the overview to the next workspace that contains the app window. If the previous option is enabled, the opacity of other app window previews will be reduced to highlight windows of the app.",
            _newSwitch(),
            'dashScrollSwitchesAppWindowsWs'
        )
    );

    const showWindowsBeforeBtn = _newSwitch();

    optionList.push(
        _optionsItem(
            _('Show Windows Before Activation'),
            'if the app you clicked on has more than one window and no [window / recently used window (depends on the following option)] is on the current workspace, the overview will move to the workspace with the target window and highlight app windows if hover highlighting is enabled. Next click activates the most recently used window on the workspace or you can choose another window, if any.',
            showWindowsBeforeBtn,
            'dashShowWindowsBeforeActivation'
        )
    );

    const preferMruWinBtn = _newSwitch();
    showWindowsBeforeBtn.connect('notify::active', () => preferMruWinBtn.set_sensitive(showWindowsBeforeBtn.get_active()));

    optionList.push(
        _optionsItem(
            _('Prefer Most Recently Used Window'),
            'Tweak of the the previous option - the globally most recently used window will take precedence over the most recently used window of the current workspace.',
            preferMruWinBtn,
            'dashClickFollowsRecentWindow'
        )
    );

    preferMruWinBtn.set_sensitive(gOptions.get('dashShowWindowsBeforeActivation'));

    //-----------------------------------------------------------------------------------

    optionList.push(
        _optionsItem(
            _('App Icon Menu Items'),
        )
    );

    optionList.push(
        _optionsItem(
            _('Force Quit'),
            'Adds item that allows you to kill (-9) the app if needed.',
            _newSwitch(),
            'appMenuForceQuit'
        )
    );

    optionList.push(
        _optionsItem(
            _('Move App to Current Workspace'),
            'Adds item that allows you to move all windows of the app to the current workspace.',
            _newSwitch(),
            'appMenuMoveAppToWs'
        )
    );

    optionList.push(
        _optionsItem(
            _('Close Windows on Current Workspace'),
            'Adds item that allows you to close all windows of the app on the current workspace. This item appears only if at least one window is available',
            _newSwitch(),
            'appMenuCloseWindowsOnCurrentWs'
        )
    );

    return optionList
}

//-----------------------------------------------------
function _getAppGridOptionList() {
    const optionList = [];
    // options item format:
    // [text, tooltip, widget, settings-variable, options for combo]

    optionList.push(
        _optionsItem(
            _('Sorting'),
        )
    );

    optionList.push(
        _optionsItem(
            _('Apps Order'),
            _('Choose sorting method for the app grid. Note that sorting by alphabet and usage ignores folders.'),
            _newComboBox(),
            //_newDropDown(),
            'appGridOrder',
            [   [_('Default'), 0],
                [_('Alphabetically'), 1],
                [_('By Usage'), 2],
            ]
        )
    );

    optionList.push(
        _optionsItem(
            _('Content'),
        )
    );

    optionList.push(
        _optionsItem(
            _('Include Dash Items'),
            'Include favorite / running apps currently present in the Dash. This option works only for Alphabetical and By Usage sorting modes, Default mode stays untouched.',
            _newSwitch(),
            'appGridIncludeDash'
        )
    );

    optionList.push(
        _optionsItem(
            _('Always Show Full App Names'),
            'Dont elipsize app names.',
            _newSwitch(),
            'appGridFullNames'
        )
    );

    return optionList;
}

function _getSearchOptionList() {
    const optionList = [];
    // options item format:
    // [text, tooltip, widget, settings-variable, options for combo]

    optionList.push(
        _optionsItem(
            _('Window Search Provider'),
        )
    );

    const wspSwitch = _newSwitch();
    optionList.push(
        _optionsItem(
            _('Enable Window Search Provider'),
            'Activates built-in window search provider to add open windows to the search results. You can search app names and window titles. You can also use "wq " prefix to suppress results from other search providers. Search supports fuzzy matches, more weight has exact match and then windows from current workspace.',
            wspSwitch,
            'searchWindowsEnable'
        )
    );

    const wspFuzzySwitch = _newSwitch();
    optionList.push(
        _optionsItem(
            _('Enable Fuzzy Match'),
            'Fuzzy match allows you to find "Firefox" even if you type "ffx". If fuzzy match disabled, you need enter exact patterns separated by a space, but in arbitrary order.',
            wspFuzzySwitch,
            'searchWindowsFuzzy'
        )
    );

    const wspSpaceSwitch = _newSwitch();
    optionList.push(
        _optionsItem(
            _('Space Activates Window Search'),
            'Pressing the Space bar in the Overview window picker pastes "wq: " prefix to the search entry to activate the search and suppress results from other search providers.',
            wspSpaceSwitch,
            'searchWindowsSpaceKey'
        )
    );

    const wspCommandSwitch = _newSwitch();
    optionList.push(
        _optionsItem(
            _('Enable Commands in Search Entry'),
            'You can use following commands separated by the space at the end of entered pattern:\n/x!   \t\t\t- close selected window\n/xa! \t\t\t- close all found windows\n/m[number] \t\t- (e.g. /m6) move selected window to workspace with given index\n/ma[number] \t- move all found windows to workspace with given index',
            wspCommandSwitch,
            'searchWindowsCommands'
        )
    );

    const wspShiftSwitch = _newSwitch();
    optionList.push(
        _optionsItem(
            _('Shift Moves Window to Current Workspace'),
            'Hold down the Shift key while activating the selected search result to move the window to the curent workspace.',
            wspShiftSwitch,
            'searchWindowsShiftMoves'
        )
    );

    const wspCtrlShiftSwitch = _newSwitch();
    //wspCtrlShiftSwitch.visible = false;
    optionList.push(
        _optionsItem(
            _('Ctrl+Shift Moves All Windows to Current Workspace'),
            'Hold down the Ctrl and Shift keys while activating the search result to move all found windows to the current workspace and activate the selected window.',
            wspCtrlShiftSwitch,
            'searchWindowsShiftMoves' // this is intentional, activation of one option activates the other
        )
    );

    const wspClickEmptySwitch = _newSwitch();
    optionList.push(
        _optionsItem(
            _('Secondary Click On Workspace Activates Window Search'),
            'Activate window search by right-clicking on an empty space on the workspace.',
            wspClickEmptySwitch,
            'searchWindowsClickEmptySpace'
        )
    );

    const _setOptionsSensitivity = () => {
        wspSpaceSwitch.sensitive = wspSwitch.active;
        wspCommandSwitch.sensitive = wspSwitch.active;
        wspShiftSwitch.sensitive = wspSwitch.active;
        wspCtrlShiftSwitch.sensitive = wspSwitch.active;
        wspClickEmptySwitch.sensitive = wspSwitch.active;
        wspFuzzySwitch.sensitive = wspSwitch.active;
    };
    _setOptionsSensitivity();
    wspSwitch.connect('notify::active', () => {
        _setOptionsSensitivity();
    });

    return optionList;
}

///////////////////////////////////////////////////
