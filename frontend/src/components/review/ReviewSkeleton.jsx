import React from 'react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const ReviewSkeleton = () => {
  return (
    <Card className="bg-[#1c1c1e] border-white/5 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Skeleton className="w-2 h-2 rounded-full bg-white/10" />
          <Skeleton className="h-3 w-16 bg-white/10" />
        </div>
        
        <Skeleton className="h-7 w-3/4 mb-2 bg-white/10" />
        <Skeleton className="h-7 w-1/2 mb-4 bg-white/10" />

        <Skeleton className="h-10 w-24 mb-2 bg-white/10" />
      </CardContent>
      
      <CardFooter className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-white/[0.01]">
        <Skeleton className="h-3 w-16 bg-white/10" />
        <Skeleton className="w-4 h-4 bg-white/10 rounded" />
      </CardFooter>
    </Card>
  );
};

export default ReviewSkeleton;
