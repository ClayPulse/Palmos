export default function Icon({
  name,
  variant,
}: {
  name?: string;
  variant?: "outlined" | "round" | "sharp" | "two-tone";
}) {
  if (!name) {
    throw new Error("Icon component requires a name.");
  }

  return (
    <span
      className={`material-icons${variant ? "-" + variant : ""}`}
      style={{
        verticalAlign: "middle",
        fontSize: "20px",
      }}
    >
      {name}
    </span>
  );
}
