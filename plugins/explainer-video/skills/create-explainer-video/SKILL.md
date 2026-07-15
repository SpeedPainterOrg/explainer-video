---
name: create-explainer-video
description: Create, render, revise, or inspect narrated Explainer Videos. Use when a user asks to turn text, a topic, URL, PDF, document, notes, or an existing storyboard into an explainer video, whiteboard video, doodle video, educational video, diagram video, text-to-video result, or a narrated video up to five minutes; also trigger for short requests such as "make a video from this", "做成解释视频", "生成白板视频", or "加配音和字幕".
---

# Create Explainer Video

## Minimal-input contract

Require only the source material. Unless the user overrides a choice, use:

- the source language;
- 16:9, 60 seconds by default and no more than five minutes;
- one scene and one dominant illustration for roughly every 10 seconds;
- exactly six 10-second scenes and six illustrations for the 60-second default;
- editorial whiteboard visuals on a warm cream canvas;
- MiniMax narration, no background music, and burned subtitles.

Compute the default scene count as `ceil(targetDurationSeconds / 10)`, from one
through 30 scenes. Divide the exact requested duration across those scenes and
make the scene durations sum exactly to `targetDurationSeconds`. Prefer equal
slots; place any rounding remainder in the final scene. Preserve an explicitly
requested duration from 5 through 300 seconds. For a duration below 30 seconds,
briefly warn that the drawing rhythm may feel rushed, then continue.

Do not ask the user to choose a title, scene count, visual style, voice, aspect
ratio, subtitle mode, or technical setting when these defaults fit. Treat
"make a video from this" plus accessible source material as authorization to
prepare the complete video. Ask a blocking question only when the source is
missing, inaccessible, contradictory, or materially sensitive. If the user
asks only for advice or a draft, stop at that requested artifact.

Use review mode by default. If the user explicitly says `直接生成`, `不用审图`,
`skip review`, or an equivalent instruction, use fast mode and continue from
generated images to rendering without a creative approval pause. Never infer
fast mode from brevity alone.

## Workflow

### 1. Build the approved-time timeline

Read the supplied text, URL, or attachment inside Codex. Identify the main
claim, audience, language, aspect ratio, and exact target duration. Draft one
scene per computed time slot. Each scene needs:

- a stable scene id and short title;
- an exact `durationSeconds` value;
- final narration that fits naturally inside that slot;
- one dominant full-scene illustration concept;
- a short narration anchor copied verbatim from the narration.

For a 10-second slot, normally keep English narration near 18–22 words or
Chinese narration near 28–36 characters. Shorten the narration rather than
letting speech cross into the next scene.

Before generating images, show a compact timeline with these columns:

`Scene | Time | Narration/subtitle direction | Planned image`

Use real cumulative ranges such as `0:00–0:10`, `0:10–0:20`, and
`0:20–0:30`. Tell the user that each image remains on screen for its listed
interval while its narration produces word-timed burned subtitles. This is an
informative progress update, not the image approval gate.

In review mode, end the update with one short route reminder:
`默认先看分镜；你也可以说“直接生成”跳过审图。` In fast mode, use the
mutually exclusive confirmation: `你已选择直接生成；我会跳过审图并自动继续。`
Do not wait for a response here; start image generation immediately.

### 2. Generate illustrations concurrently

Generate independent scene illustrations concurrently in waves of at most six.
For the 60-second default, launch all six image-generation requests in the same
parallel tool-use wave. For longer videos, finish one wave before starting the
next. Retry only failed images; never regenerate successful scenes because one
request failed.

In review mode for videos longer than 60 seconds, first generate scenes 1–3 as
a style-calibration group and show them for approval. After approval, lock their
shared visual rules and generate the remaining scenes in chapters of at most
six. Review one chapter at a time instead of showing up to 30 images at once.
Fast mode skips the calibration pause but keeps the same shared visual lock and
six-image concurrency limit.

Every prompt must repeat the shared visual lock: coherent full-scene editorial
cartoon, varied black ink, light crosshatching, marker fills in coral, deep blue,
teal, green, and amber, expressive characters, arrows, motion marks, generous
white space, and a pure white or transparent background. Do not include a
watermark, logo, brand name, border, photorealism, gradient, or long baked-in
headline. The renderer owns scene titles.

### 3. Show storyboard cards and collect selective feedback

After a generation wave completes, display every image to the user in scene
order. Present each result as a compact storyboard card in this exact order:

`Scene number · time range · short title`

`Narration: one line`

`Status: ready | regenerating | failed`

`Image`

After the cards, provide one primary response and concise repair shortcuts:

`回复“全部通过并生成”，或“改 03：内容不符 / 风格不一致 / 构图不清楚 + 具体要求”。`

In review mode this is a blocking creative approval gate. Do not upload assets,
validate the manifest, or start rendering until the current chapter is
approved. If the user asks for changes, regenerate only the selected images,
show the revised cards, and ask for approval again. Preserve every unselected
image and all unaffected timeline decisions. In fast mode, show the completed
cards as progress evidence but continue without asking for approval.

### 4. Upload accepted assets

Create one UUID for the project and reuse it as the final manifest id. In review
mode, an asset is accepted after approval. In fast mode, generation completion
counts as acceptance. Process accepted assets concurrently in waves of at most
six:

1. Call `prepare_explainer_asset_upload` once per image in a parallel tool-use
   group, using stable ids such as `scene-01` through `scene-06`.
2. Upload the corresponding local files concurrently with the exact method and
   headers returned by each tool. Never print or retain signed URLs.
3. Call `finalize_explainer_asset_upload` for the successful uploads in a
   parallel tool-use group.

Retry only the failed asset. Do not upload the original document or notes.

### 5. Validate and render

Build an `ExplainerManifest` with schema version `1.0`, style
`explainer-video-v1`, and the approved exact duration. Set every scene's
`durationSeconds` to its displayed time slot; all scene durations must sum to
`targetDurationSeconds`. Set `voice.engine=minimax` by default and leave
`voiceId` null unless the user selected a supported voice. Set
`subtitles=burn`; the renderer also returns an SRT.

Never invent pixel coordinates, frame numbers, or overlapping animation
actions. Call `validate_explainer_manifest` and fix every validation error.
Call `render_explainer`, then use `get_explainer_task` until `nextAction` is
`present_output`, `retry_render`, or `none`.

Use the task response as the status source of truth:

- Show `statusMessage` in the user's language.
- Show `stage` and `progress` only when returned. Never estimate or invent a
  percentage when `progress` is absent.
- Honor `pollAfterSeconds`; do not poll faster.
- Send a progress update when `stage` changes or real progress advances
  materially. Do not repeat unchanged polling messages.
- Follow `nextAction`: continue polling for `poll_task`, return the artifacts
  for `present_output`, and retry the same manifest once for `retry_render`.
- A technical retry keeps the same project UUID and manifest. Do not regenerate
  or re-upload accepted assets; the backend reuses completed scene work and
  repeats only incomplete render work. If the retry fails again, preserve the
  exact stage and message and stop. A creative revision after a successful
  render still uses a new project UUID.

Return the playable MP4 path or URL first, followed by duration, the timeline
summary, and the subtitle path or URL. Then offer terse revision examples such
as `改第 3 幕`, `字幕放大`, `语速慢 10%`, or `改成 9:16`. If rendering fails,
surface the exact stage and message instead of claiming a video was created.

## Conversation behavior

- Translate casual user language into these defaults without teaching backend
  terms.
- Keep progress updates outcome-oriented: timeline ready, six images generating,
  images ready for review, compiling, rendering, adding narration and burned
  subtitles, publishing, finished.
- Accept terse revisions such as "改第 2 和第 5 张", "shorter", "change the
  voice", or "make it vertical". Preserve unaffected work.
- For a revision after rendering, use a new project UUID so idempotency does not
  confuse the revision with a retry.
- Skip the image review checkpoint only after an explicit fast-mode instruction.

## Responsibility and privacy boundary

- Codex owns source reading, summarization, timeline/storyboard writing,
  narration text, scene titles, image generation, image display, and creative
  approval.
- The Explainer Video backend owns image normalization/vectorization,
  deterministic layout, exact scene timing, voice synthesis, word-timed
  subtitles, parallel scene rendering, assembly, publishing, task state,
  cancellation, and idempotency.
- Never upload the original document, URL contents, user notes, or unrelated
  attachments. Upload only accepted generated images and the accepted manifest.
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
  "targetDurationSeconds": 10,
  "voice": {"engine": "minimax", "voiceId": null},
  "music": null,
  "subtitles": "burn",
  "scenes": [
    {
      "id": "s1",
      "title": "Short title",
      "narration": "Final narration that fits this exact slot.",
      "durationSeconds": 10,
      "layoutTemplate": "single_focus",
      "visuals": [
        {
          "id": "s1-main",
          "assetId": "scene-01",
          "role": "object",
          "importance": "primary",
          "preferredSide": "center",
          "narrationAnchor": "verbatim narration anchor"
        }
      ],
      "caption": null
    }
  ]
}
```

## Remote and local operation

- The published plugin connects to `https://api.speedpainter.org/mcp` with MCP
  OAuth and Google sign-in. It does not require localhost or port 3000.
- The remote service always publishes finished artifacts. A `FINISHED` response
  without a non-empty `videoUrl` is invalid.
- `.mcp.local.json` preserves the local stdio development server. Its renderer
  origin remains configurable and is independent of port 3000.
- Google, renderer, storage, voice, and billing credentials belong only on the
  backend. Never request that the user paste a secret into the conversation or
  put it in the manifest.
