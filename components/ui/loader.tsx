"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface LoadingStepProps {
  title: string;
  description?: string;
  status: "pending" | "loading" | "complete" | "error";
  current?: boolean;
  last?: boolean;
}

export function LoadingStep({
  title,
  description,
  status,
  current = false,
  last = false,
}: LoadingStepProps) {
  return (
    <div className="flex items-start">
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        {status === "pending" && (
          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
        )}
        {status === "loading" && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {status === "complete" && (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        )}
        {status === "error" && (
          <div className="h-4 w-4 rounded-full bg-destructive" />
        )}
        {!last && (
          <div
            className={cn(
              "absolute left-1/2 top-6 h-[calc(100%-theme(spacing.6))] w-px -translate-x-1/2 bg-border",
              status === "complete" && "bg-primary"
            )}
          />
        )}
      </div>
      <div className="ml-3 mb-8">
        <h3
          className={cn(
            "text-sm font-medium",
            status === "complete" && "text-primary",
            status === "loading" && "text-primary",
            status === "pending" && "text-muted-foreground"
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

interface MultiStepLoaderProps {
  steps: {
    title: string;
    description?: string;
  }[];
  currentStep: number;
  className?: string;
}

export function MultiStepLoader({
  steps,
  currentStep,
  className,
}: MultiStepLoaderProps) {
  // Calculate progress percentage
  const progress = Math.round((currentStep / (steps.length - 1)) * 100);
  
  return (
    <div className={cn("space-y-4", className)}>
      <Progress value={progress} className="h-2" />
      <div className="mt-6">
        {steps.map((step, index) => (
          <LoadingStep
            key={index}
            title={step.title}
            description={step.description}
            status={
              index < currentStep
                ? "complete"
                : index === currentStep
                ? "loading"
                : "pending"
            }
            current={index === currentStep}
            last={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

export function ContentLoader({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function FileContentLoader() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-[calc(100vh-12rem)] w-full" />
    </div>
  );
}