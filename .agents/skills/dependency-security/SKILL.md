---
name: dependency-security
description: Evaluate and install packages, coding-agent skills, MCP servers, and developer tooling for SignalRoom with supply-chain discipline.
---

# Dependency and skill security

1. Prefer official registries, verified publishers, official documentation, and actively maintained packages.
2. Before adding a dependency or remote agent skill, identify purpose, repository/publisher, license, maintenance status, and required permissions.
3. Do not install opaque shell scripts, globally persistent tools, credential-reading plugins, or arbitrary remote prompts without explicit review.
4. Pin compatible semver ranges and retain the lockfile. Avoid `latest` in committed package manifests.
5. Run `npm audit --omit=dev --audit-level=high`, tests, and build after installation.
6. Document why the package/skill exists, how to remove it, and any production configuration it requires.
7. Project-local skills belong in `.agents/skills/<name>/SKILL.md`; shared compatibility links expose them to Claude and Copilot.
