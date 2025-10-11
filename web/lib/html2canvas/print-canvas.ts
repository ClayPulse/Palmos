import html2canvas from "html2canvas-pro";

export async function captureWorkflowCanvas(
  workflowCanvas: HTMLElement,
): Promise<HTMLCanvasElement> {
  // Capture all iframes within the workflow canvas
  const iframes = workflowCanvas.querySelectorAll("iframe");
  // Process each iframe to capture its content
  const iframeCaptures = await Promise.all(
    Array.from(iframes).map((iframe) => captureIframeCanvas(iframe)),
  );

  // Replace each iframe with its captured canvas then later restore the iframes
  iframes.forEach((iframe, index) => {
    const canvas = iframeCaptures[index];
    canvas.style.position = "absolute";
    canvas.style.top = `${iframe.offsetTop}px`;
    canvas.style.left = `${iframe.offsetLeft}px`;
    canvas.style.width = `${iframe.offsetWidth}px`;
    canvas.style.height = `${iframe.offsetHeight}px`;
    canvas.style.zIndex = "9999"; // Ensure the canvas is on top
    iframe.style.visibility = "hidden"; // Hide the iframe
    iframe.parentElement?.appendChild(canvas);
  });
  // Capture the entire workflow canvas with the iframes replaced by canvases
  const capture = await html2canvas(workflowCanvas);

  // Restore the original iframes and remove the temporary canvases
  iframes.forEach((iframe, index) => {
    const canvas = iframeCaptures[index];
    canvas.remove();
    iframe.style.visibility = "visible"; // Show the iframe again
  });

  return capture;
}

async function captureIframeCanvas(iframe: HTMLIFrameElement) {
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error("Unable to access iframe document", iframe);
    throw new Error("Unable to access iframe document");
  }
  // Render each iframe's content to a canvas
  const iframeCanvas = await html2canvas(iframeDoc.body);

  return iframeCanvas;
}
