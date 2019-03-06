/**
 * @fileoverview Forbid double spaces in literals.
 * @author Benjamin Lichtman
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "Forbid double spaces in literals.",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    /**
     * @param {utilTypes.Context} context The linting context
     * @returns {*} Rule listeners
     */
    create(context) {
        /**
         * @type {ESTree.Node[]}
         */
        const strings = [];

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {ESTree.Literal} node An ESTree literal node
             * @returns {void}
             */
            Literal(node) {
                if (
                    typeof node.value === "string" ||
                    node.value instanceof RegExp
                ) {
                    strings.push(node);
                }
            },
            /**
             * @param {ESTree.TemplateElement} node An ESTree template element
             * @returns {void}
             */
            TemplateElement(node) {
                strings.push(node);
            },
            /**
             * @param {ESTree.TemplateLiteral} node An ESTree template literal
             * @returns {void}
             */
            TemplateLiteral(node) {
                strings.push(node);
            },
            "Program:exit"() {
                const sourceCode = context.getSourceCode();
                const lines = sourceCode.getText().split("\n");

                lines.forEach((line, idx) => {
                    // Skip indentation.
                    const firstNonSpace = /\S/.exec(line);

                    if (firstNonSpace === null) {
                        return;
                    }

                    // Allow common uses of double spaces
                    // * To align `=` or `!=` signs
                    // * To align comments at the end of lines
                    // * To indent inside a comment
                    // * To use two spaces after a period
                    // * To include aligned `->` in a comment
                    const rgx = /[^/*. ] {2}[^-!/= ]/g;

                    rgx.lastIndex = firstNonSpace.index;
                    const doubleSpace = rgx.exec(line);

                    // Also allow to align comments after `@param`
                    if (doubleSpace !== null && !line.includes("@param")) {
                        const pos =
                            lines
                                .slice(0, idx)
                                .reduce(
                                    (len, currLine) =>
                                        len + 1 + currLine.length,
                                    0
                                ) + doubleSpace.index;

                        if (
                            strings.some(
                                s => s.range[0] <= pos && s.range[1] > pos
                            )
                        ) {
                            context.report({
                                loc: {
                                    start: sourceCode.getLocFromIndex(pos + 1),
                                    end: sourceCode.getLocFromIndex(pos + 3)
                                },
                                message: "Use only one space."
                            });
                        }
                    }
                });
            }
        };
    }
};
