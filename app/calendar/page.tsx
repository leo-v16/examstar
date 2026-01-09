"use client";

import React, { useState, useEffect } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEvents, getAllExams, ExamEvent, Exam } from "@/lib/firestore";
import { useDataWithCache } from "@/lib/data-hooks";

// Shared gradients from Home Page for consistency
const GRADIENTS = [
    "from-blue-500 via-cyan-400 to-blue-500",
    "from-purple-500 via-pink-400 to-purple-500",
    "from-orange-400 via-red-400 to-orange-400",
    "from-emerald-400 via-green-500 to-emerald-400",
];

// Colors for the Legend (UI)
const LEGEND_COLORS = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-orange-400",
    "bg-emerald-400",
];

// Explicit Tailwind classes for JIT detection - Exam Bars (Bottom)
const EXAM_BAR_COLORS = [
    "before:bg-blue-500",
    "before:bg-purple-500",
    "before:bg-orange-400",
    "before:bg-emerald-400",
];

export default function CalendarPage() {
    const { data: cachedEvents, loading: loadingEvents } = useDataWithCache<ExamEvent[]>(
        "cache_events",
        async () => {
            const data = await getEvents();
            // Ensure dates are Date objects (getEvents does this, but good to be safe)
            return data.map(e => ({ ...e, date: new Date(e.date) }));
        },
        [],
        (data: any[]) => data.map(e => ({ ...e, date: new Date(e.date) }))
    );

    const { data: cachedExams, loading: loadingExams } = useDataWithCache<Exam[]>(
        "cache_exams",
        async () => {
            const data = await getAllExams();
            return data.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
        },
        [],
        (data: any[]) => data // No special hydration needed for exams, but we could sort again if needed.
                              // Actually fetcher sorts, so stored data is sorted.
    );

    const events = cachedEvents || [];
    const exams = cachedExams || [];
    const loading = loadingEvents || loadingExams;

    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedExamFilter, setSelectedExamFilter] = useState<string>("all");

    // Helper to safely get Date object from event (Firestore Timestamp support)
    const getSafeDate = (eventDate: any): Date => {
        if (eventDate instanceof Date) return eventDate;
        if (eventDate?.toDate) return eventDate.toDate();
        return new Date(eventDate);
    };

    // Filter events based on date and exam selection
    const selectedDateEvents = events.filter(event => {
        // 1. Date Filter
        const matchesDate = !date || isSameDay(getSafeDate(event.date), date);
        
        // 2. Exam Filter
        const matchesExam = selectedExamFilter === "all" || event.examId === selectedExamFilter;

        return matchesDate && matchesExam;
    });

    // Modifiers Logic
    const modifiers: Record<string, Date[]> = {};
    const modifiersClassNames: Record<string, string> = {};

    // 1. Setup Exam Modifiers (Bottom Bar)
    exams.forEach((exam, index) => {
        const barColorClass = EXAM_BAR_COLORS[index % EXAM_BAR_COLORS.length];
        const key = `exam_${index}`;
        modifiers[key] = [];
        // Use 'before' for the Bottom Bar
        modifiersClassNames[key] = `before:content-[''] before:absolute before:bottom-1 before:left-1.5 before:right-1.5 before:h-[3px] before:rounded-full ${barColorClass} before:z-10`; 
    });

    // 2. Setup Type Modifiers (Top-Right Dot)
    const fallbackTypes = ['exam', 'registration', 'result', 'other'];
    const typeDotColors: Record<string, string> = {
        exam: "after:bg-destructive",
        registration: "after:bg-blue-500",
        result: "after:bg-green-500",
        other: "after:bg-muted-foreground"
    };

    fallbackTypes.forEach(type => {
        const key = `type_${type}`;
        modifiers[key] = [];
        // Use 'after' for the Dot (moved to top-right to avoid overlap)
        modifiersClassNames[key] = `after:content-[''] after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full ${typeDotColors[type]} after:z-10`;
    });

    // 3. Populate Modifiers
    const filteredEventsForIndicators = events.filter(event => 
        selectedExamFilter === "all" || event.examId === selectedExamFilter
    );

    filteredEventsForIndicators.forEach(event => {
        const dateObj = startOfDay(getSafeDate(event.date));
        
        // A. Add Exam Modifier (Underline) if linked
        if (event.examId) {
            const examIndex = exams.findIndex(e => e.id === event.examId);
            if (examIndex !== -1) {
                modifiers[`exam_${examIndex}`].push(dateObj);
            }
        }

        // B. Add Type Modifier (Dot) - ALWAYS
        const typeKey = `type_${event.type}` in modifiers ? `type_${event.type}` : `type_other`;
        modifiers[typeKey].push(dateObj);
    });

    // Get exam color logic (helper for other parts)
    const getExamColor = (examId?: string) => {
        if (!examId) return null;
        const index = exams.findIndex(e => e.id === examId);
        if (index === -1) return null;
        return GRADIENTS[index % GRADIENTS.length];
    };

    const getExamName = (examId?: string) => {
        if (!examId) return null;
        return exams.find(e => e.id === examId)?.name || examId;
    };


    // Refactored Event List Logic to prevent UI overlaps
    const renderEventContent = () => {
        // CASE A: No events found (either no date selected + empty filter, or date selected + empty)
        if (selectedDateEvents.length === 0) {
             return (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[450px] text-muted-foreground p-8 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 opacity-20" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-medium">No events found</p>
                        <p className="text-sm">
                            {date 
                                ? "No events for this date matching your filter." 
                                : "No upcoming events match your filter."}
                        </p>
                    </div>
                    {date && (
                        <Button variant="outline" size="sm" onClick={() => setDate(undefined)}>
                            View All Dates
                        </Button>
                    )}
                </div>
            );
        }

        // CASE B: Events found
        return (
            <div className="flex flex-col p-4 gap-4 flex-1 w-full">
                {selectedDateEvents.map((event) => (
                    <EventRow 
                        key={event.id} 
                        event={event} 
                        showDateBadge={!date} // Show date badge if viewing 'All Upcoming' (no specific date selected)
                        examColor={getExamColor(event.examId)}
                        examName={getExamName(event.examId)}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href="/">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Exam Calendar</h1>
                    <p className="text-muted-foreground">Stay updated with important exam dates and deadlines.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Calendar Section (Left) */}
                    <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardContent className="p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-md border-none w-full flex justify-center p-4"
                                    modifiers={modifiers}
                                    modifiersClassNames={modifiersClassNames}
                                />
                                <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
                                    {/* Type Indicators */}
                                    <div className="flex flex-wrap gap-3 justify-center">
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                            <div className="w-1.5 h-1.5 rounded-full bg-destructive" /> Exam
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Reg
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Result
                                        </div>
                                    </div>
                                    
                                    {/* Exam Indicator */}
                                    {exams.length > 0 && (
                                        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground border-t pt-2 mt-1">
                                            <div className="w-full text-center italic">
                                                Linked exams have unique colored bars
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Upcoming Events Preview (Next 3) */}
                        <Card className="hidden md:block border-border/50 shadow-sm bg-muted/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Next Upcoming</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {events.filter(e => getSafeDate(e.date) >= new Date()).slice(0, 3).map(event => (
                                    <div key={event.id} className="text-sm flex justify-between items-start gap-2">
                                        <div className="font-medium truncate flex-1">{event.title}</div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap">{format(getSafeDate(event.date), "MMM d")}</div>
                                    </div>
                                ))}
                                {events.filter(e => getSafeDate(e.date) >= new Date()).length === 0 && (
                                    <div className="text-xs text-muted-foreground">No upcoming events.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Events List Section (Right) */}
                    <div className="md:col-span-7 lg:col-span-8">
                        <Card className="h-full min-h-[500px] border-border/50 shadow-sm flex flex-col bg-background overflow-hidden">
                            <CardHeader className="border-b bg-muted/5 space-y-4 sm:space-y-0 flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                            {date ? format(date, "MMMM d, yyyy") : "All Upcoming Events"}
                                        </span>
                                        {selectedDateEvents.length > 0 && (
                                            <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px] font-semibold">
                                                {selectedDateEvents.length}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground font-medium">
                                        {date 
                                            ? "Schedule for the selected date." 
                                            : "Comprehensive list of all upcoming exam activities."}
                                    </CardDescription>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <Select value={selectedExamFilter} onValueChange={setSelectedExamFilter}>
                                        <SelectTrigger className="h-9 w-full sm:w-[180px] bg-background shadow-sm border-muted-foreground/20">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                                <SelectValue placeholder="Filter by Exam" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="all" className="text-sm font-medium">All Exams</SelectItem>
                                            {exams.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.id} className="text-sm">
                                                    {exam.name || exam.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                                <ScrollArea className="flex-1 w-full">
                                    {renderEventContent()}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

interface EventRowProps { 
    event: ExamEvent; 
    showDateBadge: boolean;
    examColor?: string | null;
    examName?: string | null;
}

function EventRow({ event, showDateBadge, examColor, examName }: EventRowProps) {
    const getSafeDate = (eventDate: any): Date => {
        if (eventDate instanceof Date) return eventDate;
        if (eventDate?.toDate) return eventDate.toDate();
        return new Date(eventDate);
    };

    const dateObj = getSafeDate(event.date);
    const typeColors = {
        exam: "bg-destructive text-destructive-foreground border-destructive/20",
        registration: "bg-blue-500 text-white border-blue-500/20",
        result: "bg-green-500 text-white border-green-500/20",
        other: "bg-secondary text-secondary-foreground border-secondary/20"
    };

    const typeColor = typeColors[event.type] || typeColors.other;

    return (
        <div className="flex gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200 group relative overflow-hidden w-full">
            {/* Colored Accent Bar (Type Indicator) */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", typeColor.split(' ')[0])}></div>

            {/* Exam Ribbon (Right Side) */}
            {examColor && (
                <div 
                    className={cn("absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b", examColor)} 
                    title={`Linked to: ${examName}`}
                />
            )}

            <div className="flex-1 flex flex-col gap-2 pr-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("capitalize px-2 py-0.5 text-[10px] font-bold shadow-none border-0 rounded-md", typeColor)}>
                            {event.type}
                        </Badge>
                        {showDateBadge && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                                {format(dateObj, "MMM d, yyyy")}
                            </span>
                        )}
                        {examName && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 shadow-none rounded-md border-primary/20 text-primary truncate max-w-[150px]">
                                {examName}
                            </Badge>
                        )}
                    </div>
                </div>
                
                <div>
                    <h3 className="font-bold text-lg leading-tight text-foreground/90 group-hover:text-primary transition-colors">
                        {event.title}
                    </h3>
                    {event.description && (
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">
                            {event.description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}