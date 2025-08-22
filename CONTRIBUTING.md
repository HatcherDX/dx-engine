# Contributing to Hatcher

First off, thank you for considering contributing to Hatcher! It's people like you that make the open-source community such an amazing place. We welcome any and all contributions, from reporting a bug to submitting a new feature.

This document provides a set of guidelines to make the contribution process easier and more effective for everyone involved.

## Code of Conduct

By participating in this project, you agree to abide by our **[Code of Conduct](CODE_OF_CONDUCT.md)**. We are committed to fostering an open and welcoming environment.

## Where to Contribute?

Hatcher has a bold vision, and we welcome contributions of all sizes. The best way to get started is to check our **[Go-to-Market Roadmap](ROADMAP.md)**.

The roadmap outlines our current strategic priorities, especially the features under the "Current Priority" milestone. This is where you can make the biggest impact on our journey to our first public release. Of course, bug fixes and documentation improvements are always welcome!

## How Can I Contribute?

### Reporting Bugs and Requesting Features

If you want to report an issue or request a feature, please first check our **[issue tracker](https://github.com/HatcherDX/dx-engine/issues)** to see if a similar one already exists.

When creating a new issue, please use our provided templates for bug reports or feature requests. This helps us gather the necessary information to address it effectively.

- Please do not use the issue tracker for personal support requests.
- Keep the discussion on topic and respect the opinions of others.

### Submitting a Pull Request

We love pull requests! If you want to contribute code, please follow the instructions below:

1.  **Fork the repository** and clone it to your local machine.
    `git clone https://github.com/<your_username>/dx-engine.git`

2.  **Navigate to the project directory.**
    `cd dx-engine`

3.  **Create a new feature branch** from the `main` branch. Please give it a descriptive name (e.g., `feature/add-new-button` or `fix/fix-login-bug`).
    `git checkout -b <your-branch-name>`

4.  **Make your changes.** Write clean, readable code. If you add a new feature, please ensure it is covered by unit tests.

5.  **Run the tests** to ensure everything is working as expected.
    `pnpm test`

6.  **Commit your changes.** Please write a clear and concise commit message (around 50 characters for the title). Use Git's [interactive rebase feature](https://help.github.com/en/github/using-git/about-git-rebase) to clean up your commits if needed.

7.  **Push your branch** up to your fork on GitHub.
    `git push origin <your-branch-name>`

8.  **Open a Pull Request (PR)** against our `main` branch. Provide a clear title and a detailed description of the changes you've made.

**Note:** By submitting a pull request, you agree to allow the project owners to license your work under the terms of the **[MIT License](LICENSE.md)**.

## Code Style Guidelines

We use **ESLint** and **Prettier** to maintain a consistent code style across the project.

- Please run `pnpm lint` and `pnpm format` before committing your changes to ensure they adhere to our standards.
- Our main guidelines are:
  - No semicolons
  - 2 spaces for indentation (no tabs)
