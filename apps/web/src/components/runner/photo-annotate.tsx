"use client";

import { useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Layer, Line, Stage, Image as KonvaImage } from "react-konva";
import { Button } from "@inspectstack/ui";

export type AnnotationStroke = { points: number[]; color: string; width: number };

export type PhotoAnnotation = { strokes: AnnotationStroke[] };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function PhotoAnnotate({
  src,
  initial,
  onSave,
  onCancel,
}: {
  src: string;
  initial?: PhotoAnnotation;
  onSave: (annotation: PhotoAnnotation) => void | Promise<void>;
  onCancel: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(320);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>(initial?.strokes ?? []);
  const current = useRef<number[]>([]);
  const drawing = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadImage(src).then((loaded) => {
      if (!cancelled) setImage(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const height = image ? Math.round((width * image.height) / image.width) : 240;

  function pointer(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    return event.target.getStage()?.getPointerPosition() ?? null;
  }

  return (
    <div className="space-y-3">
      <div ref={wrapRef} className="overflow-hidden rounded-control border border-ink bg-ticket">
        <Stage
          width={width}
          height={height}
          onMouseDown={(event) => {
            drawing.current = true;
            const pos = pointer(event);
            if (!pos) return;
            current.current = [pos.x, pos.y];
            setStrokes((rows) => [
              ...rows,
              { points: current.current, color: "#c42b1c", width: 3 },
            ]);
          }}
          onMouseMove={(event) => {
            if (!drawing.current) return;
            const pos = pointer(event);
            if (!pos) return;
            current.current = current.current.concat([pos.x, pos.y]);
            setStrokes((rows) => {
              const next = [...rows];
              const last = next[next.length - 1];
              if (last) next[next.length - 1] = { ...last, points: current.current };
              return next;
            });
          }}
          onMouseUp={() => {
            drawing.current = false;
          }}
          onTouchStart={(event) => {
            drawing.current = true;
            const pos = pointer(event);
            if (!pos) return;
            current.current = [pos.x, pos.y];
            setStrokes((rows) => [
              ...rows,
              { points: current.current, color: "#c42b1c", width: 3 },
            ]);
          }}
          onTouchMove={(event) => {
            if (!drawing.current) return;
            const pos = pointer(event);
            if (!pos) return;
            current.current = current.current.concat([pos.x, pos.y]);
            setStrokes((rows) => {
              const next = [...rows];
              const last = next[next.length - 1];
              if (last) next[next.length - 1] = { ...last, points: current.current };
              return next;
            });
          }}
          onTouchEnd={() => {
            drawing.current = false;
          }}
        >
          <Layer>
            {image ? <KonvaImage image={image} width={width} height={height} /> : null}
            {strokes.map((stroke, index) => (
              <Line
                key={index}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                tension={0.3}
                lineCap="round"
                lineJoin="round"
              />
            ))}
          </Layer>
        </Stage>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => setStrokes((rows) => rows.slice(0, -1))}
          disabled={strokes.length === 0}
        >
          Undo
        </Button>
        <Button type="button" onClick={() => setStrokes([])} disabled={strokes.length === 0}>
          Clear marks
        </Button>
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          busy={busy}
          busyLabel="Saving…"
          onClick={() => {
            setBusy(true);
            void Promise.resolve(onSave({ strokes })).finally(() => setBusy(false));
          }}
        >
          Save marks
        </Button>
      </div>
    </div>
  );
}
