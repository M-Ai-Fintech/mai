import type { Meta, StoryObj } from "@storybook/react";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "Components/Feedback/Toast",
  component: Toast,
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "error"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const SuccessNotification: Story = {
  args: {
    title: "Documento Assinado com Sucesso",
    message: "Term Sheet de Acquisition gravado no VDR fiduciário.",
    variant: "success",
  },
};

export const WarningNotification: Story = {
  args: {
    title: "Alerta de Insolvência Preditiva",
    message: "Modelo ONNX identificou indicador de risco moderado.",
    variant: "warning",
  },
};
