
import React from 'react';

const topNavItems = ['콘텐츠', '추천', '랭킹', '세일', '브랜드', '발매', '뷰티 페스타', '월간 입점회'];
const carouselItems = [
    { brand: '써머택트', name: '[2PACK] 와이드 하이 퍼포먼스 헤드밴드', price: '16,800원' },
    { brand: '업게이트', name: '[2PACK] 심리스 스포츠 헤어밴드 러닝 헤...', price: '18,900원' },
    { brand: '뉴발란스', name: 'NBPFFS151T / SC Trainer V3 (남성 D...', price: '249,000원' },
    { brand: '아식스', name: '젤-카야노 레거시 - (IVORY/BLACK)', price: '199,000원' },
];

const productItems = [
    { brand: '라이크더모스트', name: '어웨이 엘티엠 라운드 오버 티셔츠_차콜', discount: '58%', price: '16,600원', image: 'https://placehold.co/400x500/333333/FFFFFF?text=Item+1' },
    { brand: '더콜디스트모먼트', name: 'TCM back logo den im pants (navy)', discount: '30%', price: '76,300원', image: 'https://placehold.co/400x500/2d3748/FFFFFF?text=Item+2' },
    { brand: '라이크더모스트', name: '더즌트 LTMT 오버 후디_블랙', discount: '50%', price: '29,900원', image: 'https://placehold.co/400x500/1a202c/FFFFFF?text=Item+3' },
    { brand: '나이스고스트클럽', name: '3STARS SYMBOL CROP SLIM TEE,...', discount: '30%', price: '27,300원', image: 'https://placehold.co/400x500/4a5568/FFFFFF?text=Item+4' },
    { brand: '아디다스', name: '카모플라주 후드 집업 - 블랙 / JY2775', price: '135,000원', image: 'https://placehold.co/400x500/718096/FFFFFF?text=Item+5' },
    { brand: '나이스고스트클럽', name: 'NGC BOY HOODIE ZIP UP_GREY(NG...', discount: '30%', price: '69,300원', image: 'https://placehold.co/400x500/a0aec0/FFFFFF?text=Item+6' },
];

const ProductCard = ({ item }) => (
    <div>
        <div className="relative aspect-[4/5] bg-gray-100 rounded-lg mb-2 overflow-hidden">
             <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
             <div className="absolute top-2 right-2 bg-white/50 p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
             </div>
        </div>
        <p className="font-bold text-sm truncate">{item.brand}</p>
        <p className="text-xs text-gray-600 truncate h-8">{item.name}</p>
        {item.discount && (
            <p className="text-sm font-bold"><span className="text-red-500">{item.discount}</span> {item.price}</p>
        )}
        {!item.discount && (
            <p className="text-sm font-bold">{item.price}</p>
        )}
    </div>
);


export const ECommerceUI: React.FC = () => {
  return (
    <div className="bg-white font-sans">
      <header className="sticky top-0 bg-white z-10 shadow-sm">
        <div className="overflow-x-auto whitespace-nowrap">
            <nav className="flex items-center space-x-4 p-3 text-sm font-medium">
                {topNavItems.map((item, index) => (
                    <a href="#" key={item} className={`pb-1 ${index === 1 ? 'text-black border-b-2 border-black font-bold' : 'text-gray-500'}`}>{item}</a>
                ))}
            </nav>
        </div>
      </header>

      <main className="p-4">
        <section className="mb-6">
            <div className="overflow-x-auto whitespace-nowrap flex space-x-4">
                {carouselItems.map(item => (
                    <div key={item.name} className="flex-shrink-0 w-40">
                        <div className="relative aspect-square bg-gray-100 rounded-lg mb-2"></div>
                        <p className="font-bold text-sm truncate">{item.brand}</p>
                        <p className="text-xs text-gray-600 truncate">{item.name}</p>
                        <p className="text-sm font-bold">{item.price}</p>
                    </div>
                ))}
            </div>
        </section>
        
        <button className="w-full bg-blue-500 text-white py-3 rounded-lg text-sm font-bold mb-8">
            무신사 플레이어에서 더보기
        </button>

        <section className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">스트리트 스타일 브랜드 아이템 추천</h2>
                <a href="#" className="text-xs text-gray-500">더보기</a>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {productItems.map(item => <ProductCard key={item.name} item={item} />)}
            </div>
        </section>

         <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">눈에 띄는 신규 입점 브랜드 상품</h2>
                <a href="#" className="text-xs text-gray-500">더보기</a>
            </div>
         </section>
      </main>
    </div>
  );
};
