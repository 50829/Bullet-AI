import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const deepRelativeImport = {
  group: [
    "../../../**",
    "../../../../**",
    "../../../../../**",
    "../../../../../../**",
  ],
  message:
    "Use a configured alias for imports that cross three or more directory levels.",
};

const appImport = {
  group: ["**/app/**", "@/app/**", "@/src/app/**"],
  message: "Lower layers must not import app-layer modules.",
};

function restrictedImports(...patterns) {
  return ["error", { patterns: [deepRelativeImport, ...patterns] }];
}

const domainFeatureNames = ["goals", "habits", "moments", "reflections", "ai"];

const domainFeatureBoundaries = domainFeatureNames.map((featureName) => ({
  files: [`src/features/${featureName}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": restrictedImports(appImport, {
      group: domainFeatureNames
        .filter((candidate) => candidate !== featureName)
        .flatMap((candidate) => [
          `@/features/${candidate}/**`,
          `../${candidate}/**`,
          `../../${candidate}/**`,
        ])
        .concat(
          ["workspace", "today", "profile"].flatMap((candidate) => [
            `@/features/${candidate}/**`,
            `../${candidate}/**`,
            `../../${candidate}/**`,
          ]),
        ),
      message:
        "Domain features must not depend on composition features or other domain features.",
    }),
  },
}));

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": restrictedImports() },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports({
        group: [
          "@/app/**",
          "@/features/**",
          "@/data/**",
          "@/lib/**",
          "@/shared/**",
          "**/app/**",
          "**/features/**",
          "**/data/**",
          "**/lib/**",
          "**/shared/**",
        ],
        message:
          "Domain modules may only depend on domain modules and packages.",
      }),
    },
  },
  {
    files: ["src/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports(appImport, {
        group: [
          "@/features/**",
          "@/shared/**",
          "**/features/**",
          "**/shared/**",
        ],
        message:
          "Data modules must not depend on feature or shared UI modules.",
      }),
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": restrictedImports(appImport) },
  },
  ...domainFeatureBoundaries,
  {
    files: ["src/shared/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports(appImport, {
        group: ["@/features/**", "@/data/**", "**/features/**", "**/data/**"],
        message:
          "Shared and lib modules must not depend on data or feature modules.",
      }),
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
