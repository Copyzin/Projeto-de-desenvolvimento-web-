import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, ZoomIn } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useUpdateAvatar, useUpdateProfile } from "@/hooks/use-users";
import { getCroppedImg } from "@/lib/crop-image";
import { getDisplayName } from "@/lib/display-name";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfileEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileEditDialog({ open, onOpenChange }: ProfileEditDialogProps) {
  const { user } = useAuth();
  const updateAvatar = useUpdateAvatar();
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const clearImage = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  // Sempre que o dialogo abre, sincroniza o apelido e limpa qualquer edicao de foto.
  useEffect(() => {
    if (open) {
      setNickname(user?.nickname ?? "");
      clearImage();
    }
  }, [open, user?.nickname, clearImage]);

  // Revoga o object URL ao desmontar.
  useEffect(() => () => clearImage(), [clearImage]);

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const isSaving = updateAvatar.isPending || updateProfile.isPending;

  async function handleSave() {
    try {
      const trimmed = nickname.trim();
      const currentNickname = user?.nickname ?? "";
      if (trimmed !== currentNickname) {
        await updateProfile.mutateAsync(trimmed.length > 0 ? trimmed : null);
      }

      if (imageSrc && croppedAreaPixels) {
        const dataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
        await updateAvatar.mutateAsync(dataUrl);
      }

      clearImage();
      onOpenChange(false);
    } catch {
      // Os toasts das mutations ja informam o erro ao usuario.
    }
  }

  const initials = user ? getDisplayName(user).slice(0, 2).toUpperCase() : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label>Foto de perfil</Label>
            {imageSrc ? (
              <>
                <div className="relative h-64 w-full overflow-hidden rounded-lg bg-black/5">
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
                <div className="flex items-center gap-3 pt-1">
                  <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Slider
                    min={1}
                    max={3}
                    step={0.01}
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    aria-label="Zoom da foto"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Trocar imagem
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearImage}>
                    Remover imagem
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border">
                  <AvatarImage src={user?.avatarUrl || undefined} alt="Foto atual" />
                  <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Importar imagem
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelected}
            />
            <p className="text-xs text-muted-foreground">
              Arraste para posicionar e use o controle para dar zoom. Formatos: JPG, PNG, WEBP.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname-input">Apelido (nome de exibicao)</Label>
            <Input
              id="nickname-input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder={user?.name ?? "Como voce quer ser chamado"}
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              Seu nome real ({user?.name}) permanece fixo. Deixe em branco para usar o nome real.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar alteracoes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
