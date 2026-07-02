export declare enum ResponseFormat {
    MARKDOWN = "markdown",
    JSON = "json"
}
/** Ensure a text payload stays under CHARACTER_LIMIT; append a note if trimmed. */
export declare function capText(text: string): string;
/** Format a number as EUR with thousands separators (no decimals). */
export declare function eur(value: number | null): string;
//# sourceMappingURL=format.d.ts.map