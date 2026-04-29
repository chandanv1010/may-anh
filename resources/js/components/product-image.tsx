import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
}

export const ProductImage = ({ src, alt, className }: ProductImageProps) => {
    const [imageError, setImageError] = useState(false);

    // Reset error state when src changes
    useEffect(() => {
        setImageError(false);
    }, [src]);

    // Show fallback icon if no src or error
    if (!src || src.trim() === '' || imageError) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 ${className || 'w-10 h-10 rounded'}`}>
                <Package className="h-1/2 w-1/2 text-gray-400" />
            </div>
        );
    }

    return (
        <img
            key={src}
            src={src}
            alt={alt}
            className={`object-cover ${className || 'w-10 h-10 rounded'}`}
            onError={() => setImageError(true)}
        />
    );
};
