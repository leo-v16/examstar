"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Layers, Loader2 } from "lucide-react";
import { getExamStructure, ExamStructure } from "@/lib/firestore";
import ResourceList from "@/components/ResourceList";

export default function ExamPage() {
  const params = useParams();
  const examId = params.examId as string;

  const [structure, setStructure] = useState<ExamStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>("");

  // Drawer/Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<{
    subject: string;
    classLevel: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const fetchStructure = async () => {
      if (!examId) return;
      try {
        const data = await getExamStructure(examId);
        setStructure(data);
        if (data && data.subjects.length > 0) {
          setActiveSubject(data.subjects[0].name);
        }
      } catch (error) {
        console.error("Error fetching exam structure:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStructure();
  }, [examId]);

  const handleChapterClick = (subjectName: string, className: string, chapterName: string) => {
    setSelectedChapter({
      subject: subjectName,
      classLevel: className,
      name: chapterName,
    });
    setIsSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!structure || structure.subjects.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-4 text-center">
        <Layers className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Exam Not Found</h2>
        <p className="text-muted-foreground">
          The exam structure for &quot;{examId}&quot; could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center bg-card">
         <h1 className="font-bold text-lg capitalize truncate">{examId.replace(/-/g, ' ')}</h1>
      </div>

      <Tabs 
        value={activeSubject} 
        onValueChange={setActiveSubject} 
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Scrollable Horizontal Tabs for Subjects */}
        <div className="border-b bg-background px-2">
            <ScrollArea className="w-full whitespace-nowrap" orientation="horizontal">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-2">
                {structure.subjects.map((subject) => (
                    <TabsTrigger
                    key={subject.name}
                    value={subject.name}
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all"
                    >
                    {subject.name}
                    </TabsTrigger>
                ))}
                </TabsList>
            </ScrollArea>
        </div>

        {/* Tab Content: Classes & Accordions */}
        <div className="flex-1 overflow-hidden bg-muted/5">
          {structure.subjects.map((subject) => (
            <TabsContent 
                key={subject.name} 
                value={subject.name} 
                className="h-full m-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full px-4 py-4">
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {subject.classes.map((cls, idx) => (
                    <AccordionItem 
                        key={idx} 
                        value={`item-${idx}`} 
                        className="border rounded-lg bg-card shadow-sm px-2"
                    >
                      <AccordionTrigger className="px-2 hover:no-underline py-3">
                        <span className="font-semibold text-base">{cls.name}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 pt-1">
                        <div className="flex flex-col gap-1">
                            {cls.chapters.length > 0 ? (
                                cls.chapters.map((chapter, cIdx) => (
                                    <div
                                        key={cIdx}
                                        onClick={() => handleChapterClick(subject.name, cls.name, chapter)}
                                        className="flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer active:bg-muted/70 transition-colors group"
                                    >
                                        <span className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors">
                                            {chapter}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/50" />
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground p-2 italic">No chapters added.</p>
                            )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {subject.classes.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <p>No classes found for {subject.name}.</p>
                     </div>
                )}
                <div className="h-20" /> {/* Spacer for bottom scrolling */}
              </ScrollArea>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Resource Drawer (Bottom Sheet) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0 flex flex-col gap-0">
          <div className="p-6 pb-2">
             <SheetHeader className="text-left">
                <SheetTitle className="sr-only">Resource Viewer</SheetTitle> {/* Accessibility */}
                <SheetDescription className="sr-only">
                    View notes and previous year questions for the selected chapter.
                </SheetDescription>
             </SheetHeader>
          </div>
          
          {selectedChapter && (
             <div className="flex-1 overflow-hidden px-6 pb-6">
                <ResourceList 
                    examId={examId}
                    subject={selectedChapter.subject}
                    classLevel={selectedChapter.classLevel}
                    chapter={selectedChapter.name}
                />
             </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
