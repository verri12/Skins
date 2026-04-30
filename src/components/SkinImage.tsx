import { useState } from "react";
import { withSize, STEAM_MIRROR_COUNT } from "../utils/image";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  size?: number;
}

/**
 * <img> que troca automaticamente entre mirrors do Steam CDN se um falhar
 * (ex: bloqueio de firewall/ORB no host akamai).
 */
export default function SkinImage({ src, size = 360, ...rest }: Props) {
  const [mirror, setMirror] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        {...(rest as any)}
        className={`${rest.className ?? ""} flex items-center justify-center text-zinc-600 text-xs`}
      >
        sem imagem
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={withSize(src, size, mirror)}
      referrerPolicy="no-referrer"
      onError={() => {
        if (mirror < STEAM_MIRROR_COUNT - 1) setMirror((m) => m + 1);
        else setFailed(true);
      }}
    />
  );
}
