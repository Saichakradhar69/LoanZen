'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Receipt, Download, Bot } from "lucide-react";
import Link from 'next/link';

interface QuickActionsProps {
    onAddLoan: () => void;
    onRecordPayment: () => void;
}

export default function QuickActions({ onAddLoan, onRecordPayment }: QuickActionsProps) {
    return (
        <Card className="elevated">
            <CardHeader>
                <CardTitle className="text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2.5">
                <Button onClick={onAddLoan} className="justify-start w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add New Loan
                </Button>
                <Button variant="secondary" onClick={onRecordPayment} className="justify-start w-full">
                    <Receipt className="mr-2 h-4 w-4" /> Record Payment
                </Button>
                 <Button variant="secondary" className="justify-start w-full">
                    <Download className="mr-2 h-4 w-4" /> Generate Report
                </Button>
                 <Button variant="secondary" asChild className="justify-start w-full">
                    <Link href="/advisor">
                        <Bot className="mr-2 h-4 w-4" /> AI Assistant
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
