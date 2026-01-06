"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Search, GraduationCap, ChevronRight, BookOpen } from "lucide-react";
import { getAllExams, Exam } from "@/lib/firestore";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await getAllExams();
        setExams(data);
      } catch (error) {
        console.error("Failed to fetch exams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const filteredExams = exams.filter((exam) => {
    const searchLower = query.toLowerCase();
    const name = exam.name || exam.id.replace(/-/g, " ");
    return name.toLowerCase().includes(searchLower);
  });

  const gradients = [
    "from-blue-500 to-cyan-400",
    "from-purple-500 to-pink-400",
    "from-orange-400 to-red-400",
    "from-emerald-400 to-green-500",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <section className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6 bg-muted/20 border-b">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary/10 p-3 rounded-full">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">ExamEdge</span>
        </div>
        <div className="space-y-2 max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Find Your Exam
          </h1>
          <p className="text-muted-foreground text-lg">
            Access previous year questions and notes for your preparation.
          </p>
        </div>
        
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 h-12 text-base shadow-sm"
            placeholder="Search exams (e.g., JEE, NEET)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Content Grid */}
      <main className="flex-1 p-6 container max-w-5xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredExams.map((exam, idx) => {
              const displayName = exam.name || exam.id.replace(/-/g, " ");
              const gradient = gradients[idx % gradients.length];
              
              return (
                <Link href={`/exam/${exam.id}`} key={exam.id} className="block group h-full">
                  <Card className="h-full overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group-hover:border-primary/50">
                    <div className={cn("h-2 w-full bg-gradient-to-r", gradient)} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="bg-muted p-2 rounded-md group-hover:bg-primary/10 transition-colors">
                          <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                        </div>
                         {/* Placeholder for future tags/badges */}
                         {/* <Badge variant="outline" className="text-xs font-normal">Active</Badge> */}
                      </div>
                      <CardTitle className="mt-4 text-xl capitalize line-clamp-1">
                        {displayName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        Comprehensive resources including notes and PYQs.
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0 flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                      View Resources <ChevronRight className="ml-1 h-4 w-4" />
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="bg-muted p-4 rounded-full">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">No exams found</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                We couldn&apos;t find any exams matching &quot;{query}&quot;. Try searching for something else.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}