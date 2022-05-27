// Workspace Switcher Manager
// GPL v3 ©G-dH@Github.com
'use strict';

const { GLib } = imports.gi;
const Main = imports.ui.main;
const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
const AltTab = imports.ui.altTab;
const WorkspaceThumbnail = imports.ui.workspaceThumbnail;
const WindowManager = imports.ui.windowManager;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;
const _Util = Me.imports.util;
const OverviewFeaturePack = Me.imports.overviewFeaturePack;

const shellVersion = Settings.shellVersion;

let gOptions;
let enableTimeoutId = 0;



function init() {
    ExtensionUtils.initTranslations();
}

function enable() {
    enableTimeoutId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        700,
        () => {
            //gOptions = new Settings.MscOptions();

            //gOptions.connect('changed', _updateSettings);

            OverviewFeaturePack.activate();
            enableTimeoutId = 0;
            return GLib.SOURCE_REMOVE;
        }
    );
}

function disable() {
    if (enableTimeoutId) {
        GLib.source_remove(enableTimeoutId);
        enableTimeoutId = 0;
    }

    OverviewFeaturePack.reset();
    if (gOptions) {
        gOptions.destroy();
        gOptions = null;
    }
}

//------------------------------------------------------------------------------
function _updateSettings(settings, key) {
    switch (key) {
    }
}

function debug(message) {
    const stack = new Error().stack.split('\n');

    // Remove debug() function call from stack.
    stack.shift();

    // Find the index of the extension directory (e.g. particles@schneegans.github.com) in
    // the stack entry. We do not want to print the entire absolute file path.
    const extensionRoot = stack[0].indexOf(Me.metadata.uuid);

    log('[' + stack[0].slice(extensionRoot) + '] ' + message);
}

