const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = "../scripts/eslint/rules";

module.exports = {
    "root": true,
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "warnOnUnsupportedTypeScriptVersion": false
    },
    "plugins": [
        "@typescript-eslint",
        "import",
        "jsdoc",
        "no-null",
        "prefer-arrow",
        "rulesdir"
    ],
    "rules": {
        /* Semantic rules */
        "@typescript-eslint/no-unnecessary-qualifier": "error",
        "@typescript-eslint/no-unnecessary-type-assertion": "error",

        /* Syntactic rules */
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/array-type": ["error", "array"],
        "no-restricted-globals": ["error", "setInterval", "setTimeout"],
        "rulesdir/boolean-trivia": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/class-name-casing": "error",
        "curly": ["error", "multi-line"],
        "rulesdir/debug-assert": "error",
        "no-new-func": "error",
        "no-tabs": "error",
        "@typescript-eslint/interface-name-prefix": "error",
        "@typescript-eslint/prefer-interface": "error",
        "no-labels": ["error", { "allowLoop": true, "allowSwitch": true }],
        "linebreak-style": ["error", "windows"],
        "new-parens": "error",
        "rulesdir/next-line": ["error", ["check-catch", "check-else"]],
        "no-caller": "error",
        "rulesdir/no-bom": "error",
        "no-new-wrappers": "error",
        "rulesdir/no-double-space": "error",
        "import/no-duplicates": "error",
        "constructor-super": "error",
        "no-duplicate-case": "error",
        "no-empty": "error",
        "no-empty-function": ["error", { "allow": ["constructors"] }],
        "no-eval": "error",
        "import/no-extraneous-dependencies": ["error", { "optionalDependencies": false }],
        "rulesdir/no-increment-decrement": "error",
        "@typescript-eslint/no-inferrable-types": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "no-template-curly-in-string": "error",
        "@typescript-eslint/no-misused-new": "error",
        "no-null/no-null": "error",
        // "no-reference-import" (need to do),
        "no-return-await": "error",
        "no-sparse-arrays": "error",
        "dot-notation": "error",
        "no-throw-literal": "error",
        "@typescript-eslint/no-this-alias": "error",
        "no-trailing-spaces": "error",
        "rulesdir/no-type-assertion-whitespace": "error",
        "no-undef-init": "error",
        "no-unsafe-finally": "error",
        "no-unused-expressions": ["error", { "allowTernary": true }],
        "no-var": "error",
        "quote-props": ["error", "consistent-as-needed"],
        "object-shorthand": "error",
        "brace-style": ["error", "stroustrup", { "allowSingleLine": true }], // one-line? need to see if STATEMENT_LIST_PARENTS can be extended with ts-specific things (like module block)
        "func-names": ["error", "always", { "generators": "never" }], // (TODO: shouldn't flag functions with 'this' param)
        "prefer-const": "error", // doesn't handle 'export let' well
        "rulesdir/prefer-for-of": "error",
        "prefer-object-spread": "error",
        "quotes": ["error", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
        "semi": "error",
        "space-in-parens": "error",
        "eqeqeq": "error",
        "rulesdir/type-operator-spacing": "error",
        "@typescript-eslint/type-annotation-spacing": "error",
        // "unified-signature" (need to finish),
        "use-isnan": "error",

        // TODO: camelcase doesn't handle PropertySignatures well
        "camelcase": ["error", {
            "allow": [
                "^DiagnosticsPresent_",
                "Tsc_WatchDirectory",
                "request_seq",
                "_TestOnly$"
            ]
        }],

        /* Rules that were previously enabled in TSLint */
        "rulesdir/no-in-operator": "off", // TSLint implementation of rule never actually worked
        "spaced-comment": "off", // can't enforce space on single line comments but not block comments
        "valid-jsdoc": "off", // no clear equivalent to TSLint's jsdoc-format, which just checked formatting. Could use prettier.
        "no-redeclare": "off", // doesn't handle namespace merging
        "no-fallthrough": "off", // doesn't handle cases separated only by a comment
        "whitespace": "off", // use Prettier

        // these two flag all identifiers that are not the children of a hardcoded set of nodes,
        // so they're flagged in TS-specific locations
        "id-blacklist": "off",
        "id-match": "off",
    }
};
