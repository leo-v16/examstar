"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
  Plus,
  CalendarDays,
  Pencil,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { addEvent, deleteEvent, updateEvent, getEvents, getAllExams, ExamEvent, Exam } from "@/lib/firestore";
import { Badge } from "@/components/ui/badge";

export default function EventManager() {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [type, setType] = useState<"exam" | "registration" | "result" | "other">("exam");
  const [description, setDescription] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsData, examsData] = await Promise.all([getEvents(), getAllExams()]);
      
      const sortedEvents = eventsData.sort((a: any, b: any) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
      });
      
      setEvents(sortedEvents);
      setExams(examsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: ExamEvent) => {
    setEditingEventId(event.id || null);
    setTitle(event.title);
    
    // Ensure date is a proper Date object
    const eventDate = (event.date as any).toDate 
        ? (event.date as any).toDate() 
        : new Date(event.date);
        
    setDate(eventDate);
    setType(event.type);
    setDescription(event.description || "");
    setSelectedExamId(event.examId || "");
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setTitle("");
    setDate(new Date());
    setDescription("");
    setType("exam");
    setSelectedExamId("");
  };

  const handleSave = async () => {
    if (!title || !date) {
      alert("Please provide a title and date.");
      return;
    }

    setIsSaving(true);
    try {
      const eventData = {
        title,
        date,
        type,
        description,
        ...(selectedExamId && selectedExamId !== "none" && { examId: selectedExamId }),
      };

      if (editingEventId) {
        await updateEvent(editingEventId, eventData);
      } else {
        await addEvent(eventData);
      }

      // Reset form
      handleCancelEdit();

      // Refresh list
      const data = await getEvents();
      const sortedData = data.sort((a: any, b: any) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
      });
      setEvents(sortedData);
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Failed to save event.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (editingEventId === id) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  return (
    <div className="w-full max-w-[100vw] px-1 overflow-hidden">
      <Card className="max-w-2xl mx-auto border-dashed shadow-sm w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Manage Schedule
          </CardTitle>
          <CardDescription>
            Add important dates like exams, registrations, or results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Add/Edit Event Form */}
          <div className="space-y-4 border p-5 rounded-lg bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("h-6 w-1 rounded-full", editingEventId ? "bg-amber-500" : "bg-primary")} />
                <h3 className="font-semibold text-sm uppercase tracking-wide">
                  {editingEventId ? "Edit Event" : "New Event"}
                </h3>
              </div>
              {editingEventId && (
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-6 text-xs">
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Event Title</Label>
                <Input
                  placeholder="e.g. JEE Mains Session 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={type}
                    onValueChange={(val: any) => setType(val)}
                  >
                    <SelectTrigger className="bg-background w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">Exam Date</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="result">Result Declaration</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2 w-full min-w-0">
                <Label>Link to Exam (Optional)</Label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="w-full bg-background min-w-0 overflow-hidden [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:text-left">
                    <SelectValue placeholder="Select an exam to link..." />
                  </SelectTrigger>
                  
                  <SelectContent className="max-w-[300px]">
                    <SelectItem value="none">None</SelectItem>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        <span className="truncate block w-[260px]">
                            {exam.name || exam.id}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Brief details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background min-h-[80px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn("flex-1", editingEventId && "bg-amber-600 hover:bg-amber-700")}
                >
                    {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : editingEventId ? (
                    <Pencil className="mr-2 h-4 w-4" />
                    ) : (
                    <Plus className="mr-2 h-4 w-4" />
                    )}
                    {editingEventId ? "Update Event" : "Add Event"}
                </Button>
                
                {editingEventId && (
                     <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                        Cancel
                     </Button>
                )}
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Upcoming Events</h3>
              <Badge variant="secondary">{events.length} Total</Badge>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading schedule...
                  </p>
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-2">
                  {events.map((event) => {
                    const eventDate = (event.date as any).toDate
                      ? (event.date as any).toDate()
                      : new Date(event.date);

                    return (
                      <div
                        key={event.id}
                        // FIX 2: STRICT GRID COLUMNS
                        // 50px for Date | 1fr for text (overflow hidden) | Auto for buttons
                        className={cn(
                            "group grid grid-cols-[50px_1fr_auto] items-center gap-3 p-2.5 border rounded-lg bg-card hover:border-primary/30 transition-all w-full",
                            editingEventId === event.id && "border-amber-500 bg-amber-50/10"
                        )}
                      >
                        {/* 1. Date Box */}
                        <div className="flex flex-col items-center justify-center h-11 bg-muted/30 rounded-md border shrink-0">
                          <span className="text-base font-bold leading-none text-primary">
                            {format(eventDate, "d")}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">
                            {format(eventDate, "MMM")}
                          </span>
                        </div>

                        {/* 2. Content Middle Section - STRICT OVERFLOW HANDLING */}
                        <div className="min-w-0 overflow-hidden">
                            {/* Top Row: Title */}
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm truncate w-full block">
                                    {event.title}
                                </h4>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        event.type === "exam"
                                        ? "destructive"
                                        : event.type === "registration"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-[9px] h-4 px-1 shadow-none capitalize shrink-0"
                                >
                                    {event.type}
                                </Badge>

                                {event.examId && (
                                    <div className="bg-primary/5 text-primary px-1.5 py-0.5 rounded border border-primary/10 max-w-[100px] shrink-0">
                                        <div className="truncate text-[10px] font-medium block">
                                            {exams.find(e => e.id === event.examId)?.name || event.examId}
                                        </div>
                                    </div>
                                )}
                                {event.description && (
                                    <span className="truncate text-xs text-muted-foreground italic block min-w-0 flex-1">
                                        {event.description}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 3. Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
                                onClick={() => handleEdit(event)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => event.id && handleDelete(event.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/5 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <CalendarDays className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-sm">No events found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Your schedule is empty. Add an event above to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}