# Edge Dock

A minimal auto-hiding dock for GNOME Shell 50/51.

It shows the stock GNOME dash (the same one you see in the overview, same icon
size and spacing) at the bottom of the primary monitor whenever the pointer
touches the bottom screen edge, and hides it again when the pointer leaves.
Nothing else: no settings, no effects, no polling — everything is event driven.

- Shows after the pointer rests on the bottom edge for 80 ms, hides 400 ms after it leaves
- Stays open while an app's context menu is open or an icon is being dragged
- Not shown over fullscreen windows or while the overview is open
- The "Show Apps" button opens the app grid

## Install

```sh
git clone https://github.com/koalmoik/edge-dock.git
ln -s "$PWD/edge-dock/extension" ~/.local/share/gnome-shell/extensions/edge-dock@koalmoik.github.io
```

Log out and back in (Wayland), then enable it:

```sh
gnome-extensions enable edge-dock@koalmoik.github.io
```

## Tweaks

The constants at the top of `extension/extension.js`:

| Constant | Default | Meaning |
|---|---|---|
| `SHOW_DELAY_MS` | 80 | dwell time at the edge before showing |
| `HIDE_DELAY_MS` | 400 | grace period after the pointer leaves |
| `ANIM_MS` | 180 | slide animation duration |
| `DASH_HEIGHT_RATIO` | 0.16 | max dock height as a fraction of the screen height (same as the overview); lower it for smaller icons |

## License

GPL-2.0-or-later
