'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function AiInsights() {
    return (
        <Card className="elevated">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    AI Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-xl">
                    <p className="font-semibold text-sm mb-1.5">Smart Suggestion</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Pay extra $50 on Car Loan to save $120 in interest.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
