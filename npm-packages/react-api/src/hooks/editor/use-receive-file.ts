import { useContext } from "react";
import { ReceiveFileContext } from "../../providers/receive-file-provider";

export default function useReceiveFile() {
  const context = useContext(ReceiveFileContext);

  if (!context) {
    throw new Error("useReceiveFile must be used within a ReceiveFileProvider");
  }

  return { receivedFileUri: context.selectedFileUri };
}
