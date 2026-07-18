import os

def update_file(path, translations):
    with open(path, 'r') as f:
        content = f.read()
    
    for pt, en in translations:
        content = content.replace(pt, en)
        
    with open(path, 'w') as f:
        f.write(content)

# Card translations
update_file('/home/luis/mai/gui/components/Card/Card.stories.tsx', [
    ('Ação de Compliance Requerida', 'Compliance Action Required'),
    ('Pendência de validação de documentos KYB', 'Pending KYB document validation'),
])

# Tabs translations
update_file('/home/luis/mai/gui/components/Tabs/Tabs.stories.tsx', [
    ('Visão Geral', 'Overview'),
    ('Documentos', 'Documents'),
    ('Métricas', 'Metrics'),
    ('Configurações', 'Settings'),
])

# Modal translations
update_file('/home/luis/mai/gui/components/Modal/Modal.tsx', [
    ('Fechar modal', 'Close modal'),
    ('Fechar', 'Close'),
])
update_file('/home/luis/mai/gui/components/Modal/Modal.stories.tsx', [
    ('Confirmar Ação', 'Confirm Action'),
    ('Tem certeza que deseja aprovar este documento?', 'Are you sure you want to approve this document?'),
    ('Aprovar', 'Approve'),
    ('Cancelar', 'Cancel'),
])

# Table translations
update_file('/home/luis/mai/gui/components/Table/Table.tsx', [
    ('Exibir', 'Show'),
    ('itens por página', 'items per page'),
    ('Mostrando', 'Showing'),
    ('de', 'of'),
    ('Anterior', 'Previous'),
    ('Página', 'Page'),
    ('Próxima', 'Next'),
])
update_file('/home/luis/mai/gui/components/Table/Table.stories.tsx', [
    ('Nome', 'Name'),
    ('Data', 'Date'),
    ('Status', 'Status'),
    ('Aprovado', 'Approved'),
    ('Pendente', 'Pending'),
])

# MDX Files

card_mdx = """import { Meta, Story, Canvas, Controls } from "@storybook/addon-docs";
import { Card } from "./Card";

<Meta title="Components/Composites/Card" component={Card} />

# Card

> **Design System Reference**: Mastercard Editorial System ([DESIGN.md](file:///home/luis/mai/gui/DESIGN.md))

## Overview
The **Card** component is the primary structural container for displaying metrics, M&A transactions, and platform dashboards. Following the refined principles and the Dealroom.net benchmark:
- **Small Radii (8px)** by default to maximize financial data density.
- **High Contrast White (`#FFFFFF`)** on the cream background (`#F3F0EE`).
- **Left-aligned** by default.
- **Mandatory Pure White (`#FFFFFF`)** for icons and text inside orange variant cards (`Signal Orange`).

## Props API

<Controls />

## Usage Guidelines
- **Do**: Use the default high-contrast white card for most content, metrics, and standard information.
- **Do**: Use the \`orange\` variant exclusively for critical alerts or actions requiring immediate attention (e.g., Compliance/KYB pending).
- **Don't**: Use the \`dark\` or \`raised\` variants redundantly; reserve \`raised\` for nested elements and \`dark\` for hero/footer sections.
- **Don't**: Change the text color inside the \`orange\` card; it must remain pure white.

## Variants
The Card component supports the following variants:
- **Default**: High contrast white surface on canvas cream.
- **Raised**: Lifted cream surface for nested structured elements.
- **Dark**: Ink Black dark surface.
- **Orange**: Signal Orange background with forced white text/icons.
- **Portrait**: Circular portrait exception (aspect square, 50% radius).
"""

modal_mdx = """import { Meta, Story, Canvas, Controls } from "@storybook/addon-docs";
import { Modal } from "./Modal";

<Meta title="Components/Composites/Modal" component={Modal} />

# Modal

> **Design System Reference**: Mastercard Editorial System ([DESIGN.md](file:///home/luis/mai/gui/DESIGN.md))

## Overview
The **Modal** component displays content in a layer above the main application. It requires user interaction to close or proceed and is used for critical actions, deep dives into data, or focused tasks like document review in the M&A pipeline. It features a dark backdrop blur and clean white container with left-aligned headers.

## Props API

<Controls />

## Usage Guidelines
- **Do**: Use Modals for focused tasks that require the user's undivided attention.
- **Do**: Keep modal content concise and action-oriented.
- **Don't**: Stack multiple modals on top of each other.
- **Don't**: Use Modals for simple notifications or non-blocking information (use Toasts instead).

## Variants
The Modal component supports different sizes via the \`size\` prop:
- **Small (\`sm\`)**: Best for simple confirmations or alerts.
- **Medium (\`md\`)**: Default size, suitable for standard forms and dialogs.
- **Large (\`lg\`)**: Used for complex data tables or document previews.
"""

tabs_mdx = """import { Meta, Story, Canvas, Controls } from "@storybook/addon-docs";
import { Tabs } from "./Tabs";

<Meta title="Components/Composites/Tabs" component={Tabs} />

# Tabs

> **Design System Reference**: Mastercard Editorial System ([DESIGN.md](file:///home/luis/mai/gui/DESIGN.md))

## Overview
The **Tabs** component allows users to navigate between different views or sections of content within the same context. The default design uses a pill-shaped container with smooth transitions, providing a clear indication of the active state with high contrast ink-black text on canvas-cream.

## Props API

<Controls />

## Usage Guidelines
- **Do**: Use tabs to organize related content into separate views.
- **Do**: Keep tab labels short, ideally single words (e.g., "Overview", "Metrics").
- **Don't**: Use tabs for sequential steps or wizards.
- **Don't**: Create too many tabs that cause horizontal scrolling on standard desktop screens.

## Variants
- **Pill (Default)**: A segmented control style using a pill-shaped background.
- **Button**: Individual button-like tabs for broader separation.
"""

table_mdx = """import { Meta, Story, Canvas, Controls } from "@storybook/addon-docs";
import { Table } from "./Table";

<Meta title="Components/Composites/Table" component={Table} />

# Table

> **Design System Reference**: Mastercard Editorial System ([DESIGN.md](file:///home/luis/mai/gui/DESIGN.md))

## Overview
The **Table** component is a dense, data-rich layout element essential for M&A deal matching, due diligence tracking, and financial metrics. It provides structured row-based presentation, pagination controls, and crisp contrast (alternating row backgrounds) to ensure readability of dense financial data.

## Props API

<Controls />

## Usage Guidelines
- **Do**: Use tables for displaying large datasets, financial metrics, and lists of transactions.
- **Do**: Ensure text is left-aligned to align with Dealroom.net benchmark and improve readability.
- **Don't**: Overcomplicate tables with too many columns; use horizontal scrolling only when absolutely necessary.
- **Don't**: Use tables for simple layout structuring; use CSS Grid or Flexbox instead.

## Variants
The Table component is composed of multiple sub-components:
- **Table**: The main wrapper.
- **TableHead**: The header row with distinct styling.
- **TableRow**: Individual rows with alternating background colors.
- **TableCell**: Individual cells with truncation support.
- **TablePagination**: A built-in footer component for pagination controls.
"""

with open('/home/luis/mai/gui/components/Card/Card.mdx', 'w') as f: f.write(card_mdx)
with open('/home/luis/mai/gui/components/Modal/Modal.mdx', 'w') as f: f.write(modal_mdx)
with open('/home/luis/mai/gui/components/Tabs/Tabs.mdx', 'w') as f: f.write(tabs_mdx)
with open('/home/luis/mai/gui/components/Table/Table.mdx', 'w') as f: f.write(table_mdx)
