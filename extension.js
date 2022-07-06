/**
 * OFP - Overview Feature Pack
 *
 * @author     GdH <G-dH@github.com>
 * @copyright  2022
 * @license    GPL-3.0
 */

'use strict';

const { GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const OverviewFeaturePack = Me.imports.overviewFeaturePack;

let enableTimeoutId = 0;

function init() {
    ExtensionUtils.initTranslations();
}

function enable() {
    enableTimeoutId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        700,
        () => {
            OverviewFeaturePack.activate();
            log(`${Me.metadata.name}: enabled`);
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
    log(`${Me.metadata.name}: disabled`);
}
