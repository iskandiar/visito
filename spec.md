
MVP Product Summary — Entry Pass App

A lightweight web application for managing passes with a limited number of entries (for example gym visits, classes, or activity passes).

A pass is created with a fixed number of entries, such as 8, 12, 24, or any custom number. When a pass is issued, the system generates a unique link. Anyone with that link can open the pass on their phone and record visits.

The pass page displays:

the pass name

the issue date

the total number of entries and remaining entries

numbered entry slots

Used entries show the visit date, while unused slots remain visible as placeholders so users can easily see how many entries remain.

To record a visit, a user adds an entry. The date defaults to the current day but can be adjusted before submitting (future dates are not allowed). An optional comment can be added. The system automatically records the exact timestamp of the entry. Multiple entries on the same day are allowed.

Once all entries are used, the pass becomes full and no additional entries can be added. A new pass must then be issued.

A separate supervisor link allows editing or removing entries if corrections are needed.

The application includes a simple landing page that explains the purpose of the tool and allows creating a new pass.

The product is designed to be mobile-first, minimal, and fast, following modern 2026 UI patterns with clear layout, strong readability, and large touch-friendly controls.

The solution should be optimized for very cheap hosting infrastructure, keeping the architecture simple and lightweight. The implementation should include end-to-end functionality, automated tests, and clear documentation to ensure the system can be easily deployed, maintained, and extended.
