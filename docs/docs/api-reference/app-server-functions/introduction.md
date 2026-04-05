# Introduction

This page explains how **App Server Functions APIs** work in a Pulse App, how they are structured, and how the frontend communicates with them.

## What are App Server Functions?

App Server Functions are lightweight backend APIs that ship **with your Pulse App**. They allow your app to:

- Run server-side logic (Node.js)
- Access secrets or environment variables securely
- Perform heavy computation or I/O
- Act as a bridge between the frontend UI and external services

They are designed to work similar to serverless functions, except these functions are also bundled as Module Federation modules.

For more information on App Server Functions and development, see the [App Server Functions Guide](/guide/pulse-editor-app/server-functions).

## How to Call App Server Functions deployed on Pulse Editor

You can call App Server Functions via HTTP requests to the appropriate endpoints exposed by its developer.

The base URL for App Server Functions deployed on Pulse Editor is:

```
https://palmos.ai/api/server-function/<app_id>/<app_version>/<function_path>
```

When calling the App Server Function, you must include your Pulse Editor API key in the request headers for authentication:

```
Authorization: Bearer <your_api_key>
```

## Pricing

App Server Functions usage is billed based on the number of requests and compute time. The developer of the Pulse App may set specific pricing for their App Server Functions. Please refer to the app's pricing details on Pulse Editor Marketplace for more information.

To use a paid App Server Function, ensure you have enough credits in your Pulse Editor account. You can check your balance and subscribe to a plan to add more credits. See [pricing](https://palmos.ai/pricing) to get more information on subscription plans.