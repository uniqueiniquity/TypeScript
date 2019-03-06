/**
 * @fileoverview Forbid excess trailing whitespace in type assertion.
 * @author Benjamin Lichtman
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "Forbid excess trailing whitespace in type assertion.",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    /**
     * @param {utilTypes.Context} context Linting context
     * @returns {*} Rule listeners
     */
    create(context) {
        const sourceCode = context.getSourceCode();

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {{typeAnnotation: ESTree.Node, expression: ESTree.Expression}} node An ESTree version of a TypeAssertionExpression TS Node
             * @returns {void}
             */
            TSTypeAssertionExpression(node) {
                const leftSideWhitespaceStart =
                    node.typeAnnotation.range[1] + 1;
                const rightSideWhitespaceEnd = node.expression.range[0];

                if (
                    sourceCode.isSpaceBetweenTokens(
                        sourceCode.getLastToken(node.typeAnnotation),
                        sourceCode.getFirstToken(node.expression)
                    )
                ) {
                    context.report({
                        loc: {
                            start: sourceCode.getLocFromIndex(
                                leftSideWhitespaceStart
                            ),
                            end: sourceCode.getLocFromIndex(
                                rightSideWhitespaceEnd
                            )
                        },
                        message:
                            "Excess trailing whitespace found around type assertion."
                    });
                }
            }
        };
    }
};
