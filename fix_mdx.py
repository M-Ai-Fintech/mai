import os
import glob
import re

components_dir = "/home/luis/mai/gui/components/"
mdx_files = glob.glob(os.path.join(components_dir, "*/*.mdx"))

translations = {
    "Dropdown": "The **Dropdown** component implements configurable dynamic selectors with support for internal search, multiple choice via tags, and semantic validation states.",
    "CountrySelector": "The **CountrySelector** component allows toggling between the countries and currencies supported by the platform: **Brazil 🇧🇷 (BRL R$)**, **Spain 🇪🇸 (EUR €)** and **United States 🇺🇸 (USD $)**.",
    "Footer": "The **Footer** component provides navigation links, legal information, and social media icons in the standard M&Ai dark theme.",
    "Accordion": "The **Accordion** component allows users to expand and collapse sections of content, useful for FAQs or grouping detailed information.",
    "ErrorBoundary": "The **ErrorBoundary** component catches JavaScript errors anywhere in their child component tree, logs those errors, and displays a fallback UI.",
    "Icon": "The **Icon** component provides a standardized way to render SVG icons across the application, ensuring consistent sizing and coloring."
}

for mdx in mdx_files:
    basename = os.path.basename(mdx)
    comp_name = basename.replace(".mdx", "")
    
    with open(mdx, "r") as f:
        content = f.read()

    # 1. Update imports
    content = re.sub(r'import\s+{\s*Meta.*?}\s*from\s+["\']@storybook/addon-docs/blocks["\'];?', 
                     r'import { Meta, Primary, Controls, Story, Canvas } from "@storybook/blocks";', content)
    
    # 2. Add story import if missing
    story_import = f'import * as {comp_name}Stories from "./{comp_name}.stories";'
    if story_import not in content:
        # insert after the blocks import
        content = re.sub(r'(import {.*?storybook/blocks.*?;\n)', r'\1' + story_import + '\n', content)
        
        # if the blocks import wasn't matched (maybe already correct but missing story import)
        if story_import not in content:
             content = story_import + "\n" + content

    # 3. Replace <Meta title="..." /> with <Meta of={...Stories} />
    content = re.sub(r'<Meta\s+title=["\'][^"\']+["\']\s*/>', f'<Meta of={{{comp_name}Stories}} />', content)

    # 4. Insert <Primary /> before ## Props API if missing
    if "<Primary />" not in content and "## Props API" in content:
        content = content.replace("## Props API", "<Primary />\n\n## Props API")
    
    # 5. Translations for specific components
    if comp_name in translations:
        # Attempt to replace Portuguese overview texts
        if comp_name == "Dropdown":
            content = re.sub(r'O componente \*\*Dropdown\*\* implementa.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL)
        elif comp_name == "CountrySelector":
            content = re.sub(r'O componente \*\*CountrySelector\*\* permite alternar.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL)
        elif comp_name == "Footer":
            content = re.sub(r'O componente \*\*Footer\*\* fornece.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL|re.IGNORECASE)
            content = re.sub(r'Rodapé da aplicação.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL|re.IGNORECASE)
        elif comp_name == "Accordion":
            content = re.sub(r'O componente \*\*Accordion\*\* permite.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL|re.IGNORECASE)
        elif comp_name == "ErrorBoundary":
            content = re.sub(r'O componente \*\*ErrorBoundary\*\* captura.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL|re.IGNORECASE)
        elif comp_name == "Icon":
            content = re.sub(r'O componente \*\*Icon\*\* renderiza.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL|re.IGNORECASE)
            content = re.sub(r'O componente \*\*Icon\*\* fornece.*?(?=\n\n|\n---)', translations[comp_name], content, flags=re.DOTALL|re.IGNORECASE)

    with open(mdx, "w") as f:
        f.write(content)

print("Done fixing MDX files.")
