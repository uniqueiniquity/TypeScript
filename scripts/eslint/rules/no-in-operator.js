/**
 * @fileoverview Forbids the 'in' keyword.
 * @author Benjamin Lichtman
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "Forbids the 'in' keyword.",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create(context) {
        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {ESTree.BinaryExpression} node An ESTree binary expression
             * @returns {void}
             */
            BinaryExpression(node) {
                if (node.operator === "in") {
                    context.report({
                        node,
                        message:
                            "Don't use the 'in' keyword - use 'hasProperty' to check for key presence instead"
                    });
                }
            }
        };
    }
};
