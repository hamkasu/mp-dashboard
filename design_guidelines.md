# Design Guidelines: Malaysian Parliament MP Dashboard

## Design Approach

**System Foundation**: Material Design with Government Digital Service principles
**Rationale**: This utility-focused, data-dense application requires clean information hierarchy, accessibility, and professional presentation. Material Design provides excellent card layouts and data display patterns, while government design principles ensure civic credibility and usability.

**Core Principles**:
- Information clarity over decoration
- Efficient data scanning and filtering
- Professional, trustworthy appearance befitting a parliamentary system
- Accessible design for all citizens
- Responsive grid layouts for optimal data presentation

---

## Typography

**Font Families**:
- Primary: Inter (headers, navigation, labels) - Clean, highly legible for UI elements
- Secondary: System UI fonts (body text, data) - Optimal readability for extended reading

**Type Scale**:
- Page Titles: text-4xl md:text-5xl, font-bold
- Section Headers: text-2xl md:text-3xl, font-semibold
- Card Titles (MP Names): text-lg font-semibold
- Labels & Metadata: text-sm font-medium, uppercase tracking-wide
- Body Text: text-base
- Captions: text-xs md:text-sm

---

## Layout System

**Spacing Units**: Tailwind units of 3, 4, 6, 8, 12, 16
- Micro spacing (card internals): p-4, gap-3
- Component spacing: p-6, gap-4
- Section spacing: py-12 md:py-16, gap-8
- Page margins: px-4 md:px-6 lg:px-8

**Container Strategy**:
- Dashboard container: max-w-7xl mx-auto
- Content sections: max-w-6xl
- Centered cards: max-w-sm to max-w-md

**Grid Patterns**:
- MP Cards Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Statistics Dashboard: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Filter Sidebar: Fixed width (w-64 to w-72) on desktop, full-width drawer on mobile

---

## Component Library

### Navigation & Header
**Top Navigation Bar**:
- Fixed header with Malaysian Parliament branding
- Logo/crest on left (60-80px height)
- Main navigation links: Dashboard, All MPs, Statistics, About Parliament
- Search bar integrated into header (desktop) or expandable icon (mobile)
- Height: h-16 md:h-20
- Shadow: shadow-md for elevation

### Dashboard Overview Section
**Statistics Cards** (4-column grid on desktop):
- Total MPs count with large number display (text-4xl font-bold)
- Party breakdown (pie chart representation with percentages)
- Gender statistics
- State distribution
- Each card: Rounded corners (rounded-lg), subtle border, p-6
- Icon + Number + Label layout

### Filter & Search Panel
**Desktop Sidebar** (left-aligned, w-64):
- Search input with icon (Heroicons magnifying glass)
- Party filter: Checkbox group with party abbreviations and counts
- State filter: Dropdown or accordion list
- Clear filters button at bottom
- Sticky positioning: sticky top-20

**Mobile**: Slide-out drawer with backdrop overlay

### MP Card Components
**Individual MP Cards**:
- Aspect ratio 3:4 photo container at top
- MP photo: rounded-t-lg, object-cover with fallback placeholder
- Card content section: p-4, gap-3
  - MP Name: text-lg font-semibold, line-clamp-2
  - Party badge: Inline badge with party abbreviation
  - Constituency: text-sm with location icon
  - Parliament code: text-xs, muted
- Hover state: Subtle elevation increase (shadow-lg), slight scale (scale-102)
- Click area: Entire card is interactive
- Cards: rounded-lg border with subtle shadow

**List View Alternative**:
- Horizontal layout: Photo (w-16 h-20) + Info columns
- Table-like structure for desktop power users
- Alternating row backgrounds for scannability

### MP Profile Page
**Header Section**:
- Large photo (w-48 h-60 md:w-64 md:h-80), rounded-lg
- Name (text-3xl md:text-4xl font-bold)
- Party affiliation with badge
- Constituency (text-xl)
- Parliament code
- Two-column layout on desktop (photo left, info right)

**Information Sections**:
- Contact details card
- Parliamentary history
- Committee memberships
- Voting record summary (if available)
- Each section: Distinct card with rounded-lg, p-6, gap-4

### Filtering & Sorting Controls
**Filter Pills** (Active filters display):
- Horizontal scroll on mobile
- Dismissible with X icon
- Rounded-full badges
- gap-2 spacing

**Sort Dropdown**:
- Options: Name (A-Z), Party, State, Recently Elected
- Dropdown with Heroicons chevron

### Empty States
- Illustration or icon (Heroicons user-group, scaled large)
- "No MPs found" message (text-xl font-semibold)
- Suggestion text: "Try adjusting your filters"
- Clear filters CTA button

### Loading States
- Skeleton cards matching MP card dimensions
- Animated pulse effect
- Maintains grid layout during loading

### Pagination
- Number-based pagination at bottom
- "Previous" and "Next" buttons with arrow icons
- Current page highlighted
- Mobile: Simplified with just prev/next + page number

---

## Images

**MP Photographs**:
- Professional headshots in official/formal attire
- Consistent 3:4 aspect ratio across all cards
- Fallback: Placeholder with initials or generic silhouette icon
- Image optimization: Lazy loading for performance

**Parliament Building Imagery**:
- Hero image option: Malaysian Parliament building exterior
- Subtle background pattern or textured overlay for dashboard header
- Use sparingly to maintain focus on data

**Icons**: Heroicons (outline style for primary actions, solid for emphasis)
- Search: magnifying-glass
- Filter: funnel
- Location: map-pin
- Party: flag
- User: user-circle
- Statistics: chart-bar

---

## Responsive Behavior

**Breakpoints**:
- Mobile: < 768px - Single column, drawer navigation, stacked filters
- Tablet: 768px-1024px - 2-column MP grid, visible sidebar
- Desktop: > 1024px - 3-4 column grid, full sidebar, optimal spacing

**Mobile Optimizations**:
- Bottom sheet for filters
- Sticky search bar
- Simplified statistics (2-column grid)
- Touch-friendly tap targets (min h-12)

---

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators on all interactive elements (ring-2 ring-offset-2)
- Screen reader announcements for filter changes
- Sufficient contrast ratios (WCAG AA minimum)
- Alt text for all MP photos
- Form labels properly associated with inputs

---

## Data Presentation Patterns

**Party Badges**: Compact pills displaying party abbreviations (PH, BN, GPS, etc.)
**Constituency Tags**: Location icon + name, subdued styling
**Metadata Display**: Label-value pairs with clear hierarchy
**Statistics**: Large numbers with supporting context
**Counts**: Always show total context (e.g., "148 of 222 MPs")

This dashboard prioritizes efficient information discovery while maintaining the dignity and professionalism appropriate for a parliamentary system.