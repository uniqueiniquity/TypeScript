const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = "../scripts/eslint/rules";

module.exports = {
    "parser": "@typescript-eslint/parser",
    "plugins": [
        "@typescript-eslint",
        "import",
        "jsdoc",
        "no-null",
        "prefer-arrow",
        "rulesdir"
    ],
    "rules": {
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/array-type": ["error", "array"],
        "no-restricted-globals": ["error", "setInterval", "setTimeout"],
        "rulesdir/boolean-trivia": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/class-name-casing": "error",
        // "spaced-comment": ["error", "always"] (can't ignore block comments),
        "curly": ["error", "multi-line"],
        "rulesdir/debug-assert": "error",
        "no-new-func": "error",
        // import-spacing (use Prettier),
        // "@typescript-eslint/indent": ["error", 4, {
        //     // "flatTernaryExpressions": true,
        //     "ignoreComments": true,
        //     "SwitchCase": 1
        // }] (try using prettier),
        "@typescript-eslint/interface-name-prefix": "error",
        "@typescript-eslint/prefer-interface": "error",
        // jsdoc-format (not sure...)
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
        // "no-redeclare": "error" (doesn't handle namespace merging),
        "no-empty": "error",
        "no-empty-function": "error",
        "no-eval": "error",
        "import/no-extraneous-dependencies": ["error", { "optionalDependencies": false }],
        "rulesdir/no-in-operator": "error",
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
        // "no-fallthrough": "error" (causes problems with our usage),
        "@typescript-eslint/no-this-alias": "error",
        "no-trailing-spaces": "error",
        "rulesdir/no-type-assertion-whitespace": "error",
        "no-undef-init": "error",
        // no-unnecessary-qualifier (needs type info)
        // no-unnecessary-type-assertion (needs type info)
        "no-unsafe-finally": "error",
        "no-unused-expressions": "error",
        "no-var": "error",
        "quote-props": ["error", "consistent-as-needed"],
        "object-shorthand": "error",
        "brace-style": ["error", "stroustrup", { "allowSingleLine": true }], // one-line?
        "func-names": ["error", "always", { "generators": "never" }],
        "prefer-const": "error",
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
        // "id-blacklist": ["error", "any", "Number", "number", "String", "string", "Boolean", "boolean", "Undefined"]
        "camelcase": ["error", { "allow": ["^DiagnosticsPresent_"]}] // doesn't seem to fully work?
        // id-match (need to figure out regex)
        // whitespace (use Prettier)
    }
};
