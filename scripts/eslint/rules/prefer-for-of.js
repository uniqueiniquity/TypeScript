/**
 * @fileoverview Requires a 'for-of' loop if the index is only used to access the iterated array.
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
                "Requires a 'for-of' loop if the index is only used to access the iterated array.",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create(context) {
        const FAILURE_STRING =
            "Expected a 'for-of' loop instead of a 'for' loop with this simple iteration";
        const sourceCode = context.getSourceCode();

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        /**
         * @param {ESTree.Node} node The node being inspected
         * @param {string} text The expected node name
         * @returns {boolean} Returns true iff node is the identifier 'text'
         */
        function isIdentifierNamed(node, text) {
            return node.type === "Identifier" && node.name === text;
        }

        /**
         * @param {ESTree.Node} node The node being inspected
         * @param {number} value The expected value
         * @returns {boolean} Returns true iff node is the numeric literal representing value
         */
        function isNumber(node, value) {
            return node.type === "Literal" && node.value === value;
        }

        /**
         * @param {ESTree.Node} node The node being inspected
         * @returns {boolean} Returns true iff node is the numeric literal 1
         */
        function isOne(node) {
            return isNumber(node, 1);
        }

        /**
         * @param {ESTree.Node} node The node being inspected
         * @param {string} indexVariableName The name of the index variable
         * @returns {boolean} Returns true iff node is an expression that increments indexVariableName
         */
        function isIncremented(node, indexVariableName) {
            /**
             * @param {ESTree.Node} id The node being inspected
             * @returns {boolean} Returns true iff node is the identifier with the same text as indexVariableName
             */
            function isVar(id) {
                return isIdentifierNamed(id, indexVariableName);
            }

            switch (node.type) {
                case "UpdateExpression": {
                    // `++x` or `x++`
                    return node.operator === "++" && isVar(node.argument);
                }

                case "AssignmentExpression":
                    if (!isVar(node.left)) {
                        return false;
                    }

                    switch (node.operator) {
                        case "+=":
                            // x += 1
                            return isOne(node.right);
                        case "=": {
                            if (node.right.type !== "BinaryExpression") {
                                return false;
                            }
                            // `x = 1 + x` or `x = x + 1`
                            return (
                                node.right.operator === "+" &&
                                ((isVar(node.right.left) &&
                                    isOne(node.right.right)) ||
                                    (isOne(node.right.left) &&
                                        isVar(node.right.right)))
                            );
                        }
                        default:
                            return false;
                    }

                default:
                    return false;
            }
        }

        /**
         * @param {ESTree.Node} node The node being inspected
         * @returns {boolean} Returns true iff node is in a destructuring assignment
         */
        function isInDestructuringAssignment(node) {
            if (node.type === "Property") {
                if (node.shorthand && node.value.type === "AssignmentPattern") {
                    return true;
                }
                node = node.parent;
            }

            // eslint-disable-next-line
            while (true) {
                switch (node.parent.type) {
                    case "RestElement":
                    case "ArrayPattern":
                    case "ObjectPattern":
                        return true;
                    case "AssignmentExpression":
                        return (
                            node.parent.left === node &&
                            node.parent.operator === "="
                        );
                    case "ForOfStatement":
                        return node.parent.left === node;
                    case "ObjectExpression":
                    case "ArrayExpression":
                        node = node.parent;
                        break;
                    case "SpreadElement":
                        if (node.parent.parent.type !== "ArrayExpression") {
                            return false;
                        }
                    // falls through
                    case "Property":
                        node = node.parent.parent;
                        break;
                    default:
                        return false;
                }
            }
        }

        /**
         * @param {ESTree.Node} node The node being inspected
         * @returns {boolean} Returns true iff the node is the target of a reassignment
         */
        function isReassignmentTarget(node) {
            const parent = node.parent;

            switch (parent.type) {
                case "UpdateExpression":
                    return true;
                case "UnaryExpression":
                    return parent.operator === "delete";
                case "AssignmentExpression":
                    return parent.left === node;
                case "Property":
                    return (
                        parent.key === node && isInDestructuringAssignment(node)
                    );
                case "ArrayPattern":
                case "RestElement":
                    return true;
                case "TSNonNullExpression":
                case "TSTypeAssertionExpression":
                case "TSAsExpression":
                    return isReassignmentTarget(parent);
                case "ForInStatement":
                case "ForOfStatement":
                    return parent.right === node;
                default:
                    return false;
            }
        }

        /**
         * @param {ESTree.Identifier} node The node being inspected
         * @param {ESTree.Expression | ESTree.Super} arrayExpr The expression we've identified as the array
         * @returns {boolean} Returns true iff the usage of the iterating variable isn't a simple array access
         */
        function isNonSimpleIncrementorUse(node, arrayExpr) {
            // check if iterator is used for something other than reading data from array
            /**
             * @type {ESTree.Node}
             */
            const parent = node.parent;

            return (
                parent.type !== "MemberExpression" ||
                // `a[i] = ...` or similar
                isReassignmentTarget(parent) ||
                // `b[i]`
                sourceCode.getText(parent.object) !==
                    sourceCode.getText(arrayExpr)
            );
        }

        /**
         * Returns the iterator and array of a `for` loop if the `for` loop is basic.
         * @param {ESTree.ForStatement} forLoop The for loop being inspected
         * @returns {{ indexVariable: ESTree.Identifier, arrayExpr: (ESTree.Expression | ESTree.Super)} | null} information about the for loop
         */
        function getForLoopHeaderInfo(forLoop) {
            if (!forLoop.init || !forLoop.test || !forLoop.update) {
                return null;
            }

            // Must start with `var i = 0;` or `let i = 0;`
            if (
                forLoop.init.type !== "VariableDeclaration" ||
                forLoop.init.declarations.length !== 1
            ) {
                return null;
            }
            const indexVariable = forLoop.init.declarations[0].id;
            const indexInit = forLoop.init.declarations[0].init;

            if (
                indexVariable.type !== "Identifier" ||
                !indexInit ||
                !isNumber(indexInit, 0)
            ) {
                return null;
            }

            // Must end with `i++`
            if (!isIncremented(forLoop.update, indexVariable.name)) {
                return null;
            }

            // Condition must be `i < arr.length;`
            if (forLoop.test.type !== "BinaryExpression") {
                return null;
            }

            const right = forLoop.test.right;

            if (
                !isIdentifierNamed(forLoop.test.left, indexVariable.name) ||
                forLoop.test.operator !== "<" ||
                right.type !== "MemberExpression"
            ) {
                return null;
            }

            if (
                right.computed ||
                right.property.type !== "Identifier" ||
                right.property.name !== "length"
            ) {
                return null;
            }

            return {
                indexVariable,
                arrayExpr: right.object
            };
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {ESTree.ForStatement} node The node being inspected
             * @returns {void}
             */
            ForStatement(node) {
                const arrayNodeInfo = getForLoopHeaderInfo(node);

                if (!arrayNodeInfo) {
                    return;
                }
                const arrayExpr = arrayNodeInfo.arrayExpr;
                const currentScope = context.getScope();
                const indexVariable = /** @type {utilTypes.Variable} */ (currentScope.set.get(
                    arrayNodeInfo.indexVariable.name
                ));

                for (const ref of indexVariable.references) {
                    if (
                        (ref.identifier !== indexVariable.defs[0].name &&
                            ref.identifier.range[0] < node.init.range[1]) ||
                        ref.identifier.range[0] >= node.range[1] || // bail out on use outside of for loop
                        (ref.identifier.range[0] >= node.body.range[0] && // only check uses in loop body
                            isNonSimpleIncrementorUse(
                                ref.identifier,
                                arrayExpr
                            ))
                    ) {
                        return;
                    }
                }

                context.report({
                    loc: {
                        start: sourceCode.getLocFromIndex(node.range[0]),
                        end: sourceCode.getLocFromIndex(node.body.range[0])
                    },
                    message: FAILURE_STRING
                });
            }
        };
    }
};
