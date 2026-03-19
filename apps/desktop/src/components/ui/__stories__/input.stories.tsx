import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../input";
import { Search } from "lucide-react";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  argTypes: {
    type: {
      control: "select",
      options: ["text", "password", "email", "search", "date", "number"],
    },
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
  },
  args: {
    placeholder: "Enter text...",
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: "Hello, ito!" },
};

export const Password: Story = {
  args: { type: "password", placeholder: "Enter password..." },
};

export const Email: Story = {
  args: { type: "email", placeholder: "name@example.com" },
};

export const Date: Story = {
  args: { type: "date" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Disabled input" },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "Invalid value" },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-64 gap-1.5">
      <label htmlFor="task-title" className="text-sm font-medium text-foreground">
        Task title
      </label>
      <Input id="task-title" placeholder="Enter task title..." />
      <p className="text-xs text-muted-foreground">
        Give your task a descriptive name.
      </p>
    </div>
  ),
};
