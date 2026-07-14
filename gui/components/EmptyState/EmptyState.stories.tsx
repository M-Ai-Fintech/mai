import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "Components/Feedback/EmptyState",
  component: EmptyState,
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "Nenhuma Transação Encontrada",
    description: "Não existem deals cadastrados nesta fase do pipeline ou com os filtros selecionados.",
    actionLabel: "+ Criar Transação M&A",
    onAction: () => alert("Criar Deal"),
  },
};
