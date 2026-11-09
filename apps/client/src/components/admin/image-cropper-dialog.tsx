import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Largest centered crop of the given aspect ratio (width / height) that fits the image. */
function initialCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(makeAspectCrop({ unit: "%", width: 100 }, aspect, width, height), width, height);
}

function cropToFile(img: HTMLImageElement, crop: PixelCrop, source: File): Promise<File> {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas unavailable"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);
  const type = ["image/jpeg", "image/png", "image/webp"].includes(source.type) ? source.type : "image/png";
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(new File([blob], source.name, { type })) : reject(new Error("crop failed"))), type, 0.92),
  );
}

/** Asks the admin to crop `file` to an exact aspect ratio before it is uploaded. */
export function ImageCropperDialog({ file, aspect, onCropped, onCancel }: {
  file: File | null;
  aspect: number;
  onCropped: (file: File) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [done, setDone] = useState<PixelCrop>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setSrc(""); return; }
    const url = URL.createObjectURL(file);
    setSrc(url); setCrop(undefined); setDone(undefined);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onLoad(e: SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(initialCrop(width, height, aspect));
    // Seed the pixel crop so "Crop" works even if the admin accepts the default selection.
    setDone(initialCropPx(width, height, aspect));
  }

  async function confirm() {
    if (!file || !imgRef.current || !done?.width || !done.height) return;
    setBusy(true);
    try { onCropped(await cropToFile(imgRef.current, done, file)); } finally { setBusy(false); }
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>قص الصورة</DialogTitle>
          <DialogDescription>حرّك إطار القص أو غيّر حجمه ليطابق المقاس المطلوب تمامًا.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center" dir="ltr">
          {src && (
            <ReactCrop crop={crop} aspect={aspect} keepSelection onChange={(_, pct) => setCrop(pct)} onComplete={(c) => setDone(c)}>
              <img ref={imgRef} src={src} alt="" onLoad={onLoad} className="block max-h-[60vh] w-auto max-w-full" />
            </ReactCrop>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" onClick={() => void confirm()} disabled={busy || !done}><CropIcon className="w-4 h-4 me-1.5" />قص ومتابعة الرفع</Button>
          <Button type="button" variant="outline" onClick={onCancel}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialCropPx(width: number, height: number, aspect: number): PixelCrop {
  const c = initialCrop(width, height, aspect);
  // initialCrop returns % units; convert to pixels of the displayed image.
  return { unit: "px", x: (c.x / 100) * width, y: (c.y / 100) * height, width: (c.width / 100) * width, height: (c.height / 100) * height };
}
