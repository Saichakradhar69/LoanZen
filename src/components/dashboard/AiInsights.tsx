'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function AiInsights() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    AI Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="font-bold text-sm">Smart Suggestion</p>
                    <p className="text-xs text-muted-foreground">
                        Pay extra $50 on Car Loan to save $120 in interest.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
