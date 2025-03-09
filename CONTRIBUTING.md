# Contributing to Fireproof App Builder

Thank you for your interest in contributing to Fireproof App Builder! We welcome contributions from everyone. Here are some guidelines to help you get started.

## How to Contribute

### Adding New Remote `llms.txt` Links in `prompts.ts`

To add new remote `llms.txt` links in `prompts.ts`, follow these steps:

1. Open the `prompts.ts` file located in the `app` directory.
2. Locate the `makeBaseSystemPrompt` function.
3. Add the new remote `llms.txt` link to the `fetch` call within the function.
4. Ensure the new link is properly formatted and accessible.

Example:

```javascript
export async function makeBaseSystemPrompt(model: string) {
  const llmsText = await fetch('https://new-remote-link.com/llms.txt').then((res) => res.text());

  return `
  Your prompt content here...
  <useFireproof-docs>
  ${llmsText}
  </useFireproof-docs>
  `;
}
```

### Encouraging Forks and Contributions

We encourage you to fork this repository and contribute to its development. Here are some ways you can contribute:

- **Report Bugs**: If you find any bugs, please report them by opening an issue.
- **Suggest Features**: Have an idea for a new feature? Open an issue to discuss it.
- **Submit Pull Requests**: If you have a fix or a new feature, submit a pull request. Make sure to follow the coding standards and write tests for your changes.

## Coding Standards

- Follow the existing code style and conventions.
- Write clear and concise commit messages.
- Ensure your code passes all tests before submitting a pull request.

## Getting Help

If you need help or have any questions, feel free to open an issue or join our community discussions.

Thank you for contributing!
