import { generateQR } from "@/lib/share/qr-gen";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loading from "../interface/status-screens/loading";
import Icon from "./icon";

export default function QRDisplay({ url }: { url: string }) {
  const { resolvedTheme } = useTheme();

  const [image, setImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchQR() {
      const imgBlob = await generateQR(
        url,
        resolvedTheme === "dark" ? "dark" : "light",
      );
      const imgUrl = URL.createObjectURL(imgBlob);
      setImage(imgUrl);
    }
    fetchQR();
  }, []);

  return (
    <>
      {image ? <img src={image} alt="QR Code" /> : <Loading />}

      <Button
        color="primary"
        onPress={() => {
          if (!image) {
            toast.error("QR code is still loading, please wait.");
            return;
          }
          // Logic to download the QR code
          const link = document.createElement("a");
          link.href = image;
          link.download = "pulse-editor-sharing.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      >
        <Icon name="download" className="text-primary-foreground!" />
        Download
      </Button>
    </>
  );
}
