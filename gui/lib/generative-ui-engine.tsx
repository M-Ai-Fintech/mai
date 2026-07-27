import React from "react";

import { Badge, type BadgeProps } from "@/components/Badge/Badge";
import { Button, type ButtonProps } from "@/components/Button/Button";
import { Card, type CardProps } from "@/components/Card/Card";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface SchemaNodeBase {
  id: string;
}

interface ContainerSchemaNode extends SchemaNodeBase {
  children?: ComponentSchemaNode[] | string;
}

interface CardSchemaNode extends ContainerSchemaNode {
  type: "Card";
  props?: Pick<CardProps, "variant" | "padding" | "className">;
}

interface ButtonSchemaNode extends ContainerSchemaNode {
  type: "Button";
  props?: Pick<ButtonProps, "variant" | "size" | "className" | "onClick">;
}

interface BadgeSchemaNode extends ContainerSchemaNode {
  type: "Badge";
  props?: Pick<BadgeProps, "variant" | "className">;
}

interface StatSchemaNode extends SchemaNodeBase {
  type: "Stat";
  props?: { label?: string; value?: string | number; subtext?: string };
}

interface GridSchemaNode extends ContainerSchemaNode {
  type: "Grid";
  props?: { cols?: 1 | 2 | 3 | 4; className?: string };
}

interface TextSchemaNode extends ContainerSchemaNode {
  type: "Text";
  props?: { className?: string };
}

export type ComponentSchemaNode =
  | CardSchemaNode
  | ButtonSchemaNode
  | BadgeSchemaNode
  | StatSchemaNode
  | GridSchemaNode
  | TextSchemaNode;

export interface GenerativeUISchema {
  title: string;
  description?: string;
  root: ComponentSchemaNode;
}

type Translator = (key: string) => string;

function renderChildren(
  node: ContainerSchemaNode,
  t: Translator,
): React.ReactNode {
  return Array.isArray(node.children)
    ? node.children.map((child) => renderGenerativeNode(child, t))
    : node.children;
}

function renderCard(node: CardSchemaNode, t: Translator): React.ReactNode {
  return (
    <Card key={node.id} {...node.props}>
      {renderChildren(node, t)}
    </Card>
  );
}

function renderButton(node: ButtonSchemaNode, t: Translator): React.ReactNode {
  const content = typeof node.children === "string"
    ? node.children
    : t("generativeUI.defaultAction");
  return (
    <Button key={node.id} {...node.props}>
      {content}
    </Button>
  );
}

function renderBadge(node: BadgeSchemaNode): React.ReactNode {
  const content = typeof node.children === "string" ? node.children : "Badge";
  return (
    <Badge key={node.id} className="mb-2" {...node.props}>
      {content}
    </Badge>
  );
}

function renderStat(node: StatSchemaNode, t: Translator): React.ReactNode {
  return (
    <div key={node.id} className="text-left py-2">
      <p className="text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
        {node.props?.label ?? t("generativeUI.defaultMetric")}
      </p>
      <p className="text-2xl font-bold text-ink-black tracking-tight">
        {node.props?.value ?? "0.00"}
      </p>
      {node.props?.subtext && (
        <p className="text-xs text-slate-gray mt-1">{node.props.subtext}</p>
      )}
    </div>
  );
}

const GRID_COLUMNS = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
} as const;

function renderGrid(node: GridSchemaNode, t: Translator): React.ReactNode {
  const columns = GRID_COLUMNS[node.props?.cols ?? 2];
  return (
    <div
      key={node.id}
      className={`grid grid-cols-1 ${columns} gap-4 ${
        node.props?.className ?? ""
      }`}
    >
      {renderChildren(node, t)}
    </div>
  );
}

function renderText(node: TextSchemaNode): React.ReactNode {
  return (
    <div
      key={node.id}
      className={node.props?.className ?? "text-sm text-ink-black mb-2"}
    >
      {typeof node.children === "string" ? node.children : ""}
    </div>
  );
}

/**
 * Renders one validated generative UI node.
 * Example: `renderGenerativeNode(schema.root, translate)`.
 */
export function renderGenerativeNode(
  node: ComponentSchemaNode,
  t: Translator,
): React.ReactNode {
  switch (node.type) {
    case "Card":
      return renderCard(node, t);
    case "Button":
      return renderButton(node, t);
    case "Badge":
      return renderBadge(node);
    case "Stat":
      return renderStat(node, t);
    case "Grid":
      return renderGrid(node, t);
    case "Text":
      return renderText(node);
  }
}

function EmptyGenerativeSchema({ message }: { message: string }) {
  return (
    <Card variant="raised" padding="md">
      <p className="text-sm text-slate-gray italic">{message}</p>
    </Card>
  );
}

export function GenerativeUIRenderer(
  { schema }: { schema: GenerativeUISchema },
) {
  const { t } = useTranslation();
  if (!schema?.root) {
    return <EmptyGenerativeSchema message={t("generativeUI.emptySchema")} />;
  }
  return (
    <div className="space-y-4 text-left">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-ink-black">{schema.title}</h3>
        {schema.description && (
          <p className="text-xs text-slate-gray mt-0.5">{schema.description}</p>
        )}
      </div>
      {renderGenerativeNode(schema.root, t)}
    </div>
  );
}
