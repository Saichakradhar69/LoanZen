'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressChartProps {
  title: string;
  description: string;
  progress: number;
  total: number;
  color?: string;
}

export default function ProgressChart({ 
  title, 
  description, 
  progress, 
  total, 
  color = "blue" 
}: ProgressChartProps) {
  const percentage = Math.round((progress / total) * 100);
  
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    red: "bg-red-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">${progress.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">of ${total.toLocaleString()}</span>
          </div>
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{percentage}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
