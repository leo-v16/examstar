"use client";

import React, { useState, useEffect } from "react";
import {
  getAllExams,
  Exam,
  addResource,
  getResources,
  deleteResource,
  Resource,
  getResourceTypes,
  addResourceType,
  deleteResourceType,
  updateResourceType,
  updateResourceOrder,
  setResourceTypes,
  getChapterTypeOrder,
  saveChapterTypeOrder
} from "@/lib/firestore";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Link as LinkIcon, Save, Trash2, FileText, ExternalLink, Plus, Settings2, Pencil, Check, X, GripVertical, ListOrdered } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Sortable Item Component ---
function SortableResourceItem({ resource, onDelete }: { resource: Resource; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: resource.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group relative select-none"
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab hover:text-primary active:cursor-grabbing text-muted-foreground/50 -ml-1 touch-none"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Icon */}
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-5 text-primary" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 grid gap-0.5">
        <p className="font-medium text-sm sm:text-base leading-tight truncate" title={resource.title}>
          {resource.title}
        </p>
        {resource.subtitle && (
          <p className="text-xs text-muted-foreground truncate" title={resource.subtitle}>
              {resource.subtitle}
          </p>
        )}
        {resource.year && (
          <div className="flex">
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wider">
              Year: {resource.year}
            </Badge>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" asChild title="View Resource" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => resource.id && onDelete(resource.id)}
          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
          title="Delete Resource"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Sortable Type Item Component ---
interface SortableTypeItemProps {
    type: string;
    isEditing: boolean;
    editTypeName: string;
    setEditTypeName: (val: string) => void;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

function SortableTypeItem({ type, isEditing, editTypeName, setEditTypeName, onEdit, onSave, onCancel, onDelete }: SortableTypeItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: `type-${type}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 border rounded-md bg-card group">
            {isEditing ? (
                <div className="flex items-center gap-2 flex-1 pl-7"> {/* pl-7 to align with non-editing state if needed, or just let it float */}
                    <Input 
                        value={editTypeName} 
                        onChange={(e) => setEditTypeName(e.target.value)}
                        className="h-8"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={onSave}>
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onCancel}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                         {/* Drag Handle */}
                        <div 
                            {...attributes} 
                            {...listeners} 
                            className="cursor-grab hover:text-foreground active:cursor-grabbing text-muted-foreground transition-colors touch-none"
                        >
                            <GripVertical size={14} />
                        </div>
                        <span className="capitalize font-medium">{type.replace('-', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onEdit}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive/70 hover:text-destructive" 
                            onClick={onDelete}
                            disabled={['note', 'pyq', 'practice'].includes(type)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

// --- Simple Sortable Item (For Chapter Order) ---
function SortableSimpleItem({ id, text }: { id: string; text: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 border rounded-md bg-card select-none">
       <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab hover:text-foreground active:cursor-grabbing text-muted-foreground transition-colors touch-none"
        >
            <GripVertical size={14} />
        </div>
        <span className="capitalize font-medium">{text}</span>
    </div>
  );
}

export default function ResourceUploader() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  // Selection States
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");

  // Form States
  const [resourceType, setResourceType] = useState<string>("note");
  const [newTypeName, setNewTypeName] = useState("");
  
  // Type Management States
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState("");

  // Chapter Order State
  const [isChapterOrderOpen, setIsChapterOrderOpen] = useState(false);
  const [chapterTypeOrder, setChapterTypeOrder] = useState<string[]>([]);
  const [loadingChapterOrder, setLoadingChapterOrder] = useState(false);

  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [driveLink, setDriveLink] = useState("");

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  
  // Existing Resources
  const [existingResources, setExistingResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingExams(true);
      try {
        const [examsData, typesData] = await Promise.all([getAllExams(), getResourceTypes()]);
        setExams(examsData);
        setAvailableTypes(typesData);
      } catch (error) {
        console.error("Failed to fetch initial uploader data:", error);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchInitialData();
  }, []);

  const refreshResources = async () => {
    if (!selectedExamId || !selectedSubject || !selectedClass || !selectedChapter) return;
    setLoadingResources(true);
    try {
      const data = await getResources(selectedExamId, selectedSubject, selectedClass, selectedChapter, resourceType);
      setExistingResources(data);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    refreshResources();
  }, [selectedExamId, selectedSubject, selectedClass, selectedChapter, resourceType]);

  // Fetch chapter order when chapter is selected
  useEffect(() => {
    const fetchChapterOrder = async () => {
      if (!selectedExamId || !selectedSubject || !selectedClass || !selectedChapter) return;
      
      setLoadingChapterOrder(true);
      try {
        const order = await getChapterTypeOrder(selectedExamId, selectedSubject, selectedClass, selectedChapter);
        if (order && order.length > 0) {
           // Merge with available types to ensure new types are included
           // Filter out types that no longer exist
           const validTypes = order.filter(t => availableTypes.includes(t));
           const missingTypes = availableTypes.filter(t => !validTypes.includes(t));
           setChapterTypeOrder([...validTypes, ...missingTypes]);
        } else {
           setChapterTypeOrder(availableTypes);
        }
      } catch (err) {
        console.error("Failed to fetch chapter order:", err);
        setChapterTypeOrder(availableTypes);
      } finally {
        setLoadingChapterOrder(false);
      }
    };
    
    // Only fetch if we have selected everything and availableTypes is populated
    if (availableTypes.length > 0) {
        fetchChapterOrder();
    }
  }, [selectedExamId, selectedSubject, selectedClass, selectedChapter, availableTypes]);


  // Derived Data
  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const subjects = selectedExam?.structure.subjects || [];
  
  const selectedSubjectData = subjects.find((s) => s.name === selectedSubject);
  const classes = selectedSubjectData?.classes || [];

  const selectedClassData = classes.find((c) => c.name === selectedClass);
  const chapters = selectedClassData?.chapters || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const oldIndex = existingResources.findIndex((i) => i.id === active.id);
        const newIndex = existingResources.findIndex((i) => i.id === over.id);
        
        const newItems = arrayMove(existingResources, oldIndex, newIndex);
        setExistingResources(newItems);
        
        const updates = newItems.map((item, index) => ({
          id: item.id!,
          order: index
        }));

        try {
            await updateResourceOrder(updates);
        } catch (err) {
            console.error("Failed to update order", err);
            refreshResources();
        }
    }
  };
  
  const handleTypeDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      
      if (over && active.id !== over.id) {
          const activeId = active.id as string;
          const overId = over.id as string;
          
          // IDs are prefixed with "type-"
          const type1 = activeId.replace("type-", "");
          const type2 = overId.replace("type-", "");
          
          const oldIndex = availableTypes.indexOf(type1);
          const newIndex = availableTypes.indexOf(type2);
          
          if (oldIndex !== -1 && newIndex !== -1) {
              const newTypes = arrayMove(availableTypes, oldIndex, newIndex);
              setAvailableTypes(newTypes);
              
              try {
                  await setResourceTypes(newTypes);
              } catch (error) {
                  console.error("Failed to save type order:", error);
                  alert("Failed to save type order");
              }
          }
      }
  };

  const handleChapterTypeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
       const oldIndex = chapterTypeOrder.indexOf(active.id as string);
       const newIndex = chapterTypeOrder.indexOf(over.id as string);
       if (oldIndex !== -1 && newIndex !== -1) {
           setChapterTypeOrder(arrayMove(chapterTypeOrder, oldIndex, newIndex));
       }
    }
  };

  const saveChapterOrder = async () => {
     if (!selectedExamId || !selectedSubject || !selectedClass || !selectedChapter) return;
     try {
         await saveChapterTypeOrder(selectedExamId, selectedSubject, selectedClass, selectedChapter, chapterTypeOrder);
         setIsChapterOrderOpen(false);
     } catch (err) {
         console.error("Failed to save chapter order:", err);
         alert("Failed to save chapter order");
     }
  };

  // Set default type
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(resourceType)) {
        setResourceType(availableTypes[0]);
    }
  }, [availableTypes, resourceType]);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setYear("");
    setDriveLink("");
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    const formatted = newTypeName.trim().toLowerCase().replace(/\s+/g, '-');
    if (availableTypes.includes(formatted)) {
        alert("Type already exists");
        return;
    }
    
    try {
        await addResourceType(formatted);
        setAvailableTypes([...availableTypes, formatted]);
        setResourceType(formatted);
        setNewTypeName("");
    } catch (error) {
        console.error("Failed to add type:", error);
        alert("Failed to add type");
    }
  };

  const handleDeleteType = async (typeToDelete: string) => {
    if (!confirm(`Are you sure you want to delete '${typeToDelete}'? \n\nNote: Resources with this type will remain but the type won't be selectable for new uploads.`))
      return;
    
    try {
        await deleteResourceType(typeToDelete);
        const newTypes = availableTypes.filter(t => t !== typeToDelete);
        setAvailableTypes(newTypes);
        if (resourceType === typeToDelete && newTypes.length > 0) {
            setResourceType(newTypes[0]);
        }
    } catch (error) {
        console.error("Failed to delete type:", error);
        alert("Failed to delete type");
    }
  };

  const startEditingType = (type: string) => {
    setEditingType(type);
    setEditTypeName(type);
  };

  const saveEditedType = async () => {
    if (!editingType || !editTypeName.trim()) return;
    const formatted = editTypeName.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (formatted !== editingType && availableTypes.includes(formatted)) {
        alert("Type name already exists");
        return;
    }

    try {
        await updateResourceType(editingType, formatted);
        
        // Update local state
        const index = availableTypes.indexOf(editingType);
        const newTypes = [...availableTypes];
        newTypes[index] = formatted;
        setAvailableTypes(newTypes);
        
        if (resourceType === editingType) {
            setResourceType(formatted);
        }
        
        setEditingType(null);
        setEditTypeName("");
    } catch (error) {
        console.error("Failed to update type:", error);
        alert("Failed to update type");
    }
  };

  const handleSave = async () => {
    if (!selectedExamId || !selectedSubject || !selectedClass || !selectedChapter || !title || !driveLink) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);

    try {
      let finalUrl = driveLink;
      if (finalUrl.includes("drive.google.com") && finalUrl.includes("/view")) {
        finalUrl = finalUrl.replace("/view", "/preview");
      }

      await addResource({
        examId: selectedExamId,
        subject: selectedSubject,
        class: selectedClass,
        chapter: selectedChapter,
        type: resourceType,
        title: title,
        subtitle: subtitle,
        fileUrl: finalUrl,
        ...(resourceType === "pyq" && { year }),
      });

      alert("Resource saved successfully!");
      resetForm();
      refreshResources();

    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save resource.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      await deleteResource(resourceId);
      setExistingResources(existingResources.filter((r) => r.id !== resourceId));
    } catch (error) {
      console.error("Failed to delete resource:", error);
      alert("Failed to delete resource.");
    }
  };

  if (loadingExams) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 w-full">
      <Card className="max-w-2xl mx-auto border-dashed shadow-sm w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-6 w-6" />
            Add Resource Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 1. Hierarchy Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedExamId} onValueChange={(val) => {
                setSelectedExamId(val);
                setSelectedSubject("");
                setSelectedClass("");
                setSelectedChapter("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>{exam.name || exam.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={(val) => {
                  setSelectedSubject(val);
                  setSelectedClass("");
                  setSelectedChapter("");
                }}
                disabled={!selectedExamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.name} value={sub.name}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select 
                value={selectedClass} 
                onValueChange={(val) => {
                  setSelectedClass(val);
                  setSelectedChapter("");
                }}
                disabled={!selectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.name} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select 
                value={selectedChapter} 
                onValueChange={setSelectedChapter}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chap) => (
                    <SelectItem key={chap} value={chap}>{chap}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t my-4" />

          {/* 2. Resource Details */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
                <div className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-primary" />
                    <Label className="text-base font-semibold">Resource Type</Label>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Global Manager */}
                    <Dialog open={isTypeManagerOpen} onOpenChange={setIsTypeManagerOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:text-xs uppercase tracking-wider font-bold bg-muted/50">
                                <Settings2 className="h-3 w-3 mr-1" />
                                Global Types
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Manage Global Resource Types</DialogTitle>
                            </DialogHeader>
                            
                            {/* Add New Type Section */}
                            <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-md border">
                                <Input 
                                    placeholder="Add new type (e.g. syllabus)" 
                                    value={newTypeName} 
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    className="h-8 text-sm"
                                />
                                <Button size="sm" onClick={handleAddType} disabled={!newTypeName} className="h-8 shrink-0">
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>

                            <ScrollArea className="max-h-[300px] pr-4">
                                <DndContext 
                                    sensors={sensors} 
                                    collisionDetection={closestCenter} 
                                    onDragEnd={handleTypeDragEnd}
                                >
                                    <SortableContext 
                                        items={availableTypes.map(t => `type-${t}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {availableTypes.map((type) => (
                                                <SortableTypeItem 
                                                    key={`type-${type}`}
                                                    type={type}
                                                    isEditing={editingType === type}
                                                    editTypeName={editTypeName}
                                                    setEditTypeName={setEditTypeName}
                                                    onEdit={() => startEditingType(type)}
                                                    onSave={saveEditedType}
                                                    onCancel={() => setEditingType(null)}
                                                    onDelete={() => handleDeleteType(type)}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    
                    {/* Chapter Order Manager */}
                    {selectedChapter && (
                        <Dialog open={isChapterOrderOpen} onOpenChange={setIsChapterOrderOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:text-xs uppercase tracking-wider font-bold bg-muted/50">
                                    <ListOrdered className="h-3 w-3 mr-1" />
                                    Chapter Order
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Order Types for {selectedChapter}</DialogTitle>
                                </DialogHeader>
                                <div className="text-sm text-muted-foreground mb-4">
                                    Drag to reorder how types appear for this specific chapter.
                                </div>
                                
                                {loadingChapterOrder ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="animate-spin h-6 w-6" />
                                    </div>
                                ) : (
                                    <ScrollArea className="max-h-[300px] pr-4">
                                        <DndContext 
                                            sensors={sensors} 
                                            collisionDetection={closestCenter} 
                                            onDragEnd={handleChapterTypeDragEnd}
                                        >
                                            <SortableContext 
                                                items={chapterTypeOrder}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-2">
                                                    {chapterTypeOrder.map((type) => (
                                                        <SortableSimpleItem 
                                                            key={type}
                                                            id={type}
                                                            text={type.replace('-', ' ')}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    </ScrollArea>
                                )}
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsChapterOrderOpen(false)}>Cancel</Button>
                                    <Button onClick={saveChapterOrder}>Save Order</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
              </div>

              <RadioGroup 
                value={resourceType} 
                onValueChange={setResourceType}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {availableTypes.map((type) => (
                    <div key={type} className="relative">
                        <RadioGroupItem value={type} id={`r-${type}`} className="peer sr-only" />
                        <Label 
                            htmlFor={`r-${type}`} 
                            className="flex items-center justify-center px-3 py-2.5 rounded-md border-2 border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all text-center text-xs sm:text-sm font-bold capitalize select-none"
                        >
                            {type.replace('-', ' ')}
                        </Label>
                    </div>
                ))}
              </RadioGroup>
            </div>

            {resourceType === "pyq" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Year</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 2023" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                placeholder="e.g. Chapter 1 Summary or 2023 Question Paper" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
                <Label>Subtitle <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input 
                    placeholder="e.g. Brief description or topic list" 
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                />
            </div>

            <div className="space-y-2">
              <Label>Google Drive PDF Link</Label>
              <Input 
                  type="text" 
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                  Paste the &apos;Share&apos; link from Google Drive. We&apos;ll automatically convert it for embedding.
              </p>
            </div>
          </div>

          {/* 3. Action */}
          <div className="pt-4">
              <Button 
                  onClick={handleSave} 
                  className="w-full gap-2"
                  disabled={isSaving || !selectedChapter || !title || !driveLink}
              >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Saving..." : "Save Resource"}
              </Button>
          </div>

          {/* Existing Resources List */}
          {selectedChapter && (
            <div className="pt-6 mt-6 border-t border-dashed space-y-4 w-full max-w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Existing {resourceType.replace('-', ' ')}s
                </h3>
                <Badge variant="outline" className="text-muted-foreground font-normal">
                  {existingResources.length}
                </Badge>
              </div>

              {loadingResources ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : existingResources.length > 0 ? (
                <div className="max-h-[350px] w-full rounded-md border p-2 sm:p-4 overflow-y-auto [scrollbar-width:thin]">
                   <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                   >
                     <SortableContext 
                        items={existingResources.map(r => r.id!)}
                        strategy={verticalListSortingStrategy}
                     >
                        <div className="flex flex-col gap-3">
                          {existingResources.map((res) => (
                            <SortableResourceItem 
                              key={res.id} 
                              resource={res} 
                              onDelete={handleDeleteResource} 
                            />
                          ))}
                        </div>
                     </SortableContext>
                   </DndContext>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/20">
                  No {resourceType.replace('-', ' ')}s found for this chapter.
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}