/**
 * @fileoverview Ensure boolean arguments passed to functions are tagged with their corresponding parameter names.
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
                "Ensure boolean arguments passed to functions are tagged with their corresponding parameter names.",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // no options
        ]
    },

    /**
     * Creates the lint rule
     * @param {*} context The linting context for the rule
     * @returns {*} Returns AST listeners
     */
    create(context) {
        // variables should be defined here

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------
        /**
         * Determines if the call should be ignored
         * @param {import("estree").Node} expression The expression being called
         * @param {import("eslint").SourceCode} sourceCode The source code for the file being linted
         * @returns {boolean} Returns true iff the call should be ignored
         */
        function shouldIgnoreCalledExpression(expression, sourceCode) {
            if (expression.type === "MemberExpression") {
                const methodName = sourceCode.getText(expression.property);

                if (
                    methodName.startsWith("set") ||
                    methodName.startsWith("assert")
                ) {
                    return true;
                }
                switch (methodName) {
                    case "apply":
                    case "call":
                    case "equal":
                    case "fail":
                    case "isTrue":
                    case "output":
                    case "stringify":
                        return true;
                    default:
                        break;
                }
            } else if (expression.type === "Identifier") {
                const functionName = sourceCode.getText(expression);

                if (
                    functionName.startsWith("set") ||
                    functionName.startsWith("get")
                ) {
                    return true;
                }
                switch (functionName) {
                    case "contains":
                    case "createAnonymousType":
                    case "createImportSpecifier":
                    case "createProperty":
                    case "createSignature":
                    case "resolveName":
                        return true;
                    default:
                        break;
                }
            }
            return false;
        }

        /**
         * Checks if arg is an expression that requires explanatory trivia
         * @param {import("estree").Node} arg The expression being checked
         * @param {import("eslint").SourceCode} sourceCode The source code of the file being linted.
         * @returns true iff trivia is needed
         */
        function isTrivia(arg, sourceCode) {
            switch (arg.type) {
                case "Literal":
                    return (
                        arg.value === true ||
                        arg.value === false ||
                        arg.value === null
                    );
                case "Identifier":
                    return sourceCode.getText(arg) === "undefined";
                default:
                    return false;
            }
        }

        /**
         * Report errors for any relevant arguments without trivia
         * @param {import("estree").Node} arg The expression being checked.
         * @param {import("eslint").SourceCode} sourceCode The source code of the file being linted.
         */
        function checkArg(arg, sourceCode) {
            if (!isTrivia(arg, sourceCode)) {
                return;
            }

            const comments = sourceCode
                .getCommentsAfter(arg)
                .concat(sourceCode.getCommentsBefore(arg));

            if (
                typeof comments === "undefined" ||
                comments.length !== 1 ||
                comments[0].type !== "Block"
            ) {
                context.report({
                    node: arg,
                    message: "Tag argument with parameter name"
                });
                return;
            }

            const comment = comments[0];
            const argStart = arg.range[0];

            if (
                comment.range[1] + 1 !== argStart &&
                sourceCode
                    .getText()
                    .slice(comment.range[1], argStart)
                    .indexOf("\n") === -1
            ) {
                context.report({
                    node: arg,
                    message:
                        "There should be 1 space between an argument and its comment."
                });
            }
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * Rule listener for CallExpressions
             * @param {import("estree").CallExpression} node The call expression being checked
             */
            CallExpression(node) {
                const sourceCode = context.getSourceCode();

                if (!shouldIgnoreCalledExpression(node.callee, sourceCode)) {
                    for (const arg of node.arguments) {
                        checkArg(arg, sourceCode);
                    }
                }
            }
        };
    }
};
