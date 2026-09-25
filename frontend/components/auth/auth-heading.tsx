export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-fg text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="text-fg-2 mt-3 text-[15px]">{description}</p>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-danger/30 bg-danger-soft text-danger rounded-2xl border px-4 py-3 text-sm font-medium"
    >
      {message}
    </div>
  );
}
