# 🍪 Crumble

> Inspect, edit, export, and manage browser cookies, localStorage, and sessionStorage from the Chrome Side Panel.

A Chrome extension that puts complete browser storage management at your fingertips — without ever leaving the page you're working on.

---

## ✨ Features

### Cookie Management
- **View all cookies** for the current domain or across all domains
- **Search & filter** cookies by name, value, domain, or path
- **Edit** any cookie field: name, value, domain, path, expiration, flags (Secure, HttpOnly, SameSite)
- **Pin** favorite cookies so they always appear at the top
- **Copy** name, value, or full JSON with one click
- **JSON Viewer** — expand and browse complex JSON cookie values in a tree view

### Web Storage (localStorage & sessionStorage)
- **Browse** all keys/values for the current domain
- **Edit** storage entries inline
- **Delete** individual keys
- **Pin** frequently-used keys

### Bulk Operations
- **Bulk Delete** — delete all filtered, session-only, or non-pinned cookies with a dry-run preview and typed confirmation
- **Undo** — restore the last bulk delete via automatic snapshots
- **Import/Export** — import cookies from JSON or export to file (all cookies, filtered, or current domain)

### Profile Snapshots
- **Save** a named snapshot of your current cookies + storage entries
- **Compare** the current state against a saved profile to see what changed
- **Export/Import** profiles as portable JSON files — share environments with your team

### Developer Experience
- **⌘K Command Palette** — quick access to all actions via keyboard
- **Value Masking** — toggle redaction for sensitive cookie values during screenshares
- **Dark/Light/System Theme** — automatic theme detection or manual override
- **Policy Checks** — security warnings on cookies missing Secure or SameSite flags
- **Responsive** — adapts to any side panel width, from narrow to wide

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Google Chrome**

### Installation

```bash
git clone https://github.com/shaileshshivam/crumble.git
cd crumble
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `dist/` folder
5. Pin the extension to your toolbar
6. Click the icon to open the side panel

---

## 📁 Project Structure

```
├── app/                      # Core business logic (plain JS)
│   ├── cookie-data.js        # Cookie parsing, sorting, filtering
│   ├── cookie-transfer.js    # Import/export serialization
│   ├── bulk-delete-plan.js   # Bulk delete planning & confirmation
│   ├── delete-snapshot.js    # Undo/restore snapshot storage
│   ├── profile-store.js      # Profile CRUD & persistence
│   ├── profile-diff.js       # Profile comparison logic
│   ├── profile-schema.js     # Profile validation (Zod)
│   ├── pagination.js         # Pagination state management
│   ├── redaction.js          # Value masking
│   ├── policy-checks.js      # Cookie security policy analysis
│   ├── storage-bridge.js     # localStorage/sessionStorage access
│   ├── storage-view.js       # Storage entry formatting
│   ├── storage-mutation.js   # Storage CRUD operations
│   ├── storage-transfer.js   # Storage import/export
│   ├── domain-context.js     # Domain detection & validation
│   └── command-routing.js    # Command palette routing
├── src/                      # React UI layer
│   ├── components/           # Reusable React components
│   │   ├── Header.tsx        # Logo, controls, search, actions
│   │   ├── ScopeTabs.tsx     # Cookies / Storage / Session tabs
│   │   ├── CookieListPanel.tsx
│   │   ├── Footer.tsx
│   │   ├── Dropdown.tsx      # Outside-click dismissal
│   │   ├── Modal.tsx         # Unified sheet modal
│   │   └── AllModals.tsx     # All modal definitions
│   ├── App.tsx               # Root component + theme logic
│   ├── panel-controller.ts   # Imperative DOM controller
│   ├── background.ts         # Service worker
│   ├── content-script.ts     # Content script for storage
│   └── theme-init.ts         # CSP-safe FOUC prevention
├── design-system/
│   └── tokens.css            # Design tokens
├── styles.css                # Global styles
├── manifest.json             # Chrome Extension manifest v3
└── vite.config.ts            # Vite + CRXJS config
```

---

## 🎨 Design System

| Token | Light | Dark | Usage |
|---|---|---|---|
| Brand | `#4E8A64` | `#6BB280` | Primary actions |
| Blue | `#4A7ADB` | `#6B9AE8` | Data operations |
| Purple | `#7C5DBF` | `#9B7DE0` | Profiles |
| Danger | `#D06050` | `#E07B6E` | Delete actions |
| Amber | `#D09840` | `#E0B050` | Warnings |

**Typography**: Inter (UI) · JetBrains Mono (values)

---

## 🧪 Testing

```bash
npm test            # Run all 92 tests
npm run test:watch  # Watch mode
npm run quality     # Lint + test + build
```

---

## ⌨️ Shortcuts

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command Palette |
| `Escape` | Close modals/dropdowns |

---

## 🔐 Permissions

| Permission | Reason |
|---|---|
| `cookies` | Read/write/delete cookies |
| `tabs` | Detect active tab domain |
| `activeTab` | Access current page context |
| `storage` | Persist preferences and profiles |
| `scripting` | Inject content script for web storage |
| `sidePanel` | Render UI in Chrome side panel |
| `downloads` | Export cookies/profiles as JSON |
| `<all_urls>` | Access cookies across all domains |

---

## 📄 License

MIT

---

**Built with** React 19 · TypeScript · Vite · CRXJS
