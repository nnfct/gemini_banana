import React from 'react';

interface RecommendationItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  score?: number;
  category?: string;
  productUrl?: string;
}

interface RecommendationDisplayProps {
  recommendations: {
    top: RecommendationItem[];
    pants: RecommendationItem[];
    shoes: RecommendationItem[];
    accessories: RecommendationItem[];
  };
  onItemClick?: (item: RecommendationItem) => void;
}

const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({ 
  recommendations, 
  onItemClick 
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const renderCategory = (categoryName: string, items: RecommendationItem[]) => {
    if (items.length === 0) return null;

    const categoryNames = {
      top: '상의',
      pants: '하의',
      shoes: '신발',
      accessories: '액세서리'
    };

    return (
      <div className="recommendation-category" key={categoryName}>
        <h3 className="category-title">
          {categoryNames[categoryName as keyof typeof categoryNames] || categoryName}
        </h3>
        <div className="items-grid">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="recommendation-item"
              onClick={() => {
                if (item.productUrl) {
                  window.open(item.productUrl, '_blank', 'noopener,noreferrer');
                } else {
                  onItemClick?.(item);
                }
              }}
            >
              <div className="item-image-placeholder">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="item-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="placeholder-text">No Image</div>
                )}
              </div>
              <div className="item-info">
                <p className="item-title">{item.title}</p>
                <p className="item-price">{formatPrice(item.price)}</p>
                {item.score && (
                  <p className="item-score">유사도: {item.score}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyRecommendations = Object.values(recommendations).some((items: RecommendationItem[]) => items.length > 0);

  if (!hasAnyRecommendations) {
    return (
      <div className="recommendation-display">
        <h2>추천 상품</h2>
        <p className="no-recommendations">추천할 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="recommendation-display">
      <h2>유사한 상품 추천</h2>
      <div className="categories-container">
        {renderCategory('top', recommendations.top)}
        {renderCategory('pants', recommendations.pants)}
        {renderCategory('shoes', recommendations.shoes)}
        {renderCategory('accessories', recommendations.accessories)}
      </div>
      
      <style jsx>{`
        .recommendation-display {
          margin-top: 2rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .recommendation-display h2 {
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .categories-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .recommendation-category {
          border-bottom: 1px solid #eee;
          padding-bottom: 1.5rem;
        }

        .category-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 1rem;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }

        .recommendation-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .recommendation-item:hover {
          border-color: #4F46E5;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15);
          transform: translateY(-2px);
        }

        .item-image-placeholder {
          width: 100%;
          height: 120px;
          background: #f5f5f5;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
          overflow: hidden;
        }

        .item-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-text {
          color: #999;
          font-size: 0.875rem;
        }

        .item-info {
          text-align: center;
        }

        .item-title {
          font-weight: 500;
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          line-height: 1.3;
        }

        .item-price {
          font-weight: 600;
          color: #4F46E5;
          margin-bottom: 0.25rem;
        }

        .item-score {
          font-size: 0.8rem;
          color: #666;
          margin: 0;
        }

        .no-recommendations {
          text-align: center;
          color: #666;
          padding: 2rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .items-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .recommendation-item {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default RecommendationDisplay;
