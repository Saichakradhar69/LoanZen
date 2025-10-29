'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Car, 
  Home, 
  CreditCard, 
  GraduationCap, 
  FileText,
  PiggyBank,
  Trash2,
  Pencil
} from 'lucide-react';
import type { Loan } from '@/app/dashboard/page';

interface LoanCardProps {
  loan: Loan;
  onEdit: () => void;
  onDelete: () => void;
}

const loanTypeIcons = {
  'personal': FileText,
  'car': Car,
  'student': GraduationCap,
  'mortgage': Home,
  'credit-card': CreditCard,
  'other': PiggyBank
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function LoanCard({ loan, onEdit, onDelete }: LoanCardProps) {
  const { 
    loanName, 
    loanType, 
    currentBalance, 
    interestRate, 
    monthlyPayment, 
    originalLoanAmount 
  } = loan;

  const IconComponent = loanTypeIcons[loanType as keyof typeof loanTypeIcons] || FileText;
  
  const isHighInterest = interestRate > 15;
  const progress = originalLoanAmount > 0 ? Math.round(((originalLoanAmount - currentBalance) / originalLoanAmount) * 100) : 0;
  
  const borderColorClass = isHighInterest ? 'border-red-500/50' : 'border-primary/50';

  return (
    <Card className={`bg-card hover:bg-secondary/50 transition-colors cursor-pointer border-l-4 ${borderColorClass}`} onClick={onEdit}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg bg-secondary`}>
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-bold">{loanName}</CardTitle>
                        <p className="text-xs text-muted-foreground capitalize">{loanType.replace('-', ' ')} Loan</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isHighInterest && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                            High Interest
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        aria-label="Edit loan"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        aria-label="Delete loan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-3">
                    <span>Balance</span>
                    <span>Interest Rate</span>
                    <span>Monthly Payment</span>
                </div>
                 <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
                    <span>{formatCurrency(currentBalance)}</span>
                    <span className={isHighInterest ? 'text-red-400' : ''}>{interestRate}%</span>
                    <span>{formatCurrency(monthlyPayment)}</span>
                </div>

                <div className="mt-3 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" indicatorClassName={isHighInterest ? 'bg-red-500' : 'bg-primary'}/>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
