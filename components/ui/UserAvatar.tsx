"use client";

import { useState } from "react";
import Image from "next/image";
import { FiUser } from "react-icons/fi";

export default function UserAvatar({
  src,
  name,
  size = 32
}: {
  src?: string | null;
  name?: string;
  size?: number;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-500"
      style={{ width: size, height: size }}
    >
      {showImage && src ? (
        <Image
          src={src}
          alt={name ? `Foto profil ${name}` : "Foto profil"}
          width={size}
          height={size}
          unoptimized
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span role="img" aria-label={name ? `Foto profil ${name} tidak tersedia` : "Foto profil tidak tersedia"}>
          {name?.trim().charAt(0).toUpperCase() || <FiUser size={Math.round(size / 2)} />}
        </span>
      )}
    </div>
  );
}
