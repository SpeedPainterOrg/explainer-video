# Advanced Review Mode

Use this workflow only when the user explicitly wants scene/image review or
precise storyboard control. It requires local image-generation capability and
these MCP tools:

- `prepare_explainer_asset_upload`
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

> Coherent full-scene editorial whiteboard cartoon on a pure white or
> transparent background; varied hand-drawn black ink, light crosshatching,
> marker fills in coral, deep blue, teal, green, and amber; expressive
> characters; clear arrows and motion marks; generous whitespace; one dominant
> concept; no watermark, logo, brand name, border, photorealism, gradient, or
> long baked-in headline.

Present each result in scene order:

1. `Scene number · time range · short title`
2. `Narration: one line`
3. `Status: ready | regenerating | failed`
4. the image

Ask the user to approve all scenes or identify exact scene numbers and repair
directions. This is a blocking creative gate. Preserve all unselected images.

## Upload

Create one UUID and reuse it as the project id and manifest id. For accepted
images, in waves of at most six:

1. Call `prepare_explainer_asset_upload` with stable ids such as `scene-01`.
2. PUT the corresponding local file using the exact returned method and
   headers. Never print or retain signed URLs.
3. Call `finalize_explainer_asset_upload` for successful uploads.

Retry only failed assets. Never upload the original document or notes.

## Manifest and render

Build schema version `1.0`, style `explainer-video-v1`, MiniMax narration,
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

Call `validate_explainer_manifest` and fix all validation errors. Then call
`render_explainer` and poll `get_explainer_task` according to the main skill.
A technical retry reuses the same project UUID and manifest. A creative
revision after a successful render uses a new project UUID.
