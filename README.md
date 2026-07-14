# SpeedPainter Plugins

Public Codex marketplace for SpeedPainter products.

## Explainer Video

Explainer Video turns text, URLs, or attached documents into narrated editorial
whiteboard videos of up to five minutes. Codex understands the source, writes
the storyboard, and generates scene illustrations. The hosted renderer handles
asset conversion, layout, timing, narration, burned subtitles, rendering, and
publishing.

Install the marketplace and plugin:

```bash
codex plugin marketplace add SpeedPainterOrg/explainer-video --ref main
codex plugin add explainer-video@speedpainter
```

Start a new Codex task after installation, then ask:

```text
Make an explainer video from this document.
```

The first use opens Google OAuth. Rendering is fully hosted; users do not need
an API key or local service.

## Data boundary

Original documents, URL bodies, and user notes remain in Codex. The hosted
service receives only Codex-generated scene illustrations and the approved
manifest containing narration, short titles, captions, and render settings.

- Website: https://www.speedpainter.org/en
- Privacy: https://www.speedpainter.org/en/privacy
- Terms: https://www.speedpainter.org/en/terms
- Support: https://www.speedpainter.org/en/contact

The plugin distribution files are source-available for installation. The
hosted rendering service and backend implementation are proprietary and are not
included in this repository.
