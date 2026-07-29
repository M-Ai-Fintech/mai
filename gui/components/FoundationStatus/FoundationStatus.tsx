const UNAVAILABLE_CAPABILITIES = [
  "Persisted approvals and immutable audit records",
  "Connector recovery and permission enforcement",
  "Agent execution and external communication",
  "Deterministic valuation engines",
  "Production document synchronization",
  "Backend-backed notifications and tasks",
] as const;

/**
 * States the MAI-95 implementation boundary without defining product visuals.
 *
 * @example <FoundationStatus />
 */
export function FoundationStatus() {
  return (
    <main data-foundation-status>
      <header>
        <p>Frontend foundation only</p>
        <h1>M&Ai product screens are not implemented.</h1>
        <p>
          This neutral scaffold does not provide production product
          capabilities.
        </p>
      </header>

      <section aria-labelledby="authority-heading">
        <h2 id="authority-heading">Implementation authority</h2>
        <p>
          Figma is the sole visual and interaction authority for future
          implementation. Product behavior and boundaries come from design/1–28,
          including the MAI-94 critical desktop banker path.
        </p>
      </section>

      <section aria-labelledby="capability-heading">
        <h2 id="capability-heading">Capabilities not available here</h2>
        <ul>
          {UNAVAILABLE_CAPABILITIES.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
        <p>
          Retained API clients and contracts are infrastructure only. A backend
          is required, and their presence does not prove production behavior.
        </p>
      </section>

      <section aria-labelledby="deferred-heading">
        <h2 id="deferred-heading">Governed next steps</h2>
        <p>
          MAI-96 owns tokens, MAI-97 owns components, and MAI-98 owns the
          approved Shell, navigation, and routes.
        </p>
      </section>
    </main>
  );
}
