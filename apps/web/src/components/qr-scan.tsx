"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice } from "@inspectstack/ui";
import { normalizeQrToken, qrLaunchPath } from "@inspectstack/domain";

type DetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function detectorCtor(): DetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

export function QrScan() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSupported(Boolean(detectorCtor())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    const videoEl = videoRef.current;
    const Ctor = detectorCtor();
    if (!videoEl || !Ctor) return;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let stopped = false;
    const detector = new Ctor({ formats: ["qr_code"] });

    async function start(el: HTMLVideoElement) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        el.srcObject = stream;
        await el.play();
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(el);
            const raw = found[0]?.rawValue;
            if (raw) {
              const token = normalizeQrToken(raw);
              if (token) {
                stopped = true;
                router.push(qrLaunchPath(token));
                return;
              }
            }
          } catch {
            /* keep scanning */
          }
          timer = window.setTimeout(tick, 280);
        };
        timer = window.setTimeout(tick, 280);
      } catch {
        setError("Camera is not available. Type the code instead.");
        setActive(false);
      }
    }
    void start(videoEl);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, router]);

  if (!supported) {
    return (
      <p className="text-ui text-muted">
        This browser cannot scan from the camera. Type the code on the sticker.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {active ? (
        <video
          ref={videoRef}
          className="w-full max-w-sm rounded-control border border-ink bg-ink"
          playsInline
          muted
          aria-label="Camera preview for QR scan"
        />
      ) : null}
      <Button
        type="button"
        variant={active ? "secondary" : "primary"}
        onClick={() => {
          setError(null);
          setActive((value) => !value);
        }}
      >
        {active ? "Stop camera" : "Scan with camera"}
      </Button>
    </div>
  );
}
