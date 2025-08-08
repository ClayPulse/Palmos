import QRCodeStyling, { Options } from "qr-code-styling";

const config: Partial<Options> = {
  type: "canvas",
  shape: "square",
  width: 480,
  height: 480,
  data: undefined,
  margin: 0,
  qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
  imageOptions: {
    saveAsBlob: true,
    hideBackgroundDots: true,
    imageSize: 0.5,
    margin: 4,
  },
  dotsOptions: {
    type: "rounded",
    color: "#6a1a4c",
    roundSize: true,
    gradient: {
      type: "linear",
      rotation: 0.7853981633974483,
      colorStops: [
        { offset: 0, color: "#000000" },
        { offset: 1, color: "#e49c21" },
      ],
    },
  },
  backgroundOptions: { round: 0, color: "#ffffff", gradient: undefined },
  image: "/pulse_logo.svg",
  cornersSquareOptions: {
    type: "extra-rounded",
    color: "#7e5002",
    gradient: undefined,
  },
  cornersDotOptions: { type: undefined, color: "#000000", gradient: undefined },
};

export async function generateQR(url: string) {
  const qrData = {
    ...config,
    data: url,
  };
  const qrCode = new QRCodeStyling(qrData);

  const canvas = document.createElement("qr-canvas");

  qrCode.append(canvas);

  const img = await qrCode.getRawData("png");
  console.log("QR Code generated:", img);
  return img as Blob;
}
