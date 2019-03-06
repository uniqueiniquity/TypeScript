/**
 * @fileoverview Fails if the file starts with a BOM.
 * @author Benjamin Lichtman
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "Fails if the file starts with a BOM.",
            category: "Fill me in",
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    /**
     * @param {utilTypes.Context} context Linting Context
     * @returns {*} Rule listeners
     */
    create(context) {
        // variables should be defined here

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        // any helper functions should go here or else delete this section

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            /**
             * @param {ESTree.Program} node The ESTree Program node
             * @returns {void}
             */
            Program() {
                const sourceFile = context.getSourceCode().getText();

                if (sourceFile[0] === "\ufeff") {
                    context.report({
                        loc: {
                            line: 1,
                            column: 0
                        },
                        message: "This file has a BOM."
                    });
                }
            }
        };
    }
};
