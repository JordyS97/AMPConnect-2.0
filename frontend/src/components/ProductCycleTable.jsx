import React from 'react';
import { Wrench } from 'lucide-react';

const ProductCycleTable = ({ data }) => {
    if (!data) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-gray-500" />
                Typical Replacement Cycles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <p className="font-semibold text-gray-700">{item.category}</p>
                            <p className="text-xs text-gray-400">{item.sample_size} buyers analyzed</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-blue-600">{Math.round(item.avg_cycle)}d</p>
                            <p className="text-xs text-gray-500">Avg Cycle</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductCycleTable;
