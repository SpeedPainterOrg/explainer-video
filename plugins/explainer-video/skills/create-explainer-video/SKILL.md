---
name: create-explainer-video
description: Create, render, revise, or inspect narrated Explainer Videos. Use when a user asks to turn text, a topic, URL, PDF, document, notes, or an existing storyboard into an explainer video, whiteboard video, doodle video, educational video, diagram video, text-to-video result, or a narrated video up to five minutes; also trigger for short requests such as "make a video from this", "做成解释视频", "生成白板视频", or "加配音和字幕".
---

# Create Explainer Video

## Minimal-input contract

Require only the source material. Unless the user overrides a choice, use:

- the source language;
- 16:9, 60 seconds by default and no more than five minutes;
- three scenes: hook, explanation, takeaway;
- three illustrations, adding a fourth only when it materially improves clarity;
- editorial whiteboard visuals on a warm cream canvas;
- MiniMax narration, no background music, and burned subtitles.

Do not ask the user to choose a title, scene count, visual style, voice, aspect
ratio, subtitle mode, or technical setting when these defaults are suitable.
When the user specifies a duration from 5 to 300 seconds, preserve that exact
value in `targetDurationSeconds`. For a requested duration below 30 seconds,
briefly warn that the result may feel rushed and have weaker drawing rhythm,
then continue without turning the warning into an approval gate.
Treat "make a video from this" plus accessible source material as authorization
to complete the full workflow. Ask a blocking question only when the source is
missing, inaccessible, contradictory, or materially sensitive. If the user asks
only for advice or a draft, stop at that requested artifact and do not render.

## Workflow

1. Read the supplied text, URL, or attachment inside Codex and identify the
   main claim, audience, output language, and aspect ratio. Default to 16:9 and
   a default duration of 60 seconds. Accept an explicitly requested duration
   from 5 to 300 seconds without rounding it to a preset.
2. Draft exactly three concise scenes by default: hook, explanation, and
   takeaway. Keep the final narration short enough to speak naturally within
   the target duration. Each scene needs:
   - a stable scene id;
   - optional short title;
   - final narration text;
   - one dominant editorial whiteboard illustration, with one optional support
     illustration across the whole video (three to four images total);
   - an optional short narration anchor copied verbatim from the narration.
3. Proceed directly with the best storyboard by default. Share it as a concise
   progress update, not an approval gate. Pause for approval only when the user
   explicitly asks to review first or when competing interpretations would
   materially change the message.
4. Generate the three to four illustrations with Codex image generation. Use a
   coherent full-scene editorial cartoon: varied black ink lines, light
   crosshatching, marker fills in coral, deep blue, teal, green, and amber,
   expressive characters, arrows, motion marks, and generous white space. The
   image background must be pure white or transparent so the renderer can place
   it on a warm cream canvas. Do not include a watermark, logo, brand name,
   border, photorealism, gradients, or a long baked-in headline; the renderer
   owns scene titles.
5. Create one UUID for the project and reuse it as the final manifest id. For
   every local image:
   - call `prepare_explainer_asset_upload` with the project UUID, a stable asset
     id, and the real MIME type;
   - upload the local file to the returned short-lived URL with the exact method
     and headers returned by the tool (for example, use `curl --fail --request
     PUT --header "Content-Type: image/png" --upload-file "$IMAGE_PATH"
     "$UPLOAD_URL"`); never print or retain the signed URL;
   - call `finalize_explainer_asset_upload` with the exact returned project id,
     asset id, and MIME type.
6. Build an `ExplainerManifest` with schema version `1.0`, style
   `explainer-video-v1`, and `targetDurationSeconds` no greater than 300.
   Use `voice.engine=minimax` by default; leave `voiceId` null unless the user
   selected a specific backend-supported voice. Set `subtitles=burn` so the
   captions are visible in every player; the renderer also returns an SRT.
   Never invent pixel
   coordinates, frame numbers, or overlapping animation actions; the renderer
   owns layout and timing.
7. Call `validate_explainer_manifest`. Fix every validation error before render.
8. Call `render_explainer`, then poll `get_explainer_task` until `FINISHED`,
   `FAILED`, or `CANCEL`.
9. Return the MP4 path or URL, subtitle path or URL, duration, and a compact
   scene summary. If the task fails, surface the renderer's exact stage and
   message instead of claiming a video was created.

## Conversation behavior

- Translate casual user language into the manifest defaults without making the
  user learn scene, asset, manifest, MCP, renderer, or voice-provider terms.
- Keep progress updates outcome-oriented: storyboard ready, illustrations
  ready, rendering, finished. Do not narrate internal tool calls.
- Accept terse revisions such as "shorter", "change the voice", "make it
  vertical", or "replace scene two". Preserve unaffected creative decisions.
- Use a new project UUID for every materially changed render so idempotency does
  not confuse a revision with a retry.
- End with the playable video URL first, followed by duration and one-sentence
  content summary. Mention subtitles separately only when an SRT URL exists.

## Responsibility and privacy boundary

- Codex owns source reading, summarization, storyboard writing, narration text,
  scene titles, and image generation.
- The Explainer Video backend owns image normalization/vectorization,
  deterministic layout and timing, voice synthesis, subtitles, rendering,
  publishing, task state, cancellation, and idempotency.
- Never upload the original document, URL contents, user notes, or unrelated
  attachments to the renderer. Only upload the generated scene images and the
  approved manifest, which necessarily contains the narration and short titles.
- Never put credentials or private source text in project ids, asset ids, image
  prompts, titles, captions, or logs.

## Manifest shape

```json
{
  "schemaVersion": "1.0",
  "id": "00000000-0000-4000-8000-000000000000",
  "title": "Video title",
  "language": "en",
  "aspectRatio": "16:9",
  "style": "explainer-video-v1",
  "targetDurationSeconds": 60,
  "voice": {"engine": "minimax", "voiceId": null},
  "music": null,
  "subtitles": "burn",
  "scenes": [
    {
      "id": "s1",
      "title": "Short title",
      "narration": "Final spoken narration.",
      "layoutTemplate": "auto",
      "visuals": [
        {
          "id": "s1-main",
          "assetId": "asset-name",
          "role": "object",
          "importance": "primary",
          "preferredSide": "auto",
          "narrationAnchor": "spoken narration"
        }
      ],
      "caption": null
    }
  ]
}
```

## Remote operation

- The published plugin connects to `https://api.speedpainter.org/mcp` with MCP
  OAuth and Google sign-in. Rendering is fully hosted.
- The remote service always publishes finished artifacts. A `FINISHED` response
  without a non-empty `videoUrl` is invalid.
- Google, renderer, storage, voice, and billing credentials belong only on the
  backend. Never request that the user paste a secret into the conversation or
  put it in the manifest.
