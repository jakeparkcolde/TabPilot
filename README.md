# TabPilot

**English** | [한국어](README.ko.md)

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/kaenladnpkombaijhlibmmijcofojhlb)

TabPilot is a Chrome memory management extension that protects tabs you are
actively using and safely suspends only tabs that have been inactive for a
while.

TabPilot does not close your tabs. It uses Chrome's native tab discarding
feature, so the tabs and their URLs remain available. When you return to a
suspended tab, Chrome reloads the page.

## Features

- First-run onboarding with protected-site presets
- Overview of all tabs, cleanup candidates, and suspended tabs
- Automatic exclusion of active, pinned, audible, and loading tabs
- Protected domains and per-tab protection for the current browser session
- Manual, selective, and automatic cleanup
- Conditional automatic cleanup based on available system memory
- System, light, and dark themes
- One-click undo for the most recent cleanup
- Suspended-tab list with quick reactivation
- Search, filter, protect, suspend, and manage all tabs from one screen
- Unified management of suspended tabs and cleanup history
- System memory overview and estimated reclaimable memory
- A/B/C popup layouts
- Up to 100 recent cleanup records
- No external servers, advertising, or analytics

## Permissions

| Permission      | Purpose                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `tabs`          | Inspect tab state and last access time, apply protection rules, and suspend or reactivate tabs |
| `storage`       | Store settings, protected domains, and cleanup history in local Chrome storage                 |
| `system.memory` | Display total and available system memory                                                      |
| `alarms`        | Run the automatic cleanup schedule explicitly enabled by the user                              |

TabPilot does not request host permissions, use content scripts, or request
the `all_urls` permission.

## Local installation

```bash
npm ci
npm run build
```

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the project's `dist` directory.

## Development

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

To create a release ZIP:

```bash
npm run release
```

The package is generated at
`release/tabpilot-<version>-chrome-web-store.zip`.

## Privacy

Tab titles, URLs, domains, and cleanup history are processed only on the
user's device to provide TabPilot's features. They are not sent to the
developer's servers or used for advertising or profiling.

See [PRIVACY.md](PRIVACY.md) for details.

## Security

Do not post sensitive information in a public issue. Follow the reporting
process in [SECURITY.md](SECURITY.md) for security vulnerabilities.

## License

TabPilot is source-available software.

- Viewing, modifying, forking, and non-commercial redistribution are allowed.
- Selling TabPilot, or offering a substantially similar product or service for
  a fee, is prohibited.
- Commercial redistribution requires a separate license agreement.

See the [MIT License + Commons Clause](LICENSE) for the full terms. Because it
restricts commercial redistribution, this is not an open-source license under
the OSI definition.
