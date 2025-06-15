---
sidebar_position: 2
---

# Extensions

Pulse Editor employs Micro-Frontend architecture with [Module Federation](https://module-federation.io/) for its modular extension system.

Each Pulse Editor extension is a MF remote module. Pulse Editor Core registers installed extensions when Pulse Editor starts, it does not yet load at this stage.

Pulse Editor only loads enabled extensions when either a compatible file type is opened, or a console view for that extension is opened.
