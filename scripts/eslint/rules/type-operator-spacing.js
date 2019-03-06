/**
 * @fileoverview Requires that the '|' and '&' operators be surrounded by spaces.
 * @author Benjamin Lichtman
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/**
 * @type {import("eslint").Rule.RuleModule}
 */
module.exports = {
    meta: {
        docs: {
            description:
                "Requires that the '|' and '&' operators be surrounded by spaces.",
            category: "Style",
            recommended: false
        },
        fixable: null,
        schema: []
    },

    create(context) {
        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        /**
         * @param {import("estree").Node} node
         */
        function check(node) {
            const tokens = sourceCode.getTokens(node);
            for (const token of tokens) {
                if (token.type === "Punctuator" && (token.value === "|" || token.value === "&")
                    && (/\S/.test(text[token.range[0] - 1]) || /\S/.test(text[token.range[1]]))) {
                    context.report({
                        loc: token.loc,
                        message: "The '|' and '&' operators must be surrounded by spaces"
                    });
                }
            }
        }

        return {
            TSUnionType(node) {
                check(node);
            },
            TSIntersectionType(node) {
                check(node);
            }
        };
    }
};
