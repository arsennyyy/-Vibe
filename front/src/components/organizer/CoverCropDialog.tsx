import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  formatEventCoverRecommendation,
  getCroppedImageBlob,
  getEventCoverAspect,
} from "@/lib/cropImage";

type Props = {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
};

export default function CoverCropDialog({ open, imageSrc, onClose, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(() => getEventCoverAspect());
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const syncAspect = useCallback(() => {
    setAspect(getEventCoverAspect());
  }, []);

  useEffect(() => {
    if (!open) return;
    syncAspect();
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    window.addEventListener("resize", syncAspect);
    return () => window.removeEventListener("resize", syncAspect);
  }, [open, imageSrc, syncAspect]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea, { maxWidth: 1920 });
      onConfirm(blob);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#161616] border-white/10 text-white max-w-4xl w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-display">Кадрирование обложки</DialogTitle>
          <p className="text-sm text-white/45 pt-1">
            Рамка совпадает с hero на странице мероприятия — на весь экран под меню (
            <code className="text-[#a78bfa]">100dvh − 5rem</code>). Рекомендуем{" "}
            {formatEventCoverRecommendation()}.
          </p>
        </DialogHeader>
        <div className="relative h-[min(62vh,520px)] w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="space-y-2 px-1">
          <p className="text-xs text-white/45">Масштаб</p>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            className="w-full"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10">
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !croppedArea}
            className="bg-[#8B5CF6] hover:bg-[#7c3aed] text-white"
          >
            {saving ? "Применение…" : "Применить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
