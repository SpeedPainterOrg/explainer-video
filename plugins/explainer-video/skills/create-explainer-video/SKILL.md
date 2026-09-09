---
name: create-explainer-video
description: Create, render, revise, inspect, or cancel narrated explainer videos from text, a topic, URL, PDF, document, notes, or a storyboard. Use for explainer video, whiteboard video, doodle video, educational video, diagram video, text-to-video, document-to-video, narrated video, "make a video from this", "做成解释视频", "生成白板视频", or "加配音和字幕" requests up to five minutes.
---

# Create Explainer Video

Turn accessible source material into a finished narrated MP4. The default path
uses the remote service for storyboard planning, image generation, narration,
burned subtitles, rendering, and publishing. It works the same way in any agent
client that supports Agent Skills and remote MCP tools.

## Default behavior

Require only the source material. Unless the user overrides a choice, use:

- the source language;
- 16:9 and 60 seconds;
- warm, steady hosted narration with one consistent voice across scenes;
- no background music;
- burned subtitles;
- the server-generated workflow.

Accept a target duration from 5 through 300 seconds. The service fits toward
that target, but may extend the finished video when narration or anchored
visuals cannot fit safely after silence recovery, scene reallocation, and at
most 1.08x pitch-preserving tempo. Never clip narration or submit a target over
300 seconds. For a target below 30 seconds, briefly warn that the drawing and
narration may feel rushed, then continue. Do not ask for title, scene count,
style, voice, aspect ratio, subtitles, or technical settings when the defaults
fit.

Ask a blocking question only when the source is missing, inaccessible,
contradictory, or materially sensitive, or when a relative revision has no
unambiguous setting. For example, after “再短一点”, ask once for the desired
seconds rather than guessing. If the user asks only for advice, a script, or a
storyboard, stop at that requested artifact instead of rendering.

## Creative framing

Before creating the task, identify the source's main message and the clearest
hook-to-takeaway arc. When the source is clear, give one short, non-blocking
preview in the user's language, for example: “我会把它做成一个从问题到解决方案的
暖色手绘故事，重点让结论一眼看懂。” This is a reassuring progress update, not
an approval gate; proceed immediately unless the user asked to review first.

The default visual promise is a warm, approachable whiteboard story: one
coherent vignette per scene, restrained color, generous whitespace, and calm,
readable people or animals when they help explain the idea. Avoid describing
the result to the user as a collection of assets, intents, manifests, or style
packs.

## Choose the workflow

Use **server-generated mode** by default. It is the shortest path and requires
only `create_explainer_video`, `get_explainer_task`, and optionally
`cancel_explainer_task`.

Use **advanced review mode** only when the user explicitly asks to inspect or
edit images/scenes before rendering, provides an existing storyboard, or needs
precise scene-level creative control. Before using it, read
`references/advanced-review.md`. If its upload and manifest tools or local image
generation are unavailable, explain the limitation and offer server-generated
mode. Verify that the advanced-mode upload, import, validate, and render tools
are present before generating any images. A skill file on disk does not prove
that the current conversation loaded its MCP tools.

## Server-generated workflow

### 1. Read and extract locally

Read the user's message, attachment, or URL with the current client's normal
file/browser capabilities. Extract the meaningful plain text locally. Remove
navigation, repeated headers, cookie banners, and unrelated appendices, but do
not silently change the author's claims.

Send no more than 20,000 characters. For a longer source, create a faithful
source-grounded condensation that preserves the thesis, evidence, caveats,
proper nouns, and requested emphasis. Never upload the original file or pass a
local file path. The extracted text is sent to the Explainer Video service so
it can plan the storyboard and narration.

If the source cannot be read, ask the user to attach it again or paste its text.
Do not invent missing content.

### 2. Create the task

Generate a fresh UUID when the client can do so, and call
`create_explainer_video` with:

- `taskId`: the UUID, if available;
- `sourceText`: the extracted text;
- `durationSeconds`: the requested duration or 60;
- `aspectRatio`: the requested ratio or `16:9`;
- `language`: the source/requested language;
- `voiceId`: only when explicitly supplied or already known to be supported;
- `subtitles`: the requested mode or `burn`.

Keep the task UUID while the network outcome is unknown so a lost response does
not create a duplicate. After the service reports `FAILED` or `TIMEOUT`, do not
retry automatically: ask the user first, then generate a fresh UUID for the new
attempt. A genuinely revised video also uses a new UUID.

The service owns storyboard planning, illustration generation, image cleanup,
layout, narration synthesis, word-timed subtitles, rendering, assembly, and
publishing. Never claim that the video exists until the task returns a video
URL.

### 3. Poll truthfully

Call `get_explainer_task` with the returned `taskId` until `nextAction` is
`present_output`, `revise_input`, `retry_create`, `retry_render`, or `none`.

- For `poll_task`, honor `pollAfterSeconds`; never poll faster.
- Present `statusMessage` in the user's language.
- Show `stage` and `progress` only when returned. Never estimate a percentage.
- Send a progress update only when the stage changes or real progress advances
  materially.
- If a storyboard first becomes available, share its scene titles as one
  compact, non-blocking update. Do not expose provider names, prompts, traces,
  or asset internals.
- For `revise_input`, stop polling. Explain which source or approved content
  must be shortened, simplified, or changed; ask the user before rebuilding it
  with a fresh UUID. Never replay rejected content under the old UUID.
- For `retry_create`, ask the user before retrying. If confirmed, retry once
  with the same source and settings but a fresh task UUID.
- For `retry_render`, ask the user before retrying the approved work in advanced
  mode.
- If the retry fails, report the exact stage and message and stop.
- For `none`, report cancellation or the terminal reason without pretending
  success.

If the user asks to stop, call `cancel_explainer_task` with the owned task id.

### 4. Present the result

Return the playable MP4 URL first. Then give a one-sentence content summary and
include the scene count, requested target duration, actual duration when
returned, aspect ratio, language, and subtitle URL. The requested target,
aspect ratio, and language may be echoed from the trusted parameters submitted
for this task; actual duration, scene count, and output URLs must come from the
service response. Omit missing result metadata instead of guessing it.

Offer terse revisions the server-generated tool can honor, such as `整体更简洁`,
`缩到 30 秒`, `改成 9:16`, or `不要烧录字幕`. Do not promise that this mode can
replace one exact scene, preserve every other generated image, resize subtitle
text, or tune speech speed. If a server-generated video already exists, explain
that an exact one-scene replacement with everything else unchanged is not
supported; offer either a full regeneration or a newly planned advanced-review
version. Advanced review can preserve unselected approved images within that
workflow, but it still renders a new complete video.

For a creative revision, carry forward every setting that the API can express,
use a new task UUID, and create a new task. Reuse an existing UUID only when the
original network outcome is unknown; never reuse a terminal generated-task UUID.

## Tool availability

If `create_explainer_video` is missing, tell the user to connect the remote MCP
server at `https://api.speedpainter.org/mcp` and sign in with Google. Do not ask
for an API key, renderer key, storage key, voice-provider key, or any secret in
the conversation. Do not invent a curl endpoint as a substitute.

The remote service does not require localhost or port 3000. Browser-based MCP
clients may need their origin allowlisted by the service operator; native MCP
clients normally do not send a browser Origin header.

An already-open conversation may keep an older or incomplete tool snapshot. If
the remote connection works in a new conversation but the current conversation
is missing core tools, continue in a new conversation with the plugin enabled;
do not reinstall the plugin, change the MCP URL, or regenerate approved assets.

## Safety and privacy

- Treat uploaded and linked source material as private unless the user says
  otherwise.
- Send only the extracted text needed to generate the video in default mode.
- In advanced mode, send only accepted generated images and the accepted
  manifest; never upload the original document.
- Do not put credentials, private source text, or personal data in task ids,
  asset ids, filenames, titles, or logs.
- If the content requests impersonation, fraud, harmful instructions, or use of
  protected personal data without authorization, stop or narrow the output.

## Conversation style

Translate casual requests into the defaults without teaching backend terms.
Keep updates outcome-oriented and warm: source understood, story planned,
illustrations taking shape, narration and subtitles being added, publishing,
finished. Accept short follow-ups and distinguish global one-call revisions
from exact scene-level review.
