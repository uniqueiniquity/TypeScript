/**
 * @fileoverview Forbid prefix ++ and -- everywhere and postfix outside of loops or statements.
 * @author Benjamin Lichtman
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description:
                "Forbid prefix ++ and -- everywhere and postfix outside of loops or statements.",
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
        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        /**
         * @param {ESTree.Node} node An ESTree node
         * @param {ESTree.Node[]} nodeAncestors The chain of nodes in the AST from the root to the parent of the node currently being linted.
         * @returns {boolean} Returns true iff the location is a permitted location for an increment or decrement operation.
         */
        function isAllowedLocation(node, nodeAncestors) {
            switch (node.type) {
                // Can be a statement

                case "ExpressionStatement":
                    return true;

                // Can be directly in a for-statement

                case "ForStatement":
                    return true;

                // Can be in a comma operator in a for statement (`for (let a = 0, b = 10; a < b; a++, b--)`)

                case "SequenceExpression":
                    return (
                        nodeAncestors[nodeAncestors.length - 2].type ===
                        "ForStatement"
                    );

                default:
                    return false;
            }
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {ESTree.UpdateExpression} node An ESTree update expression
             * @returns {void}
             */
            UpdateExpression(node) {
                const nodeAncestors = context.getAncestors();

                if (
                    !isAllowedLocation(
                        nodeAncestors[nodeAncestors.length - 1],
                        nodeAncestors
                    )
                ) {
                    context.report({
                        node,
                        message:
                            "Don't use '++' or '--' postfix operators outside statements or for loops."
                    });
                }
            }
        };
    }
};
