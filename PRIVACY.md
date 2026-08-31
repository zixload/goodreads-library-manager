# Goodreads Library Manager privacy policy

Effective date: August 31, 2026

Goodreads Library Manager is an independent browser extension that provides a compact interface for managing books on Goodreads. It does not operate an analytics service, advertising service, user-account backend, or developer-controlled data server.

## Data processed by the extension

On Goodreads **My Books** pages, the extension locally processes the website content needed for its features, including book titles, authors, shelf status, cover image URLs, book links, and Goodreads row identifiers.

The extension also processes clicks and pointer movements used for selection and drag selection. This interaction data is not logged or retained as an activity history.

## How data is used

Data is used only to display the library interface and perform actions explicitly requested by the user, including searching, sorting, selecting books, changing shelves, adding or removing books, and creating CSV or diagnostic downloads.

Requests needed to manage the library are sent directly to Goodreads over HTTPS while the user is signed in. The extension does not send library data to the developer or to analytics, advertising, or other third-party services.

## Authentication and sensitive information

The extension relies on the user's existing Goodreads session but does not read or store passwords, authentication cookies, payment information, or personal communications. Goodreads security tokens are used only by the page for requested Goodreads operations and are never included in diagnostic exports.

## Local files

CSV and diagnostic files are created only when requested by the user and are saved locally to the user's device. The developer does not receive these files.

## Retention and deletion

The extension does not maintain an external database. Temporary interface state is kept only in the active browser page or session and is discarded when that context ends. Locally downloaded CSV or diagnostic files remain under the user's control and can be deleted through the operating system.

## Remote code

The extension does not execute remote JavaScript or WebAssembly. All executable code is included in the installed extension package.

## Limited use

The use of information received from browser and website access complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is used only to provide the extension's disclosed library-management purpose.

## Changes

This policy may be updated if the extension's functionality or data practices change. The latest version will remain available in this repository and on the public privacy page.

## Contact

Privacy questions can be submitted through the repository's [issue tracker](https://github.com/zixload/goodreads-library-manager/issues).
