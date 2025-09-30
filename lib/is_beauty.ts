export function isBeauty(product_category: string): boolean {
    if (!product_category) return false;

    const beautyKeywords = ["beauty", "PB"]

    const categoryName = product_category?.toLowerCase() || '';
    const hasBeautyInCategory = beautyKeywords.some(keyword => 
        categoryName.includes(keyword)
    );

    return hasBeautyInCategory
}