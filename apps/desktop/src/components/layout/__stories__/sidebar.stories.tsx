import type { Meta, StoryObj } from "@storybook/react";

// Sidebar uses Next.js routing hooks (usePathname) and Zustand stores,
// which are not available in the Storybook environment without the Next.js framework.
// We create a simplified static version for Storybook demonstration.

import {
  CheckSquare,
  Link2,
  Users,
  Bell,
  Settings,
  ActivityIcon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/workspace", icon: CheckSquare, label: "My Tasks" },
  { href: "/threads", icon: Link2, label: "Threads" },
  { href: "/teams", icon: Users, label: "Teams" },
  { href: "/activity", icon: ActivityIcon, label: "Activity" },
];

function SidebarPreview({ activePath = "/workspace", userName = "Demo User", workspaceName = "ito", unreadCount = 3 }: {
  activePath?: string;
  userName?: string;
  workspaceName?: string;
  unreadCount?: number;
}) {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
          糸
        </div>
        <span className="text-sm font-semibold truncate">{workspaceName}</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive = activePath === item.href;
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => e.preventDefault()}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}

        <div className="my-2 h-px bg-border" />

        <a
          href="/notifications"
          onClick={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/10 px-1 text-[10px] text-destructive">
              {unreadCount}
            </span>
          )}
        </a>

        <a
          href="/settings"
          onClick={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </a>
      </nav>

      <div className="border-t border-border p-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="flex-1 truncate text-sm">{userName}</span>
          <button className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

const meta: Meta<typeof SidebarPreview> = {
  title: "Layout/Sidebar",
  component: SidebarPreview,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    activePath: {
      control: "select",
      options: ["/workspace", "/threads", "/teams", "/activity"],
    },
    unreadCount: { control: "number" },
    userName: { control: "text" },
    workspaceName: { control: "text" },
  },
  decorators: [
    (Story) => (
      <div className="flex h-screen bg-background">
        <Story />
        <div className="flex-1 p-8">
          <p className="text-muted-foreground text-sm">Page content area</p>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarPreview>;

export const Default: Story = {
  args: {
    activePath: "/workspace",
    userName: "Demo User",
    workspaceName: "ito",
    unreadCount: 3,
  },
};

export const ThreadsActive: Story = {
  args: {
    activePath: "/threads",
    userName: "Demo User",
    workspaceName: "My Workspace",
    unreadCount: 0,
  },
};

export const NoNotifications: Story = {
  args: {
    activePath: "/workspace",
    userName: "Alice",
    workspaceName: "Acme Corp",
    unreadCount: 0,
  },
};
