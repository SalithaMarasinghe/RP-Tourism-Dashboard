import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllLocations, fetchLocationByName } from '../api/reviewIntelligenceApi';
import LocationCard from '../components/review/LocationCard';
import ReviewSkeleton from '../components/review/ReviewSkeleton';
import { Button } from '../components/ui/button';
import { AlertCircle, RefreshCcw, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Skeleton } from '../components/ui/skeleton';
import { Card } from '../components/ui/card';

const ReviewIntelligence = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllLocations();
      setLocations(data.locations);
    } catch (err) {
      console.error('Error fetching review intelligence:', err);
      setError(err.message || 'Failed to load review intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCardClick = async (name) => {
    setSelectedLocation(name);
    setIsModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    
    try {
      const result = await fetchLocationByName(name);
      setDetailData(result.location);
    } catch (err) {
      console.error('Error fetching location details:', err);
      setDetailError(err.message || 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const STATUS_COLORS = {
    GOOD: '#4ade80',
    MODERATE: '#facc15',
    LOW: '#f87171',
  };

  return (
    <div className="text-white p-2">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Review <span className="text-blue-500">Intelligence</span>
          </h1>
          <p className="text-gray-400 font-medium">
            Aspect-level sentiment analysis across Sri Lanka's top tourist destinations
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-[#1c1c1e] rounded-xl border border-red-900/20">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div className="text-center">
              <h2 className="text-xl font-bold">Data Unreachable</h2>
              <p className="text-gray-400 mt-1">{error}</p>
            </div>
            <Button 
              onClick={loadData}
              variant="outline" 
              className="bg-[#1c1c1e] border-white/10 hover:bg-white/5"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        )}

        {/* Content Grid */}
        {!error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <ReviewSkeleton key={i} />
              ))
            ) : (
              locations.map((loc) => (
                <LocationCard 
                  key={loc.location} 
                  location={loc} 
                  onClick={() => handleCardClick(loc.location)}
                />
              ))
            )}
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-5xl bg-[#111111] border-white/10 text-white p-0 overflow-hidden outline-none">
            {detailLoading ? (
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-end">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-32 bg-white/5" />
                    <Skeleton className="h-10 w-64 bg-white/5" />
                  </div>
                  <Skeleton className="h-12 w-24 bg-white/5" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <Skeleton key={i} className="h-32 w-full bg-white/5 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : detailError ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-bold">{detailError}</h2>
                <Button onClick={() => setIsModalOpen(false)} variant="outline">Close</Button>
              </div>
            ) : detailData && (
              <div className="p-8 space-y-8">
                <DialogHeader className="flex flex-row items-end justify-between space-y-0 pb-2">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: STATUS_COLORS[detailData.status] }}
                      />
                      <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                        {detailData.status} Sentiment
                      </span>
                    </div>
                    <DialogTitle className="text-3xl font-black tracking-tight text-white">
                      {detailData.location}
                    </DialogTitle>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="text-4xl font-black leading-none mb-1">
                      {detailData.overall_score_raw.toFixed(3)}
                    </div>
                    <div className="text-sm font-bold text-gray-500">
                      {detailData.overall_score_pct}% Overall
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...detailData.aspects]
                    .sort((a, b) => b.sentiment_pct - a.sentiment_pct)
                    .map((aspect) => (
                      <Card key={aspect.aspect} className="bg-[#1c1c1e] border-white/5 p-4 space-y-3">
                        <h4 className="text-[13px] font-bold capitalize text-white">{aspect.aspect}</h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-gray-500">Sentiment</span>
                            <span className="text-white">{aspect.sentiment_pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#2a2a2a] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${aspect.sentiment_pct}%`, 
                                backgroundColor: STATUS_COLORS[detailData.status] 
                              }}
                            />
                          </div>
                        </div>
                      </Card>
                    ))
                  }
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ReviewIntelligence;
