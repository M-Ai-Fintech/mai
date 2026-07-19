import os
import glob
import re

components_dir = "/home/luis/mai/gui/components/"
mdx_files = glob.glob(os.path.join(components_dir, "*/*.mdx"))

for mdx in mdx_files:
    with open(mdx, "r") as f:
        content = f.read()

    # Change @storybook/blocks to @storybook/addon-docs/blocks
    content = content.replace('"@storybook/blocks"', '"@storybook/addon-docs/blocks"')
    
    with open(mdx, "w") as f:
        f.write(content)

print("Done fixing MDX imports.")
