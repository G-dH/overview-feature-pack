# Overview Feature Pack

A GNOME Shell extension that adds useful features to the Activities Overview. See screenshots with preferences window below.

Supported versions of GNOME Shell: 41, 42.


## Install from GitHub repository
The most recent version in the repository is the one I'm currently running on my own systems, problems may occure, but usually nothing serious.
Run following commands in the terminal (`git` needs to be installed, navigate to the directory you want to download the source):

    git clone https://github.com/G-dH/overview-feature-pack.git
    cd workspace-switcher-manager/overview-feature-pack@G-dH.github.com/
    make install


### Enabling the extension
After installation you need to enable the extension and access its settings.

- First restart GNOME Shell (`ALt` + `F2`, `r`, `Enter`, or Log Out/Log In if you use Wayland)
- Now you should see *Overview Feature Pack* extension in *Extensions* application (re-open the app if needed to load new data), where you can enable it and access its Preferences window by pressing `Settings` button.

![OFP configuration window](OFP1.png)
![OFP configuration window](OFP2.png)
![OFP configuration window](OFP3.png)
![OFP configuration window](OFP4.png)


## Buy me a coffee
If you like my extensions and want to keep me motivated, you can also buy me a coffee:
[buymeacoffee.com/georgdh](https://buymeacoffee.com/georgdh)

## Changelog

### v2 (not yet released)

**Added:**
- App Grid sorting and content options
- Option to always show full app names in the App Grid
- Highlight app windows on Dash icon hover now switches workspace automaticaly and adds options to highlight windows by showing their titles or this plus decreasing other windows opacity.
- Option to show workspace *index / index + workspace name / index + current app name* when mouse pointer hovers over a workspace thumbnail in the overview.
