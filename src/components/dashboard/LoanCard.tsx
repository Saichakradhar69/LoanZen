
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
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Loan } from '@/app/dashboard/page';

interface LoanCardProps {
  loan: Loan;
}

const loanTypeIcons = {
  'personal': FileText,
  'car': Car,
  'student': GraduationCap,
  'mortgage': Home,
  'credit-card': CreditCard,
  'other': FileText
};

const loanTypeColors = {
  'personal': 'amber',
  'car': 'blue',
  'student': 'purple',
  'mortgage': 'green',
  'credit-card': 'red',
  'other': 'gray'
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function LoanCard({ loan }: LoanCardProps) {
  const { 
    id, 
    loanName, 
    loanType, 
    currentBalance, 
    interestRate, 
    monthlyPayment, 
    originalLoanAmount 
  } = loan;

  const IconComponent = loanTypeIcons[loanType as keyof typeof loanTypeIcons] || FileText;
  const color = loanTypeColors[loanType as keyof typeof loanTypeColors] || 'gray';
  
  const colorClasses = {
    amber: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20',
    blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
    purple: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
    green: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    red: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
    gray: 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20'
  };

  const iconColorClasses = {
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  const isHighInterest = interestRate > 15;
  const progress = originalLoanAmount > 0 ? ((originalLoanAmount - currentBalance) / originalLoanAmount) * 100 : 0;
  const isUrgent = progress < 20 && currentBalance > 10000;

  return (
    <Card className={`border-l-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${iconColorClasses[color as keyof typeof iconColorClasses]}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{loanName}</CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground capitalize">
                  {loanType.replace('-', ' ')} Loan
                </span>
                {isHighInterest && (
                  <Badge variant="destructive" className="text-xs">
                    High Interest
                  </Badge>
                )}
                {isUrgent && (
                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                    Priority
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit Loan
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Loan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="font-semibold text-lg">{formatCurrency(currentBalance)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Interest Rate</div>
              <div className={`font-semibold text-lg ${isHighInterest ? 'text-red-600' : ''}`}>
                {interestRate}%
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Payment</span>
              <span className="font-semibold">{formatCurrency(monthlyPayment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Original Amount</span>
              <span className="font-semibold">{formatCurrency(originalLoanAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
