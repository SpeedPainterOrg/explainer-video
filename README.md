<div align="center">

# Explainer Video

**Turn text, web pages, and documents into narrated hand-drawn videos.**

[Website](https://speedpainter.org) · [Demo](assets/explainer-video-demo.mp4) · [Privacy](https://speedpainter.org/en/privacy) · [Support](https://speedpainter.org/en/contact)

</div>

<p align="center">
  <strong>English</strong> ·
  <a href="docs/README.zh-CN.md">简体中文</a> ·
  <a href="docs/README.ja.md">日本語</a> ·
  <a href="docs/README.es.md">Español</a>
</p>

## See it in action

[![Hand-drawn Explainer Video demo](assets/explainer-video-demo-preview.gif)](assets/explainer-video-demo.mp4)

[Watch the full demo with narration and burned subtitles.](assets/explainer-video-demo.mp4)

## Install

### Claude Code

```bash
npx --yes github:SpeedPainterOrg/explainer-video
```

### Codex

```bash
codex plugin marketplace add SpeedPainterOrg/explainer-video --ref main
codex plugin add explainer-video@speedpainter
```

Start a new agent session after installing. The first time you create a video,
follow the prompt to sign in with Google.

## Make a video

```text
Turn this document into a 30-second explainer video.
```

You can provide text, a URL, or a document and choose the language, duration,
aspect ratio, voice, music, and subtitles. Sensible defaults are used when you
do not specify them.

## Privacy

- Your agent reads the original file locally; the file itself is not uploaded.
- Only the extracted content needed to create the video is sent to the service.
- You never need to provide an image, voice, storage, or renderer API key.

[Privacy Policy](https://speedpainter.org/en/privacy) · [Terms](https://speedpainter.org/en/terms) · [Support](https://speedpainter.org/en/contact) · [GitHub Issues](https://github.com/SpeedPainterOrg/explainer-video/issues)
