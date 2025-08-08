import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewMode } from '@/types/file';

interface FileListSkeletonProps {
  viewMode?: ViewMode;
  count?: number;
}

export const FileListSkeleton = ({ viewMode = 'grid', count = 8 }: FileListSkeletonProps) => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:space-x-4">
            {/* Search Skeleton */}
            <div className="relative flex-1 max-w-md">
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Filters and View Toggle Skeleton */}
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-[180px]" />
              <div className="flex items-center border rounded-lg">
                <Skeleton className="h-8 w-8 rounded-r-none" />
                <Skeleton className="h-8 w-8 rounded-l-none" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Display Skeleton */}
      <div className={`
        ${viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-3'
        }
      `}>
        {Array.from({ length: count }).map((_, index) => (
          <FileCardSkeleton 
            key={index}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
};

interface FileCardSkeletonProps {
  viewMode: ViewMode;
}

const FileCardSkeleton = ({ viewMode }: FileCardSkeletonProps) => {
  if (viewMode === 'list') {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* File Icon/Thumbnail Skeleton */}
            <Skeleton className="flex-shrink-0 w-12 h-12 rounded-lg" />

            {/* File Info Skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center space-x-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-2" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </div>

            {/* Actions Skeleton */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        {/* File Preview Skeleton */}
        <Skeleton className="aspect-square mb-4 rounded-lg" />

        {/* File Info Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>

          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>

        {/* Actions Skeleton */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Skeleton className="h-8 flex-1 mr-1 rounded" />
          <Skeleton className="h-8 flex-1 mx-1 rounded" />
          <Skeleton className="h-8 flex-1 ml-1 rounded" />
        </div>
      </CardContent>
    </Card>
  );
};

// Export individual skeleton components for reuse
export { FileCardSkeleton };