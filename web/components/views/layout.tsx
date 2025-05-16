export default function ExtensionViewLayout({
  height = "100%",
  width = "100%",
  children,
}: {
  height?: string;
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative"
      style={{
        height,
        width,
      }}
    >
      <div className="absolute top-0 z-20 -mt-0.5 flex w-full justify-center">
        <div className="bg-default-500 h-1 w-8 cursor-pointer rounded-full"></div>
      </div>
      <div className="h-full w-full overflow-hidden rounded-lg">{children}</div>
    </div>
  );
}
