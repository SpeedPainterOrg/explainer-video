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
- high-quality hosted narration;
- no background music;
- burned subtitles;
- the server-generated workflow.

Accept an exact duration from 5 through 300 seconds. For a duration below 30
seconds, briefly warn that the drawing and narration may feel rushed, then
continue. Never exceed five minutes. Do not ask for title, scene count, style,
voice, aspect ratio, subtitles, or technical settings when the defaults fit.

Ask a blocking question only when the source is missing, inaccessible,
contradictory, or materially sensitive. If the user asks only for advice, a
script, or a storyboard, stop at that requested artifact instead of rendering.

## Choose the workflow

Use **server-generated mode** by default. It is the shortest path and requires
only `create_explainer_video`, `get_explainer_task`, and optionally
`cancel_explainer_task`.

Use **advanced review mode** only when the user explicitly asks to inspect or
edit images/scenes before rendering, provides an existing storyboard, or needs
precise scene-level creative control. Before using it, read
`references/advanced-review.md`. If its upload and manifest tools or local image
generation are unavailable, explain the limitation and offer server-generated
mode.

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
- `music`: only when requested;
- `subtitles`: the requested mode or `burn`.

Keep the task UUID for technical retries. Do not create a new UUID merely
because a network response was lost. A genuinely revised video uses a new UUID.

The service owns storyboard planning, illustration generation, image cleanup,
layout, narration synthesis, word-timed subtitles, rendering, assembly, and
publishing. Never claim that the video exists until the task returns a video
URL.

### 3. Poll truthfully

Call `get_explainer_task` with the returned `taskId` until `nextAction` is
`present_output`, `retry_create`, `retry_render`, or `none`.

- For `poll_task`, honor `pollAfterSeconds`; never poll faster.
- Present `statusMessage` in the user's language.
- Show `stage` and `progress` only when returned. Never estimate a percentage.
- Send a progress update only when the stage changes or real progress advances
  materially.
- For `retry_create`, retry once with the same source, settings, and task UUID.
- For `retry_render`, retry once with the same approved manifest in advanced
  mode.
- If the retry fails, report the exact stage and message and stop.
- For `none`, report cancellation or the terminal reason without pretending
  success.

If the user asks to stop, call `cancel_explainer_task` with the owned task id.

### 4. Present the result

Return the playable MP4 URL first. Then include the requested duration, aspect
ratio, language, and subtitle URL when one is returned. Offer terse revision
examples such as `改第 3 幕`, `字幕放大`, `语速慢一点`, or `改成 9:16`.

For a creative revision, preserve unaffected decisions, use a new task UUID,
and create a new task. For a technical retry, reuse the existing UUID.

## Tool availability

If `create_explainer_video` is missing, tell the user to connect the remote MCP
server at `https://api.speedpainter.org/mcp` and sign in with Google. Do not ask
for an API key, renderer key, storage key, narration service key, or any secret in
the conversation. Do not invent a curl endpoint as a substitute.

The remote service does not require localhost or port 3000. Browser-based MCP
clients may need their origin allowlisted by the service operator; native MCP
clients normally do not send a browser Origin header.

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
Keep updates outcome-oriented: source ready, video queued, planning, generating
visuals, rendering, adding narration and subtitles, publishing, finished. Accept
short follow-ups and preserve unaffected work.
