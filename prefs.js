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

const shellVersion   = Settings.shellVersion;

// gettext
const _  = Settings._;

// libadwaita is available starting with GNOME Shell 42.
let Adw = null;
try { Adw = imports.gi.Adw; } catch (e) {}

let gOptions;
let itemFactory;
let pageList;


function _newImageFromIconName(name) {
    const args = [name];
    return Gtk.Image.new_from_icon_name(...args);
}

function init() {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
    gOptions = new Settings.Options();

    itemFactory = new ItemFactory(gOptions);

    pageList = [
        {
            name: 'general',
            title: _('General'),
            iconName: 'preferences-system-symbolic',
            optionList: _getGeneralOptionList()
        },
        {
            name: 'dash',
            title: _('Dash'),
            iconName: 'user-bookmarks-symbolic',
            optionList: _getDashOptionList()
        },
        {
            name: 'search',
            title: _('Search'),
            iconName: 'edit-find-symbolic',
            optionList: _getSearchOptionList()
        },
        {
            name: 'appgrid',
            title: _('App Grid'),
            iconName: 'view-app-grid-symbolic',
            optionList: _getAppGridOptionList()
        },
        {
            name: 'about',
            title: _('About'),
            iconName: 'preferences-system-details-symbolic',
            optionList: _getAboutOptionList()
        }
    ];
}

function fillPreferencesWindow(window) {
    return new AdwPrefs().getFilledWindow(window, pageList);
}

function buildPrefsWidget() {
    return new LegacyPrefs().getPrefsWidget(pageList);
}

//////////////////////////////////////////////////////////////////////

function _getGeneralOptionList() {
    const optionList = [];
    // options item format:
    // [text, tooltip, widget, settings-variable, options for combo]

    optionList.push(
        itemFactory.getRowWidget(
            _('Overview'),
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Shift Reorders Workspace'),
            _('Allows you to reorder the current workspace using Shift + Scroll or Shift + PageUP/PageDown keys.'),
            itemFactory.newSwitch(),
            'shiftReordersWs'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Ctrl + Space Activates Dash'),
            _('Pressing Ctrl + Space bar in the overview activates Dash. You can navigate between app icons using Tab, left/right arrow keys and activate the app using Space or Enter key.'),
            itemFactory.newSwitch(),
            'spaceActivatesDash'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Move Titles Into Windows'),
            _('Moves captions with window titles up into the window previews to make them more visible and associated with the window.'),
            itemFactory.newSwitch(),
            'moveTitlesIntoWindows'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Always Show Window Titles'),
            _('Window titles will always be visible, not only when you hover the mouse pointer over the window preview. Enable also previous option "Move Titles Into Windows" to make all titles visible.'),
            itemFactory.newSwitch(),
            'alwaysShowWindowTitles'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Hover Selects Window For Activation'),
            _('When active, window under the mouse pointer will be activated when leaving the Overview even without clicking. Press Super, place mouse pointer over a window, press Super again to activate it.'),
            itemFactory.newSwitch(),
            'hoverActivatesWindowOnLeave'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Show Workspace Label on Hover'),
            _('Each workspace thumbnail in the workspace switcher can show its index and name (if defined in the system settings) or name of its most recently used app in a caption on mouse hover. '),
            itemFactory.newComboBox(),
            //itemFactory.newDropDown(),
            'showWsTmbLabels',
            [   [_('Disable'), 0],
                [_('Index'), 1],
                [_('Index + WS Name'), 2],
                [_('Index + App Name'), 3],
            ]
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Hovering Over WS Thumbnail Switches Workspace'),
            _('Just hover the mouse pointer over a workspace thumbnail to switch to the workspace, no clicking needed.'),
            itemFactory.newSwitch(),
            'wsTmbSwitchOnHover'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Show Wallpaper in Workspace Switcher Thumbnails'),
            _('Each workspace switcher thumbnail backround will show the current wallpaper (if not covered by windows).'),
            itemFactory.newSwitch(),
            'showWsSwitcherBg'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Hot Corner'),
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Fullscreen Hot Corner'),
            _('Allows hot corner in fullscreen mode.'),
            itemFactory.newSwitch(),
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
        itemFactory.getRowWidget(
            _('Dash'),
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Shift + Click Moves App To Current Workspace'),
            _('Clicking on app icon while holding down the Shift key will move all windows of the app to the current workspace.'),
            itemFactory.newSwitch(),
            'dashShiftClickMovesAppToCurrentWs'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Hovering Over Icon Highlights App Windows'),
            _('When hovering mouse pointer over an app icon, overview will switch to the workspace with app window(s) (if needed), all app window previews will show their titles (enable option "Move Titles Into Windows" to see them all), the most recently used window will be marked by the close button and optionally the opacity of all other windows will be reduced. If option "Prefer Most Recently Used Window" is enabled, workspace will be switched to the one with the most recently used window of the app, even if there is another app window on the current workspace.'),
            itemFactory.newComboBox(),
            'dashHoverIconHighlitsWindows',
            [   [_('Disable'), 0],
                [_('Window Titles'), 1],
                [_('Titles + Opacity'), 2],
            ]
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Scroll Switches App Windows Workspaces'),
            _("Scrolling over an app icon will move the overview to the next workspace that contains the app window. If the previous option is enabled, the opacity of other app window previews will be reduced to highlight windows of the app."),
            itemFactory.newSwitch(),
            'dashScrollSwitchesAppWindowsWs'
        )
    );

    const showWindowsBeforeBtn = itemFactory.newSwitch();

    optionList.push(
        itemFactory.getRowWidget(
            _('Show Windows Before Activation'),
            _('if the app you clicked on has more than one window and no [window / recently used window (depends on the following option)] is on the current workspace, the overview will move to the workspace with the target window and highlight app windows if hover highlighting is enabled. Next click activates the most recently used window on the workspace or you can choose another window, if any.'),
            showWindowsBeforeBtn,
            'dashShowWindowsBeforeActivation'
        )
    );

    const preferMruWinBtn = itemFactory.newSwitch();
    showWindowsBeforeBtn.connect('notify::active', () => preferMruWinBtn.set_sensitive(showWindowsBeforeBtn.get_active()));

    optionList.push(
        itemFactory.getRowWidget(
            _('Prefer Most Recently Used Window'),
            _('Tweak of the the previous option - the globally most recently used window will take precedence over the most recently used window of the current workspace.'),
            preferMruWinBtn,
            'dashClickFollowsRecentWindow'
        )
    );

    preferMruWinBtn.set_sensitive(gOptions.get('dashShowWindowsBeforeActivation'));

    //-----------------------------------------------------------------------------------

    optionList.push(
        itemFactory.getRowWidget(
            _('App Icon Menu Items'),
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Force Quit'),
            _('Adds item that allows you to kill (-9) the app if needed.'),
            itemFactory.newSwitch(),
            'appMenuForceQuit'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Move App to Current Workspace'),
            _('Adds item that allows you to move all windows of the app to the current workspace.'),
            itemFactory.newSwitch(),
            'appMenuMoveAppToWs'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Close Windows on Current Workspace'),
            _('Adds item that allows you to close all windows of the app on the current workspace. This item appears only if at least one window is available'),
            itemFactory.newSwitch(),
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
        itemFactory.getRowWidget(
            _('Sorting'),
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Order By'),
            _('Choose the order of the app grid icons. The "Custom (Default)" option is default GNOME Shell\'s behavior that allows you to manually change the order of icons and create folders. Options "Alphabet" and "Usage" do not allow you to manage folders and ignore existing ones.'),
            itemFactory.newComboBox(),
            //itemFactory.newDropDown(),
            'appGridOrder',
            [   [_('Custom (Default)'), 0],
                [_('Alphabet'), 1],
                [_('Usage'), 2],
            ]
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Behavior'),
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Include Dash Items'),
            _('Include favorite / running apps currently present in the Dash in the app grid.'),
            itemFactory.newSwitch(),
            'appGridIncludeDash'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Allow Incomplete Pages'),
            _('If disabled, icons from the next page (if any) are automatically moved to fill any empty slot left after an icon was (re)moved (to a folder for exapmle).'),
            itemFactory.newSwitch(),
            //itemFactory.newDropDown(),
            'appGridIncompletePages'
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Appearance'),
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('App Names Behavior'),
            _('Choose how and when to display app names.'),
            itemFactory.newComboBox(),
            //itemFactory.newDropDown(),
            'appGridNamesMode',
            [   [_('Ellipsized - Expand Selected (Default)'), 0],
                [_('Allways Expanded'), 1],
                [_('Hidden - Show Selected Only'), 2],
            ]
        )
    );

    const fontSizeAdjustment = new Gtk.Adjustment({
        upper: 150,
        lower: 70,
        step_increment: 1,
        page_increment: 1,
    });

    const fontSizeScale = itemFactory.newScale(fontSizeAdjustment);
    fontSizeScale.add_mark(100, Gtk.PositionType.TOP, null);
    optionList.push(itemFactory.getRowWidget(
        _('App Names Font Size (%)'),
        _('Adjusts app names font size in percentage of the default size.'),
        fontSizeScale,
        'appGridFontSize'
    ));

    optionList.push(
        itemFactory.getRowWidget(
            _('Icon Size'),
            _('Allows to disable the default adaptive algorithm and set a fixed icon size.'),
            itemFactory.newComboBox(),
            //itemFactory.newDropDown(),
            'appGridIconSize',
            [   [_('Adaptive (Default)'), -1],
                [_('128'), 128],
                [_('112'), 112],
                [_('96'), 96],
                [_('80'), 80],
                [_('64'), 64],
                [_('48'), 48],
                [_('32'), 32],
            ]
        )
    );

    optionList.push(
        itemFactory.getRowWidget(
            _('Folder Icon Size'),
            _('Allows to disable the default adaptive algorithm and set a fixed size of icons inside folders.'),
            itemFactory.newComboBox(),
            //itemFactory.newDropDown(),
            'appGridFolderIconSize',
            [   [_('Adaptive (Default)'), -1],
                [_('128'), 128],
                [_('112'), 112],
                [_('96'), 96],
                [_('80'), 80],
                [_('64'), 64],
                [_('48'), 48],
                [_('32'), 32],
            ]
        )
    );

    const customGridSwitch = itemFactory.newSwitch();
    optionList.push(
        itemFactory.getRowWidget(
            _('Enable Custom Grid Size'),
            _('Apply following grid parameters.'),
            customGridSwitch,
            //itemFactory.newDropDown(),
            'appGridAllowCustom'
        )
    );

    const columnsAdjustment = new Gtk.Adjustment({
        upper: 15,
        lower: 2,
        step_increment: 1,
        page_increment: 1,
    });

    const columnsSpinBtn = itemFactory.newSpinButton(columnsAdjustment);
    optionList.push(itemFactory.getRowWidget(
        _('Columns per Page'),
        _('Number of columns in application grid.'),
        columnsSpinBtn,
        'appGridColumns'
    ));

    const rowsAdjustment = new Gtk.Adjustment({
        upper: 15,
        lower: 2,
        step_increment: 1,
        page_increment: 1,
    });

    const rowsSpinBtn = itemFactory.newSpinButton(rowsAdjustment);
    optionList.push(itemFactory.getRowWidget(
        _('Rows per Page'),
        _('Number of rows in application grid.'),
        rowsSpinBtn,
        'appGridRows'
    ));

    const folderColumnsAdjustment = new Gtk.Adjustment({
        upper: 8,
        lower: 2,
        step_increment: 1,
        page_increment: 1,
    });

    const folderColumnsSpinBtn = itemFactory.newSpinButton(folderColumnsAdjustment);
    optionList.push(itemFactory.getRowWidget(
        _('Folder Columns per Page'),
        _('Number of columns in folder grid.'),
        folderColumnsSpinBtn,
        'appGridFolderColumns'
    ));

    const folderRowsAdjustment = new Gtk.Adjustment({
        upper: 8,
        lower: 2,
        step_increment: 1,
        page_increment: 1,
    });

    const folderRowsSpinBtn = itemFactory.newSpinButton(folderRowsAdjustment);
    optionList.push(itemFactory.getRowWidget(
        _('Folder Rows per Page'),
        _('Number of rows in folder grid.'),
        folderRowsSpinBtn,
        'appGridFolderRows'
    ));

    const _setOptionsSensitivity = () => {
        columnsSpinBtn.sensitive = customGridSwitch.active;
        rowsSpinBtn.sensitive = customGridSwitch.active;
        folderColumnsSpinBtn.sensitive = customGridSwitch.active;
        folderRowsSpinBtn.sensitive = customGridSwitch.active;
    };
    _setOptionsSensitivity();
    customGridSwitch.connect('notify::active', () => {
        _setOptionsSensitivity();
    });


    optionList.push(
        itemFactory.getRowWidget(
            _('Reset'),
        )
    );

    optionList.push(itemFactory.getRowWidget(
        _('Reset App Grid Layout'),
        _('Removes all stored app grid icons positions, after the reset icons will be orderd alphabetically.'),
        itemFactory.newResetButton(() => {
            const settings = ExtensionUtils.getSettings('org.gnome.shell');
            settings.set_value('app-picker-layout', new GLib.Variant('aa{sv}', []));
        }),
    ));

    optionList.push(itemFactory.getRowWidget(
        _('Remove App Grid Folders'),
        _('Removes all folders and moves all app icons to the root grid.'),
        itemFactory.newResetButton(() => {
            const settings = ExtensionUtils.getSettings('org.gnome.desktop.app-folders');
            settings.set_strv('folder-children', []);
        }),
    ));

    return optionList;
}

function _getSearchOptionList() {
    const optionList = [];
    // options item format:
    // [text, tooltip, widget, settings-variable, options for combo]

    optionList.push(
        itemFactory.getRowWidget(
            _('Window Search Provider'),
        )
    );

    const wspSwitch = itemFactory.newSwitch();
    optionList.push(
        itemFactory.getRowWidget(
            _('Enable Window Search Provider'),
            _('Activates built-in window search provider to add open windows to the search results. You can search app names and window titles. You can also use "wq " prefix to suppress results from other search providers. Search supports fuzzy matches, more weight has exact match and then windows from current workspace.'),
            wspSwitch,
            'searchWindowsEnable'
        )
    );

    const wspSpaceSwitch = itemFactory.newSwitch();
    optionList.push(
        itemFactory.getRowWidget(
            _('Space Activates Window Search'),
            _('Pressing the Space bar in the Overview window picker pastes "wq: " prefix to the search entry to activate the search and suppress results from other search providers.'),
            wspSpaceSwitch,
            'searchWindowsSpaceKey'
        )
    );

    const wspClickAppsIconSwitch = itemFactory.newSwitch();
    optionList.push(
        itemFactory.getRowWidget(
            _('Secondary Click On Show Apps Icon Activates Window Search'),
            _("Activate window search by right-clicking on Dash's Show Apps Icon."),
            wspClickAppsIconSwitch,
            'searchWindowsClickAppsIcon'
        )
    );

    const wspFuzzySwitch = itemFactory.newSwitch();
    optionList.push(
        itemFactory.getRowWidget(
            _('Enable Fuzzy Match'),
            _('Fuzzy match allows you to find "Firefox" even if you type "ffx". If fuzzy match disabled, you need enter exact patterns separated by a space, but in arbitrary order.'),
            wspFuzzySwitch,
            'searchWindowsFuzzy'
        )
    );

    const wspCommandSwitch = itemFactory.newSwitch();
    optionList.push(
        itemFactory.getRowWidget(
            _('Enable Commands in Search Entry'),
            _('You can use following commands separated by the space at the end of entered pattern:\n/x!   \t\t\t- close selected window\n/xa! \t\t\t- close all found windows\n/m[number] \t\t- (e.g. /m6) move selected window to workspace with given index\n/ma[number] \t- move all found windows to workspace with given index'),
            wspCommandSwitch,
            'searchWindowsCommands'
        )
    );

    const wspShiftSwitch = itemFactory.newSwitch();
    optionList.push(
        itemFactory.getRowWidget(
            _('Shift Moves Window to Current Workspace'),
            _('Hold down the Shift key while activating the selected search result to move the window to the curent workspace.'),
            wspShiftSwitch,
            'searchWindowsShiftMoves'
        )
    );

    const wspCtrlShiftSwitch = itemFactory.newSwitch();
    //wspCtrlShiftSwitch.visible = false;
    optionList.push(
        itemFactory.getRowWidget(
            _('Ctrl+Shift Moves All Windows to Current Workspace'),
            _('Hold down the Ctrl and Shift keys while activating the search result to move all found windows to the current workspace and activate the selected window.'),
            wspCtrlShiftSwitch,
            'searchWindowsShiftMoves' // this is intentional, activation of one option activates the other
        )
    );

    const _setOptionsSensitivity = () => {
        wspSpaceSwitch.sensitive = wspSwitch.active;
        wspCommandSwitch.sensitive = wspSwitch.active;
        wspShiftSwitch.sensitive = wspSwitch.active;
        wspCtrlShiftSwitch.sensitive = wspSwitch.active;
        wspClickAppsIconSwitch.sensitive = wspSwitch.active;
        wspFuzzySwitch.sensitive = wspSwitch.active;
    };
    _setOptionsSensitivity();
    wspSwitch.connect('notify::active', () => {
        _setOptionsSensitivity();
    });

    return optionList;
}

function _getAboutOptionList() {
    const optionList = [];

    optionList.push(itemFactory.getRowWidget(
        Me.metadata.name
    ));

    optionList.push(itemFactory.getRowWidget(
        _('Version'),
        null,
        itemFactory.newLabel(Me.metadata.version.toString()),
    ));

    optionList.push(itemFactory.getRowWidget(
        _('Reset All Options'),
        _('Set all options to their default values.'),
        itemFactory.newResetButton(() => {
            this._settings.list_keys().forEach(
                key => settings.reset(key)
            );
        }),
    ));


    optionList.push(itemFactory.getRowWidget(
        _('Links')
    ));

    optionList.push(itemFactory.getRowWidget(
        _('Homepage'),
        _('Source code and more info about this extension'),
        itemFactory.newLinkButton('https://github.com/G-dH/overview-feature-pack'),
    ));

    optionList.push(itemFactory.getRowWidget(
        _('Gome Extensions'),
        _('Rate and comment the extension on GNOME Extensions site.'),
        itemFactory.newLinkButton('https://extensions.gnome.org/extension/5192'),
    ));

    optionList.push(itemFactory.getRowWidget(
        _('Report a bug or suggest new feature'),
        null,
        itemFactory.newLinkButton('https://github.com/G-dH/overview-feature-pack/issues'),
    ));

    optionList.push(itemFactory.getRowWidget(
        _('Buy Me a Coffee'),
        _('If you like this extension, you can help me with my coffee expenses.'),
        itemFactory.newLinkButton('https://buymeacoffee.com/georgdh'),
    ));

    return optionList;
}

//----------------------------------------------------------

const ItemFactory = class ItemFactory {
    constructor(options) {
        this._options = options;
        this._settings = this._options._gsettings;
    }

    getRowWidget(text, caption, widget, variable, options = []) {

        let item = [];
        let label;
        if (widget) {
            label = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 4,
                halign: Gtk.Align.START,
                valign: Gtk.Align.CENTER,
            });
            const option = new Gtk.Label({
                halign: Gtk.Align.START,
            });
            option.set_text(text);
            label.append(option);

            if (caption) {
                const captionLabel = new Gtk.Label({
                    halign: Gtk.Align.START,
                    wrap: true,
                    /*width_chars: 80,*/
                    xalign: 0
                })
                const context = captionLabel.get_style_context();
                context.add_class('dim-label');
                context.add_class('caption');
                captionLabel.set_text(caption);
                label.append(captionLabel);
            }
            label._title = text;
        } else {
            label = text;
        }
        item.push(label);
        item.push(widget);

        let key;

        if (variable && this._options.options[variable]) {
            const opt = this._options.options[variable];
            key = opt[1];
        }

        if (widget) {
            if (widget._is_switch) {
                this._connectSwitch(widget, key, variable);
            } else if (widget._is_spinbutton || widget._is_scale) {
                this._connectSpinButton(widget, key, variable);
            } else if (widget._is_combo_box) {
                this._connectComboBox(widget, key, variable, options);
            }
        }

        return item;
    }

    _connectSwitch(widget, key, variable) {
        this._settings.bind(key, widget, 'active', Gio.SettingsBindFlags.DEFAULT);
    }

    _connectSpinButton(widget, key, variable) {
        this._settings.bind(key, widget.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
    }

    _connectComboBox(widget, key, variable, options) {
        let model = widget.get_model();
        widget._comboMap = {};
        for (const [label, value] of options) {
            let iter;
            model.set(iter = model.append(), [0, 1], [label, value]);
            if (value === gOptions.get(variable)) {
                widget.set_active_iter(iter);
            }
            widget._comboMap[value] = iter;
        }
        gOptions.connect(`changed::${key}`, () => {
            widget.set_active_iter(widget._comboMap[gOptions.get(variable, true)]);
        });
        widget.connect('changed', () => {
            const [success, iter] = widget.get_active_iter();

            if (!success) return;

            gOptions.set(variable, model.get_value(iter, 1));
        });
    }

    newSwitch() {
        let sw = new Gtk.Switch({
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });
        sw._is_switch = true;
        return sw;
    }

    newSpinButton(adjustment) {
        let spinButton = new Gtk.SpinButton({
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false,
            xalign: 0.5,
        });
        spinButton.set_adjustment(adjustment);
        spinButton._is_spinbutton = true;
        return spinButton;
    }

    newComboBox() {
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
        comboBox._is_combo_box = true;
        return comboBox;
    }

    newScale(adjustment) {
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
        scale._is_scale = true;
        return scale;
    }

    newLabel(text = '') {
        const label = new Gtk.Label({
            label: text,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });
        label._activatable = false;
        return label;
    }

    newLinkButton(uri) {
        const linkBtn = new Gtk.LinkButton({
            label: shellVersion < 42 ? 'Click Me!' : '',
            uri,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });
        return linkBtn;
    }

    newResetButton(callback) {
        const btn = new Gtk.Button({
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            css_classes: ['destructive-action'],
            icon_name: 'view-refresh-symbolic'
        });

        btn.connect('clicked', callback);
        btn._activatable = false;
        return btn;
    }
}

const AdwPrefs = class {
    constructor() {
    }

    getFilledWindow(window, pages) {
        for (let page of pages) {
            const title = page.title;
            const icon_name = page.iconName;
            const optionList = page.optionList;

            window.add(
                this._getAdwPage(optionList, {
                    title,
                    icon_name
                })
            );
        }

        window.set_search_enabled(true);

        window.connect('close-request', () => {
            gOptions.destroy();
            gOptions = null;
            itemFactory = null;
            pageList = null;
        });

        window.set_default_size(800, 800);

        return window;
    }

    _getAdwPage(optionList, pageProperties = {}) {
        pageProperties.width_request = 840;
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
                    width_request: 700
                });
                continue;
            }

            const row = new Adw.ActionRow({
                title: option._title,
            });

            const grid = new Gtk.Grid({
                column_homogeneous: false,
                column_spacing: 20,
                margin_start: 8,
                margin_end: 8,
                margin_top: 8,
                margin_bottom: 8,
                hexpand: true,
            })
            /*for (let i of item) {
                box.append(i);*/
            grid.attach(option, 0, 0, 1, 1);
            if (widget) {
                grid.attach(widget, 1, 0, 1, 1);
            }
            row.set_child(grid);
            if (widget._activatable === false) {
                row.activatable = false;
            } else {
                row.activatable_widget = widget;
            }
            group.add(row);
        }
        page.add(group);
        return page;
    }
}

const LegacyPrefs = class {
    constructor() {
    }

    getPrefsWidget(pages) {
        const prefsWidget = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });
        const stack = new Gtk.Stack({
            hexpand: true
        });
        const stackSwitcher = new Gtk.StackSwitcher({
            halign: Gtk.Align.CENTER,
            hexpand: true
        });

        const context = stackSwitcher.get_style_context();
        context.add_class('caption');

        stackSwitcher.set_stack(stack);
        stack.set_transition_duration(300);
        stack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT_RIGHT);

        const pageProperties = {
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            vexpand: true,
            hexpand: true,
            visible: true
        };

        const pagesBtns = [];

        for (let page of pages) {
            const name = page.name;
            const title = page.title;
            const iconName = page.iconName;
            const optionList = page.optionList;

            stack.add_named(this._getLegacyPage(optionList, pageProperties), name);
            pagesBtns.push(
                [new Gtk.Label({ label: title}), _newImageFromIconName(iconName, Gtk.IconSize.BUTTON)]
            );
        }

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
        prefsWidget.connect('realize', (widget) => {
            const window = widget.get_root ? widget.get_root() : widget.get_toplevel();
            const width = 800;
            const height = 800;
            window.set_default_size(width, height);
            const headerbar = window.get_titlebar();
            headerbar.title_widget = stackSwitcher;

            const signal = Gtk.get_major_version() === 3 ? 'destroy' : 'close-request';
            window.connect(signal, () => {
                gOptions.destroy();
                gOptions = null;
            });
        });

        prefsWidget.show_all && prefsWidget.show_all();

        return prefsWidget;
    }

    _getLegacyPage(optionList, pageProperties) {
        const page = new Gtk.ScrolledWindow(pageProperties);
        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            homogeneous: false,
            margin_start: 30,
            margin_end: 30,
            margin_top: 12,
            margin_bottom: 12,
        });

        const context = page.get_style_context();
        context.add_class('background');

        let frame;
        let frameBox;
        for (let item of optionList) {
            // label can be plain text for Section Title
            // or GtkBox for Option
            const option = item[0];
            const widget = item[1];

            if (!widget) {
                const lbl = new Gtk.Label({
                    label: option,
                    xalign: 0,
                    margin_bottom: 4
                });

                const context = lbl.get_style_context();
                context.add_class('heading');

                mainBox.append(lbl);

                frame = new Gtk.Frame({
                    margin_bottom: 16
                });

                frameBox = new Gtk.ListBox({
                    selection_mode: null
                });

                mainBox.append(frame);
                frame.set_child(frameBox);
                continue;
            }

            const grid = new Gtk.Grid({
                column_homogeneous: false,
                column_spacing: 20,
                margin_start: 8,
                margin_end: 8,
                margin_top: 8,
                margin_bottom: 8,
                hexpand: true
            })

            grid.attach(option, 0, 0, 5, 1);

            if (widget) {
                grid.attach(widget, 5, 0, 2, 1);
            }
            frameBox.append(grid);
        }
        page.set_child(mainBox);

        return page;
    }
}
