import React from 'react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { ArrowRight } from 'lucide-react';

const STATUS_COLORS = {
  GOOD: '#4ade80',
  MODERATE: '#facc15',
  LOW: '#f87171',
};

const LocationCard = ({ location, onClick }) => {
  const statusColor = STATUS_COLORS[location.status] || '#94a3b8';

  return (
    <Card 
      onClick={() => onClick(location.location)}
      className="bg-[#1c1c1e] border-white/5 hover:border-white/10 transition-all duration-180 ease-in-out cursor-pointer hover:-translate-y-0.5 hover:shadow-xl group overflow-hidden"
    >
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: statusColor }}
            role="img"
            aria-label={`${location.status} sentiment tier`}
          />
          <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
            {location.status}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 min-h-[3.5rem]">
          {location.location}
        </h3>

        <div className="text-4xl font-black text-white mb-2">
          {location.overall_score_raw.toFixed(3)}
        </div>
      </CardContent>

      <CardFooter className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-white/[0.01]">
        <span className="text-[11px] font-medium text-gray-500">
          {location.total_aspects} aspects
        </span>
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
      </CardFooter>
    </Card>
  );
};

export default LocationCard;
