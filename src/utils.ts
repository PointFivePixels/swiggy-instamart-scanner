interface Product {
  name: string;
  description: string;
  discountPercentage: number;
  discountedPrice: number;
  mrp: number;
  unit: string;
  origin?: string;
}

/**
 * Parses product data strings where fields are separated by " ➡️ ".
 * Assumes a relatively consistent order of fields, especially towards the end.
 * Handles optional origin and variable unit structures.
 */
export function extractProductDetails(productData: string): Product | null {
  // Return single Product or null if parsing fails
  try {
    // 0. If productData includes "Sold Out", return null
    if (productData.includes("Sold Out")) {
      console.error(`Skipping row - product is sold out: ${productData}`);
      return null;
    }

    // 1. Split the string by the separator and trim whitespace from each part
    const parts = productData.split("➡️").map((p) => p.trim());
    const L = parts.length; // Total number of parts

    // 2. Basic validation: Check for a reasonable minimum number of parts.
    // We expect at least: discount, name, name, desc, unit(maybe >1), price1, price2, -, options/add, 1, +
    if (L < 10) {
      console.error(`Skipping row - too few parts (${L})`);
      console.log("------------------------------------------------------");
      console.log(`Product data: ${productData}`);
      console.log("------------------------------------------------------");
      return null;
    }

    // --- 3. Extract known fields from the END ---
    // These have fixed positions relative to the end of the array
    const priceStr1 = parts[L - 6]; // First price number
    const priceStr2 = parts[L - 5]; // Second price number

    const price1 = parseInt(priceStr1, 10);
    const price2 = parseInt(priceStr2, 10);

    // Validate prices
    if (isNaN(price1) || isNaN(price2)) {
      console.error(
        `Skipping row - invalid prices: '${priceStr1}', '${priceStr2}'`
      );
      console.log("------------------------------------------------------");
      console.log(`Product data: ${productData}`);
      console.log("------------------------------------------------------");
      return null;
    }

    // Determine discounted price and MRP (lower is discounted, higher is MRP)
    const discountedPrice = Math.min(price1, price2);
    const mrp = Math.max(price1, price2);

    // --- 4. Extract Discount Percentage from the START ---
    const discountMatch = parts[0].match(/^(\d+)\s*%\s*OFF$/i); // Match "XX% OFF" case-insensitively
    if (!discountMatch || discountMatch.length < 2) {
      console.error(
        `Skipping row - invalid discount format: '${parts[0]}' in ${productData}`
      );
      console.log("------------------------------------------------------");
      console.log(`Product data: ${productData}`);
      console.log("------------------------------------------------------");
      return null;
    }
    const discountPercentage = parseInt(discountMatch[1], 10);
    if (isNaN(discountPercentage)) {
      console.error(
        `Skipping row - invalid discount percentage: '${parts[0]}' in ${productData}`
      );
      console.log("------------------------------------------------------");
      console.log(`Product data: ${productData}`);
      console.log("------------------------------------------------------");
      return null;
    }

    // --- 5. Extract Name and Description ---
    const nameIndex = 2;
    const name = parts[nameIndex];
    const description = parts[nameIndex + 1];

    // --- 6. Extract Origin (Optional) ---
    let origin: string | undefined = undefined;
    // Check fields *before* the identified name for "From " prefix
    for (let i = 1; i < nameIndex; i++) {
      if (parts[i].startsWith("From ")) {
        origin = parts[i].substring(5).trim(); // Extract text after "From "
        break; // Assume only one origin field if multiple exist before name
      }
    }

    // --- 7. Extract Unit String ---
    // The unit is composed of all parts between the description (index nameIndex + 2)
    // and the first price (index L - 6).
    const unitStartIndex = nameIndex + 3;
    const unitEndIndex = L - 6; // The index *before* the first price part
    const unitParts = parts.slice(unitStartIndex, unitEndIndex);
    const unit = unitParts.join(" ").trim(); // Join parts (e.g., "1 Piece x 3", "(200 - 300 ml)") with spaces

    // Validate unit string
    if (!unit) {
      console.warn(`Warning: Extracted empty unit string`);
    }

    // --- 8. Construct the Product Object ---
    const product: Product = {
      name,
      description,
      discountPercentage,
      discountedPrice,
      mrp,
      unit,
    };

    if (origin) {
      product.origin = origin;
    }

    return product;
  } catch (error) {
    // Catch any unexpected errors during processing
    console.error(
      `Unexpected error parsing product data string: ${productData}`,
      error
    );
    return null;
  }
}
