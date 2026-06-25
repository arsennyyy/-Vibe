import { useCallback, useState } from "react";
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
import { getCroppedImageBlob } from "@/lib/cropImage";

type Props = {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
};

export default function AvatarCropDialog({ open, imageSrc, onClose, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea);
      onConfirm(blob);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#161616] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Обрезка аватара</DialogTitle>
        </DialogHeader>
        <div className="relative h-[280px] w-full rounded-xl overflow-hidden bg-[#0a0a0a]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
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
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !croppedArea}
            className="bg-[#8B5CF6] hover:bg-[#7c3aed] text-white"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
