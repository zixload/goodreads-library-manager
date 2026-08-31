# Goodreads Library Manager

<p align="center">
  <img src="icons/icon-128.png" alt="Goodreads Library Manager icon" width="96" height="96">
</p>

<p align="center">
  <strong>A faster way to manage large Goodreads libraries.</strong><br>
  Compact lists, drag selection, bulk shelf changes, quick add, and CSV export.
</p>

<p align="center">
  <a href="https://github.com/zixload/goodreads-library-manager/releases/latest"><strong>Download for Chrome</strong></a>
  &middot;
  <a href="https://github.com/zixload/goodreads-library-manager/issues">Support</a>
  &middot;
  <a href="PRIVACY.md">Privacy</a>
</p>

Goodreads Library Manager adds a compact management panel to Goodreads **My Books**. It is intended for readers with long libraries and complete book or manga series who need to update many entries without repeatedly using the standard Goodreads interface.

## Features

- Compact searchable book list with small cover previews
- Filters for Read, Currently Reading, and Want to Read
- Sorting by title or author
- Fast click-and-drag selection
- Bulk shelf changes and guarded bulk deletion
- Goodreads search and quick add by title, author, or ISBN
- Automatic loading of the complete library view
- CSV export of the filtered list
- Expandable glass-style panel that keeps Goodreads accessible

## Install

### Chrome Web Store

The public store link will be added after approval.

### Manual installation

1. Download the latest ZIP from [Releases](https://github.com/zixload/goodreads-library-manager/releases/latest).
2. Extract it to a permanent folder.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select the extracted folder.
6. Open Goodreads **My Books** and click the extension icon.

## Permissions

The extension injects its interface only on `https://www.goodreads.com/review/list*`. This access is required to read the visible library and perform actions requested by the user. It does not request access to unrelated websites.

## Privacy

Library content and pointer interactions are processed locally. The extension has no developer-operated server, analytics, advertising, or account system. See the complete [privacy policy](PRIVACY.md).

## Development

The extension uses Manifest V3 and has no build step or remote runtime dependencies. Load the repository root as an unpacked extension during development.

## License

Licensed under the [MIT License](LICENSE).

Goodreads Library Manager is an independent project and is not affiliated with or endorsed by Goodreads.
