# AI ExamGuard — Phase 4 Design System & UI Architecture

## 1. Visual Identity & Color Tokens

Configured in [`app/globals.css`](../app/globals.css) via CSS custom properties and Tailwind CSS v4 `@theme inline`:

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#080D18` | Primary dark cybersecurity canvas |
| `--sidebar` | `#0B1220` | Collapsible navigation rail & topbar backdrop |
| `--card` | `#111B2D` | Primary surface panels and cards |
| `--surface-elevated` | `#17243A` | Hover states, table headers, elevated popovers |
| `--border` | `#243249` | Hairline component and grid borders |
| `--primary` | `#38BDF8` | Primary cyan CTA & active state highlights |
| `--secondary` | `#2DD4BF` | Secondary teal telemetry accents |
| `--purple` | `#8B5CF6` | Invigilator & analytical highlights |
| `--success` | `#22C55E` | Verified session & nominal health states |
| `--warning` | `#F59E0B` | Medium-severity integrity indicators |
| `--critical` / `--destructive` | `#EF4444` | High-severity review flags & destructive actions |
| `--foreground` | `#F8FAFC` | Primary high-contrast typography |
| `--muted-foreground` | `#94A3B8` | Secondary labels and telemetry metadata |

### Typography
Loaded via `next/font/google` in [`app/layout.tsx`](../app/layout.tsx):
- **Inter** (`--font-sans`): Body copy and dense table typography
- **Space Grotesk** (`--font-heading`): Headings, KPI numbers, and branding
- **JetBrains Mono** (`--font-mono`): Timestamps, risk metadata tags, keyboard hints, and status badges

### Motion & Accessibility
- **GSAP (`@gsap/react`)**: Hero stagger choreography in `HeroSection` with `prefers-reduced-motion` guard.
- **Motion (`motion/react`)**: Modals, slide-out `ReviewDrawer`, dropdowns (`NotificationCenter`, `ProfileMenu`), mobile drawer, and `AnimatedCounter` using `useReducedMotion()`.
- Global `@media (prefers-reduced-motion: reduce)` fallback in `app/globals.css`.

---

## 2. Reusable Component Inventory (19 Components)

### Layout Components (`components/layout/`)
1. `AppShell` — Global responsive wrapper combining sidebar, header, and main scroll viewport.
2. `AppSidebar` — Role-aware navigation rail (`admin`, `instructor`, `invigilator`, `student`), tenant badge, desktop collapse toggle, and mobile slide-out drawer.
3. `AppHeader` — Responsive topbar with mobile nav trigger, dynamic `Breadcrumbs`, search bar, telemetry status pill, `NotificationCenter`, and `ProfileMenu`.

### Shared Components (`components/shared/`)
4. `PageHeader` — Standardized page title, optional breadcrumbs, status badge, description, and action buttons.
5. `Breadcrumbs` — Hierarchical path navigation.
6. `StatCard` — KPI card with `AnimatedCounter`, accent icon, and trend indicator.
7. `DataTable` — Generic `<T>` sortable and searchable table with empty and skeleton loading states.
8. `ChartCard` — Recharts-ready container card with loading/empty state fallbacks.
9. `StatusBadge` — Semantic status & severity pill with optional live pulse dot.
10. `NotificationCenter` — Bell trigger with unread counter and animated dropdown feed.
11. `ProfileMenu` — User identity dropdown showing role badge, active tenant, and sign-out action.
12. `AnimatedCounter` — Reduced-motion-safe numeric counter animation.
13. `EmptyState` — Consistent empty placeholder card with icon and optional CTA.
14. `ErrorState` — Error alert card with optional retry callback.
15. `LoadingSkeleton` — Pattern skeletons (`card`, `table`, `list`, `stat-grid`, `text`).
16. `EventTimeline` — Chronological integrity telemetry feed with severity indicators and metadata tags.
17. `AlertPanel` — Dismissible banner alerts (`info`, `success`, `warning`, `critical`).
18. `Modal` — Accessible dialog with Escape-key and backdrop dismissal.
19. `ReviewDrawer` — Slide-over right drawer for rapid invigilator incident inspection.

---

## 3. Public Landing Website (`components/landing/` & `app/page.tsx`)

1. `LandingNav` — Sticky glassmorphic navigation with section anchors and responsive mobile menu.
2. `HeroSection` — Headline *"Examinations, Protected by Intelligence."* with interactive real-component telemetry console preview (switchable scenarios: Verified Session, Multi-Face Signal, Tab Visibility Loss).
3. `ProductIntroSection` — Four-role platform architecture overview.
4. `FeaturesSection` — Six core capabilities + honest technical boundaries table comparing in-browser MVP signals vs. future native desktop scope.
5. `HowItWorksSection` — Four-stage session lifecycle (Authoring -> Pre-Flight -> Edge Telemetry -> Human Review).
6. `ArchitecturePrivacySection` — Multi-tenant PostgreSQL RLS security, integration readiness, and zero raw video/audio retention commitments.
7. `CtaFooterSection` — Institutional provisioning CTA and footer.
