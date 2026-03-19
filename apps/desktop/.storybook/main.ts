import type { StorybookConfig } from "@storybook/react-webpack5";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-webpack5-compiler-swc",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  staticDirs: ["../public"],
  webpackFinal: async (config) => {
    // Resolve @ alias for imports like @/components/ui/button
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "../src"),
      };
    }

    // Replace Storybook's default CSS rule with one that includes PostCSS
    // so Tailwind CSS v4 processes properly
    if (config.module?.rules) {
      config.module.rules = config.module.rules.map((rule) => {
        if (
          rule &&
          typeof rule === "object" &&
          rule.test instanceof RegExp &&
          rule.test.test("test.css")
        ) {
          return {
            test: /\.css$/,
            use: [
              "style-loader",
              {
                loader: "css-loader",
                options: { importLoaders: 1 },
              },
              {
                loader: "postcss-loader",
                options: {
                  postcssOptions: {
                    plugins: {
                      "@tailwindcss/postcss": {},
                    },
                  },
                },
              },
            ],
          };
        }
        return rule;
      });
    }

    return config;
  },
};

export default config;
