import type { StorybookConfig } from '@storybook/nextjs-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
    stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
        {
            name: '@storybook/addon-docs',
            options: {
                mdxPluginOptions: {
                    mdxCompileOptions: {
                        remarkPlugins: [remarkGfm],
                    },
                },
            },
        },
    ],
    framework: {
        name: '@storybook/nextjs-vite',
        options: {},
    },
    docs: {
        autodocs: 'tag',
    },
}

export default config
