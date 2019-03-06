/**
 * @fileoverview Lint debug statements
 * @author Benjamin Lichtman
 */
"use strict";

/**
 * @typedef {import("../util").Context} Context
 * @typedef {import("../util").ESTreeNode} ESTreeNode
 * @typedef {import("estree").CallExpression} CallExpression
 * @typedef {import("estree").Literal} Literal
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "Lint debug statements",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    /**
     * @param {Context} context The linting context
     * @returns {*} AST listener object
     */
    create(context) {
        // variables should be defined here

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        /**
         * @param {ESTreeNode} expr An ESTreeNode
         * @param {string} text A possible node name
         * @returns {boolean} Returns true iff expr is named text
         */
        function isName(expr, text) {
            return expr.type === "Identifier" && expr.name === text;
        }

        /**
         * @param {ESTreeNode} expr An ESTree node
         * @returns {boolean} Returns true iff expr is a reference to Debug.assert
         */
        function isDebugAssert(expr) {
            return (
                expr.type === "MemberExpression" &&
                isName(expr.object, "Debug") &&
                isName(expr.property, "assert")
            );
        }

        /**
         * @param {util.ESTreeNode} node An ESTree node
         * @returns {node is Literal} Returns true iff node is a string literal
         */
        function isStringLiteral(node) {
            return node.type === "Literal" && typeof node.value === "string";
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {CallExpression} node The node being checked
             * @returns {void}
             */
            CallExpression(node) {
                if (!isDebugAssert(node.callee) || node.arguments.length < 2) {
                    return;
                }
                const message = node.arguments[1];

                if (!isStringLiteral(message)) {
                    context.report({
                        node: message,
                        message:
                            "Second argument to 'Debug.assert' should be a string literal."
                    });
                }

                if (node.arguments.length < 3) {
                    return;
                }
                const message2 = node.arguments[2];

                if (
                    !isStringLiteral(message2) &&
                    message2.type !== "ArrowFunctionExpression"
                ) {
                    context.report({
                        node: message2,
                        message:
                            "Third argument to 'Debug.assert' should be a string literal or arrow function."
                    });
                }
            }
        };
    }
};
