/**
 * @fileoverview Ensure catch and else are not on the same line as the preceding block's curly brace.
 * @author Benjamin Lichtman
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/**
 * @type {utilTypes.Rule.RuleModule}
 */
module.exports = {
    meta: {
        docs: {
            description:
                "Ensure catch and else are not on the same line as the preceding block's curly brace.",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            {
                type: "array",
                items: {
                    type: "string",
                    pattern: "check-catch|check-else"
                },
                uniqueItems: true,
                maxItems: 2
            }
        ]
    },

    create(context) {
        const sourceCode = context.getSourceCode();

        const OPTION_CATCH = "check-catch";
        const OPTION_ELSE = "check-else";
        const CATCH_FAILURE_STRING =
            "'catch' should not be on the same line as the preceeding block's curly brace";
        const ELSE_FAILURE_STRING =
            "'else' should not be on the same line as the preceeding block's curly brace";

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        /**
         * @param {ESTree.IfStatement} node The node being inspected
         * @returns {void}
         */
        function checkIf(node) {
            if (!node.alternate) {
                return;
            }

            // find the else keyword
            const elseKeyword = sourceCode.getTokenAfter(node.consequent);

            if (context.options[0].indexOf(OPTION_ELSE) >= 0 && !!elseKeyword) {
                const thenStatementEndLoc = sourceCode.getLocFromIndex(
                    node.consequent.range[1]
                );
                const elseKeywordLoc = sourceCode.getLocFromIndex(
                    elseKeyword.range[0]
                );

                if (thenStatementEndLoc.line === elseKeywordLoc.line) {
                    context.report({
                        loc: elseKeyword.loc,
                        message: ELSE_FAILURE_STRING
                    });
                }
            }
        }

        /**
         * @param {ESTree.TryStatement} node The node being inspected
         * @returns {void}
         */
        function checkTry(node) {
            if (context.options[0].indexOf(OPTION_CATCH) < 0 || !node.handler) {
                return;
            }

            const tryClosingBrace = sourceCode.getLastToken(node.block);
            const catchKeyword = sourceCode.getFirstToken(node.handler);

            if (!tryClosingBrace || !catchKeyword) {
                return;
            }

            const tryClosingBraceLoc = tryClosingBrace.loc.end;
            const catchKeywordLoc = catchKeyword.loc.start;

            if (tryClosingBraceLoc.line === catchKeywordLoc.line) {
                context.report({
                    loc: catchKeyword.loc,
                    message: CATCH_FAILURE_STRING
                });
            }
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {ESTree.IfStatement} node The node being inspected
             * @returns {void}
             */
            IfStatement(node) {
                checkIf(node);
            },
            /**
             * @param {ESTree.TryStatement} node The node being inspected
             * @returns {void}
             */
            TryStatement(node) {
                checkTry(node);
            }
        };
    }
};
