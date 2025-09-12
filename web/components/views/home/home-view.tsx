export default function HomeView() {
  return (
    <div className="text-default-foreground flex h-full w-full flex-col items-center justify-center gap-y-1 pb-12">
      <h1 className="text-center text-2xl font-bold">
        Welcome to Pulse Editor!
      </h1>
      <p className="text-center text-lg font-normal">
        Start by opening a file or project.
      </p>
    </div>
  );
}
