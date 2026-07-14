import React from "react";
import { Card } from "@/components/Card/Card";
import { Button } from "@/components/Button/Button";
import { Badge } from "@/components/Badge/Badge";

export interface ComponentSchemaNode {
  id: string;
  type: "Card" | "Button" | "Badge" | "Stat" | "Grid" | "Text";
  props?: Record<string, any>;
  children?: ComponentSchemaNode[] | string;
}

export interface GenerativeUISchema {
  title: string;
  description?: string;
  root: ComponentSchemaNode;
}

export function renderGenerativeNode(node: ComponentSchemaNode): React.ReactNode {
  if (!node) return null;

  switch (node.type) {
    case "Card":
      return (
        <Card
          key={node.id}
          variant={node.props?.variant || "default"}
          padding={node.props?.padding || "md"}
          className={node.props?.className || ""}
        >
          {Array.isArray(node.children)
            ? node.children.map(renderGenerativeNode)
            : node.children}
        </Card>
      );

    case "Button":
      return (
        <Button
          key={node.id}
          variant={node.props?.variant || "primary"}
          size={node.props?.size || "md"}
          onClick={node.props?.onClick}
          className={node.props?.className || ""}
        >
          {typeof node.children === "string" ? node.children : "Ação"}
        </Button>
      );

    case "Badge":
      return (
        <Badge
          key={node.id}
          variant={node.props?.variant || "default"}
          className={node.props?.className || "mb-2"}
        >
          {typeof node.children === "string" ? node.children : "Badge"}
        </Badge>
      );

    case "Stat":
      return (
        <div key={node.id} className="text-left py-2">
          <p className="text-xs font-bold text-slate-gray uppercase tracking-wider mb-1">
            {node.props?.label || "Métrica"}
          </p>
          <p className="text-2xl font-bold text-ink-black tracking-tight">
            {node.props?.value || "0.00"}
          </p>
          {node.props?.subtext && (
            <p className="text-xs text-slate-gray mt-1">{node.props.subtext}</p>
          )}
        </div>
      );

    case "Grid":
      return (
        <div
          key={node.id}
          className={`grid grid-cols-1 md:grid-cols-${
            node.props?.cols || 2
          } gap-4 ${node.props?.className || ""}`}
        >
          {Array.isArray(node.children)
            ? node.children.map(renderGenerativeNode)
            : node.children}
        </div>
      );

    case "Text":
      return (
        <div key={node.id} className={node.props?.className || "text-sm text-ink-black mb-2"}>
          {typeof node.children === "string" ? node.children : ""}
        </div>
      );

    default:
      return null;
  }
}

export function GenerativeUIRenderer({ schema }: { schema: GenerativeUISchema }) {
  if (!schema || !schema.root) {
    return (
      <Card variant="raised" padding="md">
        <p className="text-sm text-slate-gray italic">Nenhum esquema gerado disponível.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-ink-black">{schema.title}</h3>
        {schema.description && (
          <p className="text-xs text-slate-gray mt-0.5">{schema.description}</p>
        )}
      </div>

      {renderGenerativeNode(schema.root)}
    </div>
  );
}
