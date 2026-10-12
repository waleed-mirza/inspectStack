"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { MediaManifest, TemplateField } from "@inspectstack/domain";
import { Button, Input, Label, StatusStamp } from "@inspectstack/ui";
import type { PhotoAnnotation } from "./photo-annotate";

const PhotoAnnotate = dynamic(() => import("./photo-annotate").then((mod) => mod.PhotoAnnotate), {
  ssr: false,
});

export function PhotoField({
  field,
  required,
  disabled,
  media,
  urls,
  annotatingId,
  onPick,
  onRemove,
  onCaption,
  onAnnotate,
  onCloseAnnotate,
  onSaveAnnotate,
}: {
  field: TemplateField;
  required: boolean;
  disabled?: boolean;
  media: MediaManifest[];
  urls: Record<string, string>;
  annotatingId: string | null;
  onPick: (file: File) => void | Promise<void>;
  onRemove: (mediaId: string) => void;
  onCaption: (mediaId: string, caption: string) => void;
  onAnnotate: (mediaId: string) => void;
  onCloseAnnotate: () => void;
  onSaveAnnotate: (mediaId: string, annotation: PhotoAnnotation) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const max = field.photoMax ?? 8;
  const atMax = media.length >= max;
  const annotating = media.find((item) => item.mediaId === annotatingId);

  return (
    <div>
      <Label>
        {field.label}
        {required ? " *" : ""}
      </Label>
      {field.helpText ? <p className="mt-1 text-label text-muted">{field.helpText}</p> : null}
      <ul className="mt-2 space-y-3">
        {media.map((item) => (
          <li key={item.mediaId} className="surface p-2">
            {urls[item.mediaId] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[item.mediaId]}
                alt={item.caption || field.label}
                className="max-h-48 w-full object-contain"
              />
            ) : (
              <p className="text-label text-muted">Photo queued on this device.</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusStamp tone="queued">On this device</StatusStamp>
              {item.capturedAt ? (
                <span className="font-mono text-micro text-muted">{item.capturedAt}</span>
              ) : null}
            </div>
            {field.requireCaption || field.type === "photo_group" ? (
              <Input
                className="mt-2"
                placeholder="Caption"
                disabled={disabled}
                defaultValue={item.caption ?? ""}
                onBlur={(event) => onCaption(item.mediaId, event.target.value)}
              />
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {field.allowAnnotation ? (
                <Button type="button" disabled={disabled} onClick={() => onAnnotate(item.mediaId)}>
                  Annotate
                </Button>
              ) : null}
              <Button type="button" disabled={disabled} onClick={() => onRemove(item.mediaId)}>
                Remove
              </Button>
            </div>
            {annotating?.mediaId === item.mediaId && urls[item.mediaId] ? (
              <div className="mt-3">
                <PhotoAnnotate
                  src={urls[item.mediaId]!}
                  initial={
                    item.annotation && typeof item.annotation === "object"
                      ? (item.annotation as PhotoAnnotation)
                      : undefined
                  }
                  onCancel={onCloseAnnotate}
                  onSave={(annotation) => onSaveAnnotate(item.mediaId, annotation)}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || atMax}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          void Promise.resolve(onPick(file)).finally(() => setBusy(false));
        }}
      />
      <Button
        type="button"
        className="mt-2"
        disabled={disabled || atMax || busy}
        busy={busy}
        busyLabel="Adding photo…"
        onClick={() => inputRef.current?.click()}
      >
        Add photo
      </Button>
    </div>
  );
}
