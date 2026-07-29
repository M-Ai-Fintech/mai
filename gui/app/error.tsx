"use client";

/**
 * Provides a minimal recoverable error boundary without product styling.
 *
 * @example <ApplicationError error={error} reset={() => location.reload()} />
 */
export default function ApplicationError(
  { reset }: { error: Error & { digest?: string }; reset: () => void },
) {
  return (
    <main>
      <h1>The frontend foundation could not render this route.</h1>
      <p>No product action was completed.</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}
