# Batch Solver

This project is a fork of [Trangium's original Batch Solver](https://github.com/trangium/trangium.github.io), redesigned exclusively for 3x3 puzzles.

This project is not intended to replace the original Batch Solver or change its
general purpose. It is an independent version that adapts and simplifies the
interface for a 3x3-specific workflow.

The redesign and implementation were created with the help of **OpenAI Codex**.

## License and attribution

This repository is a modified fork of the original
[trangium/trangium.github.io](https://github.com/trangium/trangium.github.io)
project. This version contains modifications that redesign and limit the Batch
Solver interface to a 3x3-specific workflow.

The original project is licensed under the MIT License and retains its original
copyright notice: `Copyright (c) 2021 trangium`. See [LICENSE](LICENSE) for the
complete license text.

Here is a list of the relevant features in Batch Solver:

- Subset moves changed from text to UI buttons.
  - Right click to change the color of that specific move shown in the output.
- Most of the content is persisted in local storage, so that nothing is lost when the page is closed.
- **Unique orientations and equivalences** has the option to automatically apply the respective image mask, removing the colors from the specified pieces.
- **Unique orientations and equivalences** and **scramble** have the option to disable lines so that multiple scrambles can be held without losing them.
