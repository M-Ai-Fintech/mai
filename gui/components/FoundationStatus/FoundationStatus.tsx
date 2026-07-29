import styles from "./FoundationStatus.module.css";

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
    <main className={styles.shell} data-foundation-status>
      <div className={styles.surface} tabIndex={-1}>
        <header>
          <p className={styles.eyebrow}>Frontend foundation only</p>
          <h1 className={styles.title}>
            M&Ai product screens are not implemented.
          </h1>
          <p className={styles.body}>
            This neutral scaffold does not provide production product
            capabilities.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="authority-heading">
          <h2 className={styles.heading} id="authority-heading">
            Implementation authority
          </h2>
          <p className={styles.body}>
            Figma is the sole visual and interaction authority for future
            implementation. Product behavior and boundaries come from
            design/1–28, including the MAI-94 critical desktop banker path.
          </p>
        </section>

        <section
          className={styles.section}
          aria-labelledby="capability-heading"
        >
          <h2 className={styles.heading} id="capability-heading">
            Capabilities not available here
          </h2>
          <ul className={styles.list}>
            {UNAVAILABLE_CAPABILITIES.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
          <p className={styles.body}>
            Retained API clients and contracts are infrastructure only. A
            backend is required, and their presence does not prove production
            behavior.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="deferred-heading">
          <h2 className={styles.heading} id="deferred-heading">
            Governed next steps
          </h2>
          <p className={styles.body}>
            MAI-96 owns tokens, MAI-97 owns components, and MAI-98 owns the
            approved Shell, navigation, and routes.
          </p>
        </section>
      </div>
    </main>
  );
}
