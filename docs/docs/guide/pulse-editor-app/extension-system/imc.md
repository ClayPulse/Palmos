---
sidebar_position: 3
---

# Inter-Module Communication (IMC)


**Inter-Module Communication (IMC)** provides communication channels between different modules powered by Webpack Module Federation. Essentially, this means every module (extensions and Pulse Editor Core) is able to establish incoming and outgoing channels with any other modules (extensions and Pulse Editor Core). 

:::info
Establishing **IMC** between extensions is up to the extensions' developer(s). Pulse Editor does **not** make communication channels **among extensions** by default, it **only** establishes communication channels between **itself (Pulse Editor Core)** and **any extension** upon loading that extension. 

For example:
When extension A and B load, the Core makes IMC connections like so:  
**Core < -- > Extension A**  
**Core < -- > Extension B**

But Pulse Editor does not make the following connection, unless the developer of extension A and developer of extension B agree to inter-connect them with utils from `@pulse-editor/shared-utils`:   
**Extension A < -- > Extension B**
:::