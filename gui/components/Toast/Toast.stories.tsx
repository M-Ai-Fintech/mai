import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
    title: "Document Successfully Signed",
    message: "Acquisition Term Sheet recorded in the fiduciary VDR.",
    variant: "success",
  },
};

export const WarningNotification: Story = {
  args: {
    title: "Predictive Insolvency Alert",
    message: "ONNX model identified a moderate risk indicator.",
    variant: "warning",
  },
};

export const ErrorNotification: Story = {
  args: {
    title: "Error",
    message: "Something went wrong.",
    variant: "error",
  },
};

export const InfoNotification: Story = {
  args: {
    title: "Info",
    message: "Just some info.",
  },
};
