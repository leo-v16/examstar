"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, BookOpen, Loader2, Eye, PenTool, Layout, Video, HelpCircle } from "lucide-react";
import { getResources, Resource, getResourceTypes, getChapterTypeOrder } from "@/lib/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface ResourceListProps {
  examId: string;
  subject: string;
  classLevel: string;
  chapter: string;
}

// Icon mapping for known types
const TYPE_ICONS: Record<string, React.ElementType> = {
  note: BookOpen,
  pyq: FileText,
  practice: PenTool,
  syllabus: Layout,
  video: Video,
};

export default function ResourceList({ examId, subject, classLevel, chapter }: ResourceListProps) {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  
  // Viewer State
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch resources, global order, and chapter-specific order
        const [resourcesData, globalOrder, chapterOrder] = await Promise.all([
            getResources(examId, subject, classLevel, chapter),
            getResourceTypes(),
            getChapterTypeOrder(examId, subject, classLevel, chapter)
        ]);
        
        if (isMounted) {
          setResources(resourcesData);
          // Use chapter specific order if available, otherwise global
          setTypeOrder(chapterOrder || globalOrder);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [examId, subject, classLevel, chapter]);

  // Group resources by type
  const resourcesByType = resources.reduce((acc, resource) => {
    const type = resource.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  // Sort available types based on resolved order
  const availableTypes = Object.keys(resourcesByType).sort((a, b) => {
    const indexA = typeOrder.indexOf(a);
    const indexB = typeOrder.indexOf(b);
    
    // If both exist in order array, sort by index
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only A exists, it comes first
    if (indexA !== -1) return -1;
    // If only B exists, it comes first
    if (indexB !== -1) return 1;
    // If neither exists, sort alphabetically
    return a.localeCompare(b);
  });
  
  // Default tab logic
  const defaultTab = availableTypes.length > 0 ? availableTypes[0] : "";

  const openViewer = (resource: Resource) => {
    setSelectedResource(resource);
    setIsViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ResourceItem = ({ item }: { item: Resource }) => {
    const Icon = TYPE_ICONS[item.type] || FileText;
    
    return (
      <div 
        className="flex items-center gap-3 p-3 mb-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.99] w-full"
        onClick={() => openViewer(item)}
      >
        {/* 1. Icon */}
        <div className="bg-primary/10 p-2 rounded-full shrink-0 flex items-center justify-center h-9 w-9">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>

        {/* 2. Text */}
        <div className="flex-1 min-w-0 grid gap-0.5">
          <h4 className="font-medium text-sm leading-tight truncate" title={item.title}>
            {item.title}
          </h4>
          {item.subtitle && (
             <p className="text-xs text-muted-foreground truncate" title={item.subtitle}>
               {item.subtitle}
             </p>
          )}
          {item.year && (
            <div className="flex mt-0.5">
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
                {item.year}
              </span>
            </div>
          )}
        </div>

        {/* 3. Action Icon */}
        <div className="text-muted-foreground shrink-0">
          <Eye className="h-4 w-4" />
        </div>
      </div>
    );
  };

  return (
    <>
        <div className="h-full flex flex-col w-full max-w-full overflow-hidden">
            <div className="mb-4 shrink-0">
                <h3 className="text-lg font-semibold truncate">{chapter}</h3>
                <p className="text-sm text-muted-foreground truncate">
                    {subject} • {classLevel}
                </p>
            </div>

            {availableTypes.length > 0 ? (
                <Tabs defaultValue={defaultTab} className="w-full flex-1 flex flex-col min-h-0">
                    <TabsList className="flex w-full overflow-x-auto justify-start mb-4 shrink-0 [scrollbar-width:none] -mx-1 px-1 gap-2 bg-transparent">
                      {availableTypes.map((type) => (
                          <TabsTrigger 
                            key={type} 
                            value={type}
                            className="flex-shrink-0 capitalize data-[state=active]:bg-muted data-[state=active]:shadow-none border border-transparent data-[state=active]:border-border bg-background"
                          >
                            {type.replace('-', ' ')} ({resourcesByType[type].length})
                          </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {availableTypes.map((type) => (
                        <TabsContent key={type} value={type} className="flex-1 min-h-0 w-full mt-0">
                            <ScrollArea className="h-full w-full">
                                <div className="flex flex-col p-1 pr-3 w-full">
                                    {resourcesByType[type].map((res) => (
                                        <ResourceItem key={res.id} item={res} />
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    ))}
                </Tabs>
            ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm flex-1">
                    <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                    <p>No resources available for this chapter yet.</p>
                </div>
            )}
        </div>

        {/* PDF Viewer Dialog */}
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col bg-background w-[95vw] sm:w-full">
                <DialogHeader className="px-4 py-2 border-b shrink-0">
                    <DialogTitle className="truncate pr-8 text-base">
                        {selectedResource?.title}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 w-full bg-black/5 relative overflow-hidden">
                    {selectedResource && (
                        <iframe
                            src={selectedResource.fileUrl}
                            className="w-full h-full border-none"
                            title="Resource Viewer"
                            sandbox="allow-scripts allow-same-origin allow-forms"
                            loading="lazy"
                        />
                    )}
                </div>
                <div className="p-2 border-t flex justify-end shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setIsViewerOpen(false)}>
                        Close Viewer
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
}