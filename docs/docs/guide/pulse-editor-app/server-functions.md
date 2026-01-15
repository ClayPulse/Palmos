# App Server Functions

## What are Server Functions?

App Server Functions are lightweight backend APIs that ship **with your Pulse App**. They allow your app to:

* Run server-side logic (Node.js)
* Access secrets or environment variables securely
* Perform heavy computation or I/O
* Act as a bridge between the frontend UI and external services

They are designed to work similar to serverless functions, except these functions are also bundled as Module Federation modules.

---

## Where Server Functions Live

All server functions must be placed inside:

```
src/server-function/
```

Each file in this directory automatically becomes an API endpoint.

**Rules:**

* Each file must have a **default export**
* The filename determines the API route
* The code runs in a **Node.js environment**, not the browser

Example structure:

```
src/server-function/
├── echo.ts
├── summarize.ts
└── get-user.ts
```

---

## How Routes Are Generated

Routes are mapped using the following convention:

```
/server-function/<file-name>
```

| File name    | API Endpoint               |
| ------------ | -------------------------- |
| echo.ts      | /server-function/echo      |
| get-user.ts  | /server-function/get-user  |
| summarize.ts | /server-function/summarize |

Nested folders are also supported and map directly to nested routes.

---

## Writing a Server Function

A server function must export a default handler.

### Basic Example

```ts
export default async function handler(req, res) {
  res.json({ message: "Hello from server function" })
}
```

### Echo Example

```ts
export default async function handler(req, res) {
  const body = req.body
  res.json({ received: body })
}
```

The handler signature follows a familiar Express-style API:

* `req` — incoming request (method, headers, query, body)
* `res` — response helper (json, send, status, etc.)

---

## Calling Server Functions from the Frontend

From your React frontend, you can call server functions using `fetch`.

### Example

```ts
const response = await fetch("/server-function/echo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Hello" })
})

const data = await response.json()
console.log(data)
```

Because the frontend and backend are served from the same origin during development and production, **no additional base URL is required**.

---

## HTTP Methods

Server functions support standard HTTP methods:

* GET
* POST
* PUT
* DELETE

You can branch logic based on `req.method` if needed.

```ts
export default async function handler(req, res) {
  if (req.method === "GET") {
    res.json({ status: "ok" })
  } else {
    res.status(405).send("Method Not Allowed")
  }
}
```

---

## Using Environment Variables

Server functions can safely access environment variables.

```ts
const apiKey = process.env.MY_SECRET_KEY
```

This is the recommended way to store:

* API keys
* Tokens
* Credentials

Never expose secrets directly in frontend code.

You can set your backend environment variables in Pulse Editor `Marketplace > <your_app> > Details > Developer Settings` 

---

## Error Handling

Always return proper HTTP status codes for errors.

```ts
export default async function handler(req, res) {
  try {
    throw new Error("Something went wrong")
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
```

The frontend can then handle errors gracefully.

---

## When to Use Server Functions
Use **Server Functions** when:

* You need backend-only logic
* You are calling external services
* You need to protect secrets
---

## Development vs Preview Mode

### Dev Extension Mode

* Server functions are fully available
* Frontend can communicate with Pulse Editor via IMC
* Recommended for real extension development

### Preview Mode

* Server functions still work
* IMC with Pulse Editor is **not available**
* Useful for rapid UI iteration

---

## Summary

App Server Functions provide a simple, powerful way to add backend capabilities to your Pulse App:

* File-based routing
* Node.js execution
* Secure secrets handling
* Simple fetch-based frontend integration

They enable full-stack Pulse Apps while keeping development fast and modular.
