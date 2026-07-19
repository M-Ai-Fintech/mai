# Design System Inspired by Mastercard

## 1. Visual Theme & Atmosphere
Mastercard's experience reads like a warm, editorial magazine built from soft stone and signal orange. 
- **Colors**: Canvas Cream (#F3F0EE), Ink Black (#141413), Signal Orange (#CF4500), Light Signal Orange (#F37338), Lifted Cream (#FCFBFA), White (#FFFFFF), Soft Bone (#F4F4F4).
- **Shapes**: Full pill (999px/1000px), rounded stadium (40px), primary CTA pill (20px), circular portraits (50%). No sharp corners.
- **Typography**: Sofia Sans (or fallback to Plus Jakarta Sans/Inter). Weights: 500 for headlines (tight -2% spacing), 450/400 for body.
- **Shadows**: Level 0-3 (e.g. rgba(0,0,0,0.08) 0px 24px 48px). Use soft atmospheric cushioning.
- **Depth**: Circular image fade, decorative orbital arcs (Light Signal Orange).

## 2. Component Stylings
- **Buttons**: Primary (Ink Black pill, 20px radius, Cream text), Secondary (White pill, Ink Black outline), Consent (Signal Orange pill, 24px radius).
- **Cards**: Hero Media Frame (40px radius, full width), Service Portrait Card (perfect circle 50%, with small white satellite CTA button bottom-right).
- **Nav**: Floating nav pill (desktop: 999px radius, floating below top edge).

## 10. Component Library Reference

The following is an exhaustive reference of the 24 components implemented in `gui/components/`. 
**CRITICAL FOR STITCH**: When generating screens, strictly use these exact components, variants, and props. Do NOT invent new components or variants.

### Actions
- **Button**: `<Button variant="primary" size="md" icon={<Icon name="search" />}>Label</Button>` (Variants: primary, secondary, consent, satellite, icon. Sizes: sm, md, lg)
- **Icon**: `<Icon name="search" size="md" color="currentColor" />` (Names: search, filter, chevronDown, alert, check, close, globe, etc. Sizes: sm, md, lg, xl)

### Data Display
- **Card**: `<Card variant="default" padding="md">...</Card>` (Variants: default, raised, dark, orange, portrait)
- **Badge**: `<Badge variant="default" icon={<Icon />}>Label</Badge>` (Variants: default, orange, dark, outline)
- **Avatar**: `<Avatar src="..." alt="..." size="md" />` (Sizes: sm, md, lg)
- **Table**: `<Table><TableHead>...</TableHead><TableRow><TableCell>...</TableCell></TableRow></Table>`
- **Divider**: `<Divider variant="solid" spacing="md" />` (Variants: solid, dashed. Spacing: sm, md, lg)

### Forms
- **Input**: `<Input variant="default" hasError={false} icon={<Icon />} />` (Variants: default, pill, select)
- **Dropdown**: `<Dropdown options={[{value:"1",label:"L"}]} value="1" searchable={true} multiSelect={false} />`
- **FormField**: `<FormField label="Name" error="Required" hint="Helper" required={true}><Input /></FormField>`
- **Checkbox**: `<Checkbox label="Agree" />`
- **Radio**: `<Radio label="Option 1" />`
- **Textarea**: `<Textarea hasError={false} />`
- **CountrySelector**: `<CountrySelector selectedCountry="BR" variant="light" />` (Codes: BR, ES, US)

### Navigation
- **Sidebar**: `<Sidebar groups={...} isCollapsed={false} />`
- **TopBar**: `<TopBar breadcrumbs={[{label:"Home"}]} currentPov="Banker" />`
- **Tabs**: `<Tabs tabs={[{id:"1",label:"T"}]} activeTab="1" variant="pill" />` (Variants: pill, button)

### Feedback & Overlay
- **Modal**: `<Modal isOpen={true} title="Title" size="md">...</Modal>` (Sizes: sm, md, lg)
- **Toast**: `<Toast title="Success" variant="success" />` (Variants: info, success, warning, error)
- **Spinner**: `<Spinner size="md" variant="orange" />` (Variants: orange, dark, cream. Sizes: sm, md, lg)
- **Skeleton**: `<Skeleton variant="rectangular" width="100%" height="20px" />` (Variants: text, circular, rectangular)
- **EmptyState**: `<EmptyState title="No items" description="..." actionLabel="Create" />`
- **ErrorBoundary**: `<ErrorBoundary fallback={<Fallback />}>...</ErrorBoundary>`

### Layout
- **Accordion**: `<Accordion items={[{id:"1",title:"T",content:<div/>}]} variant="plain" />` (Variants: plain, bordered)
- **Footer**: `<Footer currentCountry="BR" />`
