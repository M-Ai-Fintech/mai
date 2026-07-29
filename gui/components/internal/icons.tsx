import type { SVGProps } from "react";

export type InternalIconName =
  | "alert"
  | "check"
  | "chevron-down"
  | "close"
  | "information"
  | "lock"
  | "minus"
  | "spinner"
  | "warning";

const paths: Record<InternalIconName, string> = {
  alert: "M12 9v4m0 4h.01M10.3 3.6 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.6a2 2 0 0 0-3.4 0Z",
  check: "m5 12 4 4L19 6",
  "chevron-down": "m6 9 6 6 6-6",
  close: "M6 6l12 12M18 6 6 18",
  information: "M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3m-10 0h10a2 2 0 0 1 2 2v7H5v-7a2 2 0 0 1 2-2Z",
  minus: "M5 12h14",
  spinner: "M12 2a10 10 0 0 1 10 10",
  warning: "M12 9v4m0 4h.01M12 2 2 20h20L12 2Z",
};

/**
 * Renders the small, decorative icon vocabulary required by MAI-97 components.
 *
 * @example <InternalIcon name="check" />
 */
export function InternalIcon({
  name,
  ...svgProps
}: { name: InternalIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      {...svgProps}
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
