#!/usr/bin/env node

import { execa } from "execa";
import fs from "fs-extra";
import path from "node:path";
import inquirer from "inquirer";
import chalk from "chalk";

const WEB_PACKAGES = [
  "axios",
  "zod",
  "react-hook-form",
  "@hookform/resolvers",
  "@tanstack/react-query",
  "zustand",
  "clsx",
  "tailwind-merge",
  "date-fns",
];

const FLUTTER_PACKAGES = [
  "dio",
  "retrofit",
  "json_annotation",
  "freezed_annotation",
  "riverpod",
  "flutter_riverpod",
  "go_router",
  "intl",
  "shared_preferences",
  "flutter_secure_storage",
];

const FLUTTER_DEV_PACKAGES = [
  "build_runner",
  "json_serializable",
  "freezed",
  "retrofit_generator",
  "flutter_lints",
];

async function main() {
  const answers = await inquirer.prompt([
    {
      name: "projectName",
      message: "Project name?",
      default: "my-app",
    },
    {
      name: "type",
      message: "Project type?",
      type: "list",
      choices: ["next", "expo", "flutter"],
    },
  ]);

  const projectDir = path.resolve(process.cwd(), answers.projectName);

  if (await fs.pathExists(projectDir)) {
    console.error(chalk.red("Project folder already exists."));
    process.exit(1);
  }

  if (answers.type === "next") {
    await createNextApp(answers.projectName);
    await installNodePackages(projectDir, WEB_PACKAGES);
  }

  if (answers.type === "expo") {
    await createExpoApp(answers.projectName);
    await installNodePackages(projectDir, WEB_PACKAGES);
  }

  if (answers.type === "flutter") {
    await createFlutterApp(answers.projectName);
    await installFlutterPackages(projectDir);
  }

  await createCursorRules(projectDir, answers.type);
  await createEnvExample(projectDir);
  await initGit(projectDir);

  console.log(chalk.green(`Done: ${answers.projectName}`));
}

async function createNextApp(projectName: string) {
  await execa(
    "npx",
    [
      "create-next-app@latest",
      projectName,
      "--typescript",
      "--eslint",
      "--tailwind",
      "--src-dir",
      "--app",
      "--import-alias",
      "@/*",
    ],
    { stdio: "inherit" }
  );
}

async function createExpoApp(projectName: string) {
  await execa("npx", ["create-expo-app@latest", projectName], {
    stdio: "inherit",
  });
}

async function createFlutterApp(projectName: string) {
  await execa("flutter", ["create", projectName], {
    stdio: "inherit",
  });
}

async function installNodePackages(projectDir: string, packages: string[]) {
  await execa("npm", ["install", ...packages], {
    cwd: projectDir,
    stdio: "inherit",
  });
}

async function installFlutterPackages(projectDir: string) {
  await execa("flutter", ["pub", "add", ...FLUTTER_PACKAGES], {
    cwd: projectDir,
    stdio: "inherit",
  });

  await execa("flutter", ["pub", "add", "--dev", ...FLUTTER_DEV_PACKAGES], {
    cwd: projectDir,
    stdio: "inherit",
  });
}

async function createCursorRules(projectDir: string, type: string) {
  const rulesDir = path.join(projectDir, ".cursor", "rules");
  await fs.ensureDir(rulesDir);

  await fs.writeFile(
    path.join(rulesDir, "project.mdc"),
    `---
description: Project-wide coding standards
alwaysApply: true
---

# Project Rules

- 기존 코드 스타일을 우선 따른다.
- 변경 전 관련 파일을 먼저 읽고 구조를 파악한다.
- 임의로 대규모 리팩토링하지 않는다.
- 타입 오류, 린트 오류, 테스트 실패를 남기지 않는다.
- API Key, 토큰, 비밀번호를 코드에 하드코딩하지 않는다.
`
  );

  if (type === "next" || type === "expo") {
    await fs.writeFile(
      path.join(rulesDir, "web.mdc"),
      `---
description: Web app rules
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
alwaysApply: false
---

# Required Web Packages

프로젝트 초기화 시 아래 패키지가 없으면 설치한다.

Web:
- axios
- zod
- react-hook-form
- @tanstack/react-query
- zustand
- clsx
- tailwind-merge
- date-fns
`
    );
  }

  if (type === "flutter") {
    await fs.writeFile(
      path.join(rulesDir, "mobile.mdc"),
      `---
description: Mobile app rules
globs:
  - "lib/**"
  - "**/*.dart"
alwaysApply: false
---

# Required Flutter Packages

프로젝트 초기화 시 아래 패키지가 없으면 설치한다.

Flutter:
- dio
- retrofit
- riverpod
- go_router
- flutter_secure_storage
`
    );
  }
}

async function createEnvExample(projectDir: string) {
  await fs.writeFile(
    path.join(projectDir, ".env.example"),
    `API_URL=
DATABASE_URL=
`
  );
}

async function initGit(projectDir: string) {
  await execa("git", ["init"], {
    cwd: projectDir,
    stdio: "inherit",
  });

  await execa("git", ["add", "."], {
    cwd: projectDir,
    stdio: "inherit",
  });

  await execa("git", ["commit", "-m", "Initial commit"], {
    cwd: projectDir,
    stdio: "inherit",
  }).catch(() => {});
}

main().catch((error) => {
  console.error(chalk.red(error.message));
  process.exit(1);
});