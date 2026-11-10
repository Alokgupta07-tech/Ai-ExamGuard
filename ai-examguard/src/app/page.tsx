export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-2xl space-y-8 text-center">
        <h1 className="text-5xl font-bold font-heading text-primary">
          AI ExamGuard
        </h1>
        <p className="text-xl text-muted-foreground">
          Next-generation AI-powered online examination integrity platform
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-2 text-lg font-semibold">Real-time Monitoring</h2>
            <p className="text-sm text-muted-foreground">
              In-browser face detection and audio analysis
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-2 text-lg font-semibold">Explainable AI</h2>
            <p className="text-sm text-muted-foreground">
              Transparent risk indicators and flagging
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
