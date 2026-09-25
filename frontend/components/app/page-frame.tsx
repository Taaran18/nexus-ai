export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full scrollbar-thin overflow-y-auto">
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}
