"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export function InviteQrCode({ value }: { value: string }) {
  const [source, setSource] = useState<string>();
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, { color: { dark: "#07120e", light: "#ffffff" }, errorCorrectionLevel: "M", margin: 2, width: 320 })
      .then((url) => { if (active) setSource(url); });
    return () => { active = false; };
  }, [value]);
  return <div className="mt-5 grid min-h-64 place-items-center rounded-3xl bg-white p-4">
    {source ? <Image unoptimized src={source} width={256} height={256} alt="QR code pour rejoindre le match" className="size-64 max-w-full" /> : <span className="text-sm text-[#45524a]">Génération du QR code…</span>}
  </div>;
}
