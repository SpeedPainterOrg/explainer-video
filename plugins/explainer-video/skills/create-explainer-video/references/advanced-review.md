# Advanced Review Mode

Use this workflow only when the user explicitly wants scene/image review or
precise storyboard control. It requires local image-generation capability and
these MCP tools:

- `prepare_explainer_asset_upload`
- `import_explainer_assets` and `get_explainer_asset_import` (batch import;
  when both are missing on an older server, `finalize_explainer_asset_upload`
  per asset is the fallback)
- `finalize_explainer_asset_upload`
- `validate_explainer_manifest`
- `render_explainer`
- `get_explainer_task`
- `cancel_explainer_task`

## Timeline

Compute the scene count as `ceil(targetDurationSeconds / 10)`, from one through
30. Divide the requested duration across the scenes and make their exact
durations sum to the target. Prefer equal slots and place rounding remainder in
the final scene.

For every scene, prepare a stable id, short title, final narration, exact
duration, one dominant illustration concept, and a verbatim narration anchor.
For a 10-second slot, normally use about 18–22 English words or 28–36 Chinese
characters. Shorten narration rather than letting speech cross scene slots.

Show a compact table before image generation:

`Scene | Time | Narration/subtitle direction | Planned image`

Use real cumulative ranges. This update does not replace the image approval
gate.

## Illustrations and review

Generate independent scene illustrations concurrently in waves of at most six.
For videos longer than 60 seconds, generate scenes 1–3 first as a style
calibration group, then continue in chapters after approval. Retry only failed
or explicitly selected images.

Every prompt repeats this visual lock:

> Warm, approachable full-scene editorial whiteboard story vignette on a pure
> white or transparent background; varied dark charcoal ink, gentle rounded
> forms, sparse light crosshatching, mostly uncolored line art, and restrained
> muted coral, warm amber, and deep blue marker accents; calm readable
> expressions and natural gestures; clear separation between subjects and
> generous whitespace; one dominant action or relationship; no watermark,
> logo, brand name, border, photorealism, gradient, decorative clutter, or long
> baked-in headline.

Present each result in scene order:

1. `Scene number · time range · short title`
2. `Narration: one line`
3. `Status: ready | regenerating | failed`
4. the image

Ask the user to approve all scenes or identify exact scene numbers and repair
directions. This is a blocking creative gate. Preserve all unselected images
within the current advanced-review workflow, but make clear that any approved
revision produces a newly rendered complete video. Do not present this workflow
as an in-place editor for an earlier server-generated video.

## Upload

Create one UUID and reuse it as the project id and manifest id. For accepted
images:

1. In waves of at most six, call `prepare_explainer_asset_upload` with stable
   ids such as `scene-01`, then PUT each local file using the exact returned
   method and headers. Never print or retain signed URLs.
2. After every file is uploaded, call `import_explainer_assets` once with the
   full asset list (at most 30 per call). This queues one server-side import
   and needs at most one client confirmation for the whole set.
3. Poll `get_explainer_asset_import` with the returned importId until status is
   `FINISHED`, then check every per-asset status.

Retry only assets that are not `imported`: re-upload only when the service says
the staged upload is missing or expired, then call `import_explainer_assets`
again listing just those assets. Replaying an identical list resumes a running
or fully imported batch, while a batch that finished with failures re-runs with
fresh URLs. Never upload the original document or notes.

If `import_explainer_assets` or `get_explainer_asset_import` is missing from
the tool list (an older server), fall back to calling
`finalize_explainer_asset_upload` per uploaded asset with the exact projectId,
assetId, and mimeType.

`prepare_explainer_asset_upload` and `get_explainer_asset_import` are
read-only. `import_explainer_assets` and `finalize_explainer_asset_upload` are
non-destructive, idempotent writes to the authenticated user's project and may
require client confirmation. If the client reports that the user cancelled a
tool call, do not report an asset or service failure because the request may
not have reached the server. Ask for confirmation and retry the same call with
identical arguments.

## Manifest and render

Build schema version `1.0`, style `explainer-video-v1`, hosted narration,
burned subtitles, and exact scene durations. Never invent pixel coordinates,
frame numbers, or overlapping animation actions.

```json
{
  "schemaVersion": "1.0",
  "id": "00000000-0000-4000-8000-000000000000",
  "title": "Video title",
  "language": "en",
  "aspectRatio": "16:9",
  "style": "explainer-video-v1",
  "targetDurationSeconds": 10,
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

Call `validate_explainer_manifest` and fix all validation errors. Then call
`render_explainer` and poll `get_explainer_task` according to the main skill.
If the network outcome is unknown, retry the exact same manifest with the same
project UUID. The render call is idempotent for that tuple and resumes the
existing task instead of enqueueing a duplicate. Never change the manifest
while reusing the id; changed inputs require a new UUID. After a terminal
failure the task result carries `retryTaskIdPolicy: "new"`: replaying the old
id only returns the same failed task, so a confirmed retry uses a new project
UUID and re-uploads and re-imports the accepted images under it. A creative
revision after a successful render also uses a new project UUID. The manifest
id must itself be a UUID — validate rejects other formats before any upload
effort is wasted.
