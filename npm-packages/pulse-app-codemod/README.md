# pulse-app-codemod

Pulse app version migration

## Installation

```bash
# Install from registry
codemod run pulse-app-codemod

# Or run locally
codemod run -w workflow.yaml
```

## Usage

This codemod transforms typescript code by:

- Converting `var` declarations to `const`/`let`
- Removing debug statements
- Modernizing syntax patterns

## Development

```bash
# Test the transformation
npm test

# Validate the workflow
codemod validate -w workflow.yaml

# Publish to registry
codemod login
codemod publish
```

## License

MIT 