import React from 'react';

const RFMSegmentation = ({ data }) => {
    if (!data) return null;

    const segments = [
        { key: 'Champions', color: 'bg-indigo-100 text-indigo-700', desc: 'High spend, frequent, recent' },
        { key: 'Loyal', color: 'bg-blue-100 text-blue-700', desc: 'Regular happy customers' },
        { key: 'New', color: 'bg-green-100 text-green-700', desc: 'Recent first-time buyers' },
        { key: 'At Risk', color: 'bg-orange-100 text-orange-700', desc: 'Declining frequency' },
        { key: 'Lost', color: 'bg-red-100 text-red-700', desc: 'Long time no see' }
    ];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Customer Segmentation (RFM)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {segments.map((seg) => (
                    <div key={seg.key} className={`p-4 rounded-xl text-center ${seg.color}`}>
                        <h4 className="font-bold text-2xl">{data[seg.key] || 0}</h4>
                        <p className="font-medium">{seg.key}</p>
                        <p className="text-[10px] opacity-75 mt-1">{seg.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RFMSegmentation;
