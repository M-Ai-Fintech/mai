import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { classNames } from "../internal/classNames";
import styles from "./NavigationItem.module.css";

type CommonProps = { children: ReactNode; active?: boolean; count?: number; status?: ReactNode; restricted?: boolean; className?: string };
export type NavigationItemLinkProps = CommonProps & { kind: "link"; href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href">;
export type NavigationItemButtonProps = CommonProps & { kind: "button" } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;
export type NavigationItemProps = NavigationItemLinkProps | NavigationItemButtonProps;

/** A permission-safe navigation action. @example <NavigationItem kind="link" href="/reports">Reports</NavigationItem> */
export const NavigationItem = forwardRef<HTMLAnchorElement | HTMLButtonElement, NavigationItemProps>(function NavigationItem(props, ref) {
  const { active = false, children, className, count, restricted = false, status, ...elementProps } = props;
  const itemClassName = classNames(styles.item, active && styles.active, restricted && styles.restricted, className);
  const content = <><span>{children}</span>{count !== undefined && <span className={styles.count}>{count}</span>}{status && <span className={styles.status}>{status}</span>}{restricted && <span className={styles.restriction}>Restricted</span>}</>;
  if (restricted) return <span className={itemClassName} aria-disabled="true">{content}</span>;
  if (elementProps.kind === "link") {
    const { kind, ...linkProps } = elementProps;
    void kind;
    return <a ref={ref as Ref<HTMLAnchorElement>} className={itemClassName} aria-current={active ? "page" : undefined} {...linkProps}>{content}</a>;
  }
  const { kind, disabled, ...buttonProps } = elementProps;
  void kind;
  return <button ref={ref as Ref<HTMLButtonElement>} type="button" className={itemClassName} aria-current={active ? "page" : undefined} disabled={disabled} {...buttonProps}>{content}</button>;
});
