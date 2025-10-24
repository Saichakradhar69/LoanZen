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
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
                <Button onClick={onAddLoan}>
                    <Plus className="mr-2 h-4 w-4" /> Add New Loan
                </Button>
                <Button variant="secondary" onClick={onRecordPayment}>
                    <Receipt className="mr-2 h-4 w-4" /> Record Payment
                </Button>
                 <Button variant="secondary">
                    <Download className="mr-2 h-4 w-4" /> Generate Report
                </Button>
                 <Button variant="secondary" asChild>
                    <Link href="/advisor">
                        <Bot className="mr-2 h-4 w-4" /> AI Assistant
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
