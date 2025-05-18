# @pulse-editor/capacitor-plugin

Capacitor plugins for Pulse Editor

## Install

```bash
npm install @pulse-editor/capacitor-plugin
npx cap sync
```

## API

<docgen-index>

* [`echo(...)`](#echo)
* [`startManageStorageIntent()`](#startmanagestorageintent)
* [`isManageStoragePermissionGranted()`](#ismanagestoragepermissiongranted)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### echo(...)

```typescript
echo(options: { value: string; }) => Promise<{ value: string; }>
```

| Param         | Type                            |
| ------------- | ------------------------------- |
| **`options`** | <code>{ value: string; }</code> |

**Returns:** <code>Promise&lt;{ value: string; }&gt;</code>

--------------------


### startManageStorageIntent()

```typescript
startManageStorageIntent() => Promise<void>
```

--------------------


### isManageStoragePermissionGranted()

```typescript
isManageStoragePermissionGranted() => Promise<{ isGranted: boolean; }>
```

**Returns:** <code>Promise&lt;{ isGranted: boolean; }&gt;</code>

--------------------

</docgen-api>
