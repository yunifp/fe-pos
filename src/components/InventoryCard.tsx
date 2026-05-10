import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, ArrowRightLeft, History } from 'lucide-react-native';

interface InventoryCardProps {
    item: any;
    itemWidth: number;
    isExpanded: boolean;
    onToggleExpand: (id: number) => void;
    onOpenHistory: (variant: any) => void;
    onOpenAdjust: (variant: any) => void;
}

const StockBadge = ({ current, min }: { current: number, min: number }) => {
    const isLow = current <= min;
    return (
        <View className={`px-1.5 py-0.5 rounded-md ${isLow ? 'bg-rose-100' : 'bg-emerald-100'}`}>
            <Text className={`text-[8px] font-black uppercase ${isLow ? 'text-rose-700' : 'text-emerald-700'}`}>
                {isLow ? 'MENIPIS' : 'AMAN'}
            </Text>
        </View>
    );
};

export default function InventoryCard({ item, itemWidth, isExpanded, onToggleExpand, onOpenHistory, onOpenAdjust }: InventoryCardProps) {
    if (!item.hasVariants && item.variants.length > 0) {
        const v = item.variants[0];
        return (
            <View style={{ width: `${itemWidth}%`, padding: 6 }}>
                <View className="flex-row items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <View className="flex-1 pr-2">
                        <Text className="mb-0.5 text-sm font-black text-slate-800 uppercase italic" numberOfLines={1}>{item.name}</Text>
                        <View className="flex-row items-center gap-2">
                            <Text className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">SKU: {v.sku || '-'}</Text>
                            <StockBadge current={v.currentStock} min={v.minStock} />
                        </View>
                    </View>
                    <View className="items-end mr-3">
                        <Text className="text-[8px] text-slate-400 uppercase font-black mb-0.5">Stok</Text>
                        <Text className={`text-lg font-black ${v.currentStock <= v.minStock ? 'text-rose-500' : 'text-slate-800'}`}>{v.currentStock}</Text>
                    </View>
                    <View className="flex-row gap-1.5">
                        <TouchableOpacity onPress={() => onOpenHistory(v)} className="p-2 bg-slate-50 rounded-lg border border-slate-100 active:bg-slate-200">
                            <History size={16} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onOpenAdjust(v)} className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 active:bg-indigo-100">
                            <ArrowRightLeft size={16} color="#4F46E5" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <View className="overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-sm">
                <TouchableOpacity onPress={() => onToggleExpand(item.id)} className="flex-row items-center justify-between p-3.5 bg-slate-50/50">
                    <View className="flex-1">
                        <Text className="text-sm font-black text-slate-800 uppercase italic" numberOfLines={1}>{item.name}</Text>
                        <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.variants.length} Varian Tersedia</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
                </TouchableOpacity>
                {isExpanded && (
                    <View className="p-1.5 bg-white">
                        {item.variants.map((v: any) => (
                            <View key={v.id} className="flex-row items-center justify-between p-2.5 border-b border-slate-50 last:border-0">
                                <View className="flex-1">
                                    <Text className="text-xs font-bold text-slate-700">{v.name}</Text>
                                    <View className="flex-row items-center gap-2 mt-0.5">
                                        <Text className="text-[8px] text-slate-300 font-bold">#{v.sku || '-'}</Text>
                                        <StockBadge current={v.currentStock} min={v.minStock} />
                                    </View>
                                </View>
                                <Text className={`font-black text-sm mr-3 ${v.currentStock <= v.minStock ? 'text-rose-500' : 'text-slate-800'}`}>{v.currentStock}</Text>
                                <View className="flex-row gap-1.5">
                                    <TouchableOpacity onPress={() => onOpenHistory(v)} className="p-1.5 rounded-md bg-slate-50 border border-slate-100">
                                        <History size={14} color="#64748B" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onOpenAdjust(v)} className="p-1.5 rounded-md bg-indigo-50 border border-indigo-100">
                                        <ArrowRightLeft size={14} color="#4F46E5" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}