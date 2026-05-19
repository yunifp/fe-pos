import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Package, Infinity as InfinityIcon } from 'lucide-react-native';
import api from '../api/api';

interface ProductCardProps {
    item: any;
    onPress: (item: any) => void;
    itemWidth: number;
    currencySymbol: string;
}

export default function ProductCard({ item, onPress, itemWidth, currencySymbol }: ProductCardProps) {
    const isSingle = item.hasVariant === false;
    
    // Fallback data fleksibel dari Root (Single) atau dari Variants array
    const price = isSingle ? item.price : (item.variants?.[0]?.price || 0);
    const trackStock = isSingle ? item.trackStock : (item.variants?.[0]?.trackStock || false);
    const stockQty = isSingle ? (item.stock || 0) : (item.variants?.[0]?.stock || 0);
    const hasRecipe = isSingle ? (item.recipes?.length > 0) : (item.variants?.[0]?.recipes?.length > 0);
    
    const isUnlimited = !trackStock;
    const imageUrl = item.image ? `${api.defaults.baseURL?.replace('/api', '')}${item.image}` : null;

    return (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(item)} className="flex-row items-center p-3 bg-white border shadow-sm rounded-2xl border-slate-100">
                <View className="items-center justify-center mr-3 overflow-hidden border w-14 h-14 rounded-xl bg-slate-50 border-slate-100">
                    {imageUrl ? <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" /> : <Package color="#94A3B8" size={20} />}
                </View>
                <View className="justify-center flex-1 pr-1">
                    <Text className="text-[13px] font-black text-slate-800 leading-tight mb-0.5" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mb-1">{item.category?.name || 'Umum'}</Text>
                    <View className="flex-row items-center justify-between">
                        {isUnlimited ? (
                            <View className="flex-row items-center bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                {hasRecipe ? <InfinityIcon size={8} color="#10B981" /> : null}
                                <Text className={`text-[8px] font-bold uppercase italic ${hasRecipe ? 'text-emerald-600 ml-1' : 'text-emerald-600'}`}>
                                    {hasRecipe ? 'Pakai Resep' : 'Tanpa Stok'}
                                </Text>
                            </View>
                        ) : (
                            <View className={`px-1.5 py-0.5 rounded-md ${stockQty > 5 ? 'bg-slate-100' : 'bg-rose-50'}`}>
                                <Text className={`text-[8px] font-bold uppercase ${stockQty > 5 ? 'text-slate-500' : 'text-rose-500'}`}>Stok: {stockQty}</Text>
                            </View>
                        )}
                        <Text className="ml-2 text-[10px] font-black text-indigo-600">
                            {Number(price) === 0 ? 'Open Price' : `${currencySymbol} ${Number(price || 0).toLocaleString()}`}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}